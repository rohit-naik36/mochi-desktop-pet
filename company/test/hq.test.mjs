import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { fakeGh } from "./helpers.mjs";
import { validateArgs, resolveHqRepo, run } from "../scripts/hq.mjs";

const HQ = "rohit-naik36/little-smoke-hq";
const CODE = "rohit-naik36/mochi-desktop-pet";
const cfg = { hq: { repo: HQ }, codeRepo: CODE };

describe("hq.mjs argument rules", () => {
  for (const args of [["api", "repos/x"], ["repo", "delete", "x"], ["issue", "delete", "1"], ["issue", "transfer", "1", "x/y"],
                      ["secret", "set", "X"], ["pr", "merge", "1"], ["issue"], []]) {
    test(`refuses ${JSON.stringify(args)}`, () => assert.throws(() => validateArgs(args)));
  }
  for (const flag of [["--repo", CODE], ["-R", CODE], [`--repo=${CODE}`], [`-R${CODE}`]]) {
    test(`refuses repo override ${flag[0]}`, () => assert.throws(() => validateArgs(["issue", "create", "--title", "x", ...flag])));
  }
  test("allows issue create", () => assert.doesNotThrow(() => validateArgs(["issue", "create", "--title", "Daily brief", "--body-file", "b.md"])));
});

describe("hq.mjs repository rules", () => {
  test("refuses an HQ_REPO that differs from config", () => assert.throws(() => resolveHqRepo({ HQ_REPO: "rohit-naik36/other" }, cfg)));
  test("refuses the public code repo as HQ", () => assert.throws(() => resolveHqRepo({ HQ_REPO: CODE }, { hq: { repo: CODE }, codeRepo: CODE })));
  test("refuses malformed repo names", () => assert.throws(() => resolveHqRepo({ HQ_REPO: "../etc" }, { hq: {} })));
  test("accepts the configured private HQ", () => assert.equal(resolveHqRepo({}, cfg), HQ));
});

describe("hq.mjs with mocked gh", () => {
  let gh;
  beforeEach(() => { gh = fakeGh(); });
  test("refuses to write when the HQ repo is public", () => {
    gh.reset([{ args: ["repo", "view", HQ], stdout: { visibility: "PUBLIC", isPrivate: false } }]);
    assert.throws(() => run(["issue", "create", "--title", "brief"], { HQ_GH_TOKEN: "hq-token" }), /not private/);
    assert.equal(gh.calls().filter((c) => c.args[0] === "issue").length, 0);
  });
  test("refuses without the HQ-only token (never falls back to the code token)", () => {
    assert.throws(() => run(["issue", "list"], { COMPANY_GH_TOKEN: "code-token" }), /HQ_GH_TOKEN/);
    assert.equal(gh.calls().length, 0);
  });
  test("writes to the private HQ with the HQ token", () => {
    gh.reset([{ args: ["repo", "view", HQ], stdout: { visibility: "PRIVATE", isPrivate: true } }]);
    run(["issue", "create", "--title", "Daily brief"], { HQ_GH_TOKEN: "hq-token" });
    const create = gh.calls().find((c) => c.args[0] === "issue");
    assert.deepEqual(create.args.slice(-2), ["--repo", HQ]);
    assert.equal(create.token, "hq-token");
  });
});
