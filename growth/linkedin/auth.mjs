#!/usr/bin/env node
// One-time (then every ~60 days) LinkedIn sign-in for the autopilot.
// Gets a token with openid, profile and w_member_social, finds your member URN,
// and stores both as GitHub secrets with the gh CLI.
//
// Usage (from the repo root, gh logged in):
//   set LINKEDIN_CLIENT_ID=...  &  set LINKEDIN_CLIENT_SECRET=...
//   node growth/linkedin/auth.mjs
//
// In the LinkedIn developer app, add the products "Share on LinkedIn" and
// "Sign In with LinkedIn using OpenID Connect", and the redirect URL
// http://localhost:8765/callback

import http from "node:http";
import { execSync, exec } from "node:child_process";
import crypto from "node:crypto";

const { LINKEDIN_CLIENT_ID: id, LINKEDIN_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) { console.error("Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET first."); process.exit(1); }
const redirect = "http://localhost:8765/callback";
const state = crypto.randomBytes(12).toString("hex");
const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${id}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${encodeURIComponent("openid profile w_member_social")}`;

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, redirect);
  if (u.pathname !== "/callback") return res.end();
  if (u.searchParams.get("state") !== state) { res.end("State mismatch."); return; }
  const tok = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code: u.searchParams.get("code"), redirect_uri: redirect, client_id: id, client_secret: secret }),
  }).then((r) => r.json());
  if (!tok.access_token) { res.end("Token exchange failed: " + JSON.stringify(tok)); process.exit(1); }
  const me = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json());
  const urn = `urn:li:person:${me.sub}`;
  const today = new Date().toISOString().slice(0, 10);
  execSync(`gh secret set LINKEDIN_ACCESS_TOKEN`, { input: tok.access_token });
  execSync(`gh secret set LINKEDIN_PERSON_URN`, { input: urn });
  execSync(`gh variable set LINKEDIN_TOKEN_ISSUED --body ${today}`);
  res.end(`Done. Signed in as ${me.name}. Token valid for ${Math.round(tok.expires_in / 86400)} days. You can close this tab.`);
  console.log(`Saved token for ${me.name} (${urn}), issued ${today}.`);
  server.close();
});
server.listen(8765, () => {
  console.log("Opening LinkedIn sign-in...\n" + url);
  const open = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  exec(open);
});
