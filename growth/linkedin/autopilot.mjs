#!/usr/bin/env node
// Mochi LinkedIn autopilot.
// Scans what shipped, picks the single most post-worthy item (or nothing),
// writes a post in Rohit's voice, runs it through an AI critic and hard gates,
// then publishes to LinkedIn and records it in the ledger.
//
// Env:
//   CLAUDE_CODE_OAUTH_TOKEN  your Claude subscription token (claude setup-token)
//   ANTHROPIC_API_KEY        optional fallback if no subscription token
//   LINKEDIN_ACCESS_TOKEN    required to publish
//   LINKEDIN_PERSON_URN      urn:li:person:xxxx
//   LINKEDIN_TOKEN_ISSUED    YYYY-MM-DD the token was created (repo variable)
//   AUTOPILOT_MODE           "live" publishes; anything else is a dry run
//   LEDGER_PATH              path to ledger.json (default growth/linkedin/ledger.json)
//   FORCE_RELEASE            a tag like v0.13.0 to consider first (release event)

import { execSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HERE = path.join(ROOT, "growth/linkedin");
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const voice = fs.readFileSync(path.join(HERE, "voice.md"), "utf8");
const LEDGER = process.env.LEDGER_PATH || path.join(HERE, "ledger.json");
const LIVE = process.env.AUTOPILOT_MODE === "live";
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.floor((b - a) / 86400000);
const sh = (c) => execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const out = (k, v) => process.env.GITHUB_OUTPUT && fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<EOF\n${v}\nEOF\n`);
const summary = (s) => process.env.GITHUB_STEP_SUMMARY ? fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n") : console.log(s);

function loadLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER, "utf8")); }
  catch { return { lastScan: null, posts: [], skips: [] }; }
}
function saveLedger(l) {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2) + "\n");
}
function stop(reason, ledger) {
  summary(`### LinkedIn autopilot: no post\n${reason}`);
  if (ledger) { ledger.skips = [...(ledger.skips || []).slice(-50), { date: iso(today), reason }]; saveLedger(ledger); }
  out("status", "skipped");
  process.exit(0);
}

// ---------- 1. Guards: token age and cadence ----------
const ledger = loadLedger();
const issued = process.env.LINKEDIN_TOKEN_ISSUED ? new Date(process.env.LINKEDIN_TOKEN_ISSUED) : null;
if (issued) {
  const age = daysBetween(issued, today);
  out("token_age", String(age));
  if (age >= 59) stop(`LinkedIn token is ${age} days old and about to expire. Run growth/linkedin/auth.mjs to renew.`);
}
const published = ledger.posts.filter((p) => p.status === "published");
const last = published.at(-1);
if (last && daysBetween(new Date(last.date), today) < cfg.cadence.minDaysBetweenPosts) stop("Too soon after the last post.");
const weekAgo = new Date(today - 7 * 86400000);
if (published.filter((p) => new Date(p.date) > weekAgo).length >= cfg.cadence.maxPostsPerWeek) stop("Weekly post limit reached.");

// ---------- 2. Collect signals (public, shipped material only) ----------
const since = ledger.lastScan || iso(new Date(today - cfg.cadence.lookbackDaysFirstRun * 86400000));
const raw = sh(`git log --since=${since} --no-merges --date=short --pretty=format:%H%x1f%ad%x1f%s%x1f%b%x1e`);
const commits = raw.split("\x1e").map((r) => r.trim()).filter(Boolean).map((r) => {
  const [sha, date, subject, body] = r.split("\x1f");
  const m = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.*)$/);
  return { sha, date, subject, body: (body || "").slice(0, 600), type: m?.[1] || "other", scope: m?.[2] || "general", title: m?.[3] || subject };
}).filter((c) => !cfg.ignoreTypes.includes(c.type));

const releaseTags = sh("git tag --list 'v*' --sort=-creatordate").split("\n").filter((t) => /^v\d/.test(t));
const isShipped = (sha) => { try { return sh(`git tag --contains ${sha} --list 'v*'`).length > 0; } catch { return false; } };

const recentTopics = new Set(ledger.posts
  .filter((p) => p.status === "published" && daysBetween(new Date(p.date), today) < cfg.cadence.noRepeatTopicDays)
  .map((p) => p.topic));

const candidates = [];
// Releases since last scan (or a forced one from a release event)
const changelog = (() => {
  try { return fs.readFileSync(path.join(ROOT, "docs/changelog.html"), "utf8").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "); }
  catch { return ""; }
})();
// Only the newest release in the window is news; older ones are history.
const releaseCandidates = process.env.FORCE_RELEASE ? [process.env.FORCE_RELEASE] : releaseTags.filter((t) => {
  try { return sh(`git log -1 --format=%cs ${t}^{commit}`) >= since; } catch { return false; }
}).slice(0, 1);
for (const tag of releaseCandidates) {
  const v = tag.replace(/^v/, "");
  const i = changelog.indexOf(v);
  const notes = i >= 0 ? changelog.slice(i, i + 2000) : "";
  let ghNotes = "";
  try { ghNotes = sh(`gh release view ${tag} --json body -q .body`).slice(0, 2000); } catch {}
  candidates.push({ id: `release:${tag}`, topic: `release:${tag}`, kind: "release", shipped: true, source: `Release ${tag}\n${ghNotes}\n${notes}` });
}
// Feature groups by scope
const byScope = {};
for (const c of commits) (byScope[c.scope] ||= []).push(c);
for (const [scope, all] of Object.entries(byScope)) {
  const open = cfg.buildInPublicScopes.includes(scope);
  const list = open ? all : all.filter((c) => isShipped(c.sha));
  if (!list.length) continue;
  const shipped = list.every((c) => isShipped(c.sha));
  if (scope === "teams" && !cfg.teamsIsPublic) continue;
  candidates.push({
    id: `scope:${scope}:${list[0].sha.slice(0, 7)}`, topic: `scope:${scope}`, kind: "feature", shipped,
    source: list.slice(0, 15).map((c) => `- ${c.type}(${scope}): ${c.title}${c.body ? "\n  " + c.body.replace(/\n/g, " ").slice(0, 300) : ""}`).join("\n"),
  });
}
// Evergreen fallback: the "why" pillar, from README, at most once every 3 weeks
if (!recentTopics.has("evergreen:why")) {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8").slice(0, 6000);
  candidates.push({ id: "evergreen:why", topic: "evergreen:why", kind: "evergreen", shipped: true, source: readme });
}
const fresh = candidates.filter((c) => !recentTopics.has(c.topic));
summary(`#### Candidates since ${since}\n${fresh.map((c) => `- ${c.id}${c.shipped ? "" : " (unreleased)"}`).join("\n") || "none"}`);
if (LIVE) ledger.lastScan = iso(today); // dry runs never move the scan window
if (!fresh.length) stop("Nothing new and post-worthy since the last scan.", ledger);

// ---------- 3. LLM helpers ----------
// Uses your Claude subscription through the Claude Code CLI (CLAUDE_CODE_OAUTH_TOKEN).
// Falls back to the API only if ANTHROPIC_API_KEY is set and no subscription token is.
async function llm(system, user, maxTokens = 1500) {
  if (process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) throw new Error(`LLM ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return j.content.map((b) => b.text || "").join("");
  }
  // No tools, one turn: the model only reads the prompt and writes text.
  const raw = execFileSync("claude", [
    "-p", "--output-format", "json", "--max-turns", "1",
    "--model", cfg.cliModel || "sonnet",
    "--system-prompt", system,
    "--disallowedTools", "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,NotebookEdit",
  ], { input: user, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 300000 });
  const res = JSON.parse(raw);
  if (res.is_error) throw new Error(`Claude CLI error: ${res.result || raw.slice(0, 500)}`);
  return res.result;
}
const json = (s) => JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1));

const mix = Object.fromEntries(Object.keys(cfg.pillars).map((k) => [k, published.slice(-10).filter((p) => p.pillar === k).length]));

// ---------- 4. Select: is anything worth posting? ----------
const selection = json(await llm(
  "You are the editorial lead for an indie Windows app's founder-led LinkedIn. You protect the founder's reputation: you would rather post nothing than post filler. Reply with JSON only.",
  `Pillars and target share: ${JSON.stringify(cfg.pillars)}
Teams edition public: ${cfg.teamsIsPublic}
Pillar counts in the last 10 posts: ${JSON.stringify(mix)}
Recent post topics (do not repeat): ${JSON.stringify([...recentTopics])}

Candidates:
${fresh.map((c) => `### ${c.id} (${c.kind}, shipped=${c.shipped})\n${c.source.slice(0, 3000)}`).join("\n\n")}

Score each candidate 0-10 on: user_impact (does a real person's day change), novelty (new to the reader, not a tweak), proof (concrete, showable, specific), story (is there a decision, tension or trade-off to tell), fit (pillar under-served). Bug-fix-only or internal tooling items score low on user_impact.
Pick the single best one only if its total is genuinely strong.
Return: {"choice": "<id or null>", "pillar": "ship|build|why|teams", "audience": "...", "angle": "one sentence: the specific insight the post will deliver", "scores": {...}, "total": <0-50>, "reason": "..."}`
));
summary(`#### Selection\n\`\`\`json\n${JSON.stringify(selection, null, 2)}\n\`\`\``);
const pick = fresh.find((c) => c.id === selection.choice);
if (!pick || selection.total < cfg.gates.minSelectScore) stop(`Best candidate scored ${selection.total ?? "n/a"} (< ${cfg.gates.minSelectScore}). ${selection.reason || ""}`, ledger);

// ---------- 5. Write, critique, gate ----------
const sourceText = `${pick.source}\n${JSON.stringify(cfg.metrics.facts)}`;
const facts = `Source material (the ONLY facts you may use):\n${pick.source.slice(0, 5000)}\nApproved metrics: ${JSON.stringify(cfg.metrics.facts)}\nLink to use: ${cfg.defaultLink}`;

function hardGates(text) {
  const v = [];
  const g = cfg.gates;
  if (text.length < g.minChars || text.length > g.maxChars) v.push(`length ${text.length}`);
  for (const t of cfg.bannedTerms) if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) v.push(`banned term: ${t}`);
  if ((text.match(/#\w+/g) || []).length > g.maxHashtags) v.push("too many hashtags");
  if ((text.match(/\p{Extended_Pictographic}/gu) || []).length > g.maxEmoji) v.push("too many emoji");
  for (const u of text.match(/https?:\/\/[^\s)]+/g) || []) if (!cfg.allowedLinks.some((a) => u.includes(a))) v.push(`link not allowed: ${u}`);
  if (/(sk-|ghp_|AKIA|AQV)[A-Za-z0-9]{8,}/.test(text) || /[\w.+-]+@[\w-]+\.\w+/.test(text)) v.push("secret or email-like string");
  for (const n of text.match(/\b\d+(?:[.,]\d+)*\b/g) || []) if (!sourceText.includes(n) && !["1", "2", "3"].includes(n)) v.push(`number not in source: ${n}`);
  return v;
}

let draft = null, critic = null, violations = [];
for (let attempt = 0; attempt < 2; attempt++) {
  const feedback = attempt ? `\nYour previous draft was rejected. Fix these and rewrite:\n${JSON.stringify({ violations, critic })}\nPrevious draft:\n${draft}` : "";
  draft = (await llm(
    `You write LinkedIn posts as Rohit, following this voice guide exactly:\n${voice}\nOutput the post text only.`,
    `${facts}\nPillar: ${selection.pillar}\nAudience: ${selection.audience}\nAngle: ${selection.angle}${feedback}`
  )).trim();
  critic = json(await llm(
    "You are a demanding LinkedIn editor and fact-checker. Reply with JSON only.",
    `${facts}\n\nVoice guide:\n${voice}\n\nDraft:\n${draft}\n\nScore 1-10: hook, specificity, reader_value (useful even to someone who never installs Mochi), voice_match, accuracy (every claim supported by the source). List every unsupported claim or rule break in "problems". Return {"scores":{...},"overall":<1-10, the minimum of the scores>,"problems":[...]}`
  ));
  violations = hardGates(draft);
  if (!violations.length && critic.overall >= cfg.gates.minCriticScore && !critic.problems?.length) break;
}
summary(`#### Draft\n${draft}\n\n#### Critic\n\`\`\`json\n${JSON.stringify(critic, null, 2)}\n\`\`\`\nHard-gate violations: ${violations.join("; ") || "none"}`);
if (violations.length || critic.overall < cfg.gates.minCriticScore || critic.problems?.length) {
  stop(`Draft failed quality gates after a rewrite: ${[...violations, ...(critic.problems || [])].join("; ")}`, ledger);
}

// ---------- 6. Publish ----------
// LinkedIn "little text" format: reserved characters must be escaped; hashtags use a template.
const littleText = (t) => t
  .replace(/[\\|{}@\[\]()<>*_~]/g, (c) => "\\" + c)
  .replace(/#(\w+)/g, (_, tag) => `{hashtag|\\#|${tag}}`);

const LI = "https://api.linkedin.com/rest";
const liHeaders = {
  Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
  "LinkedIn-Version": cfg.linkedinVersion,
  "X-Restli-Protocol-Version": "2.0.0",
  "Content-Type": "application/json",
};

async function uploadImage() {
  const rel = cfg.images.byScope[pick.topic.split(":")[1]] || cfg.images.default;
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  let file = p;
  if (fs.statSync(p).isDirectory()) {
    const shots = fs.readdirSync(p).filter((f) => /^\d+-.*\.(png|jpe?g)$/i.test(f)).map((f) => path.join(p, f));
    file = shots[ledger.posts.length % Math.max(1, shots.length)];
  }
  if (!file) return null;
  const init = await fetch(`${LI}/images?action=initializeUpload`, {
    method: "POST", headers: liHeaders,
    body: JSON.stringify({ initializeUploadRequest: { owner: process.env.LINKEDIN_PERSON_URN } }),
  });
  if (!init.ok) { console.warn("image init failed", init.status, await init.text()); return null; }
  const { value } = await init.json();
  const put = await fetch(value.uploadUrl, { method: "PUT", headers: { Authorization: liHeaders.Authorization }, body: fs.readFileSync(file) });
  if (!put.ok) { console.warn("image upload failed", put.status); return null; }
  return value.image;
}

const entry = { date: iso(today), topic: pick.topic, candidate: pick.id, pillar: selection.pillar, score: selection.total, critic: critic.overall, text: draft };

if (!LIVE) {
  ledger.posts.push({ ...entry, status: "dry-run" });
  saveLedger(ledger);
  out("status", "dry-run"); out("draft", draft);
  summary("Dry run: nothing was published. Set the AUTOPILOT_MODE variable to `live` to publish.");
  process.exit(0);
}

const image = await uploadImage();
const body = {
  author: process.env.LINKEDIN_PERSON_URN,
  commentary: littleText(draft),
  visibility: "PUBLIC",
  distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
  lifecycleState: "PUBLISHED",
  isReshareDisabledByAuthor: false,
  ...(image ? { content: { media: { id: image, altText: "Mochi, a small puff of black smoke with glowing eyes, on a Windows desktop" } } } : {}),
};
const res = await fetch(`${LI}/posts`, { method: "POST", headers: liHeaders, body: JSON.stringify(body) });
if (!res.ok) {
  const err = `${res.status} ${await res.text()}`;
  ledger.posts.push({ ...entry, status: "failed", error: err });
  saveLedger(ledger);
  out("status", "failed"); out("error", err);
  console.error("LinkedIn publish failed:", err);
  process.exit(1);
}
const urn = res.headers.get("x-restli-id");
ledger.posts.push({ ...entry, status: "published", urn, url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null });
saveLedger(ledger);
out("status", "published"); out("url", urn ? `https://www.linkedin.com/feed/update/${urn}/` : "");
summary(`Published: ${urn}`);
