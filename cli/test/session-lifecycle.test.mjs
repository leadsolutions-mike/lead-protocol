import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, realpathSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { closeSession, createCheckpoint, LifecycleError, openSession, parseActiveSessions } from "../dist/lib/session-lifecycle.js";

function fixture(newline = "\n", peer = true) {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), "lp-lifecycle-")));
  const agents = path.join(root, ".agents");
  mkdirSync(path.join(agents, "modules"), { recursive: true });
  mkdirSync(path.join(agents, "sessions"), { recursive: true });
  mkdirSync(path.join(agents, "checkpoints"), { recursive: true });
  writeFileSync(path.join(agents, "CORE_RULES.md"), "# Core\n");
  writeFileSync(path.join(agents, "PROJECT_RULES.md"), "# Project\n\n- **Active modules:** `git-substrate`\n");
  writeFileSync(path.join(agents, "modules", "git-substrate.md"), "# Git module\n");
  writeFileSync(path.join(agents, "AGENTS_MAP.md"), "| Tool signature | Agent slug |\n|---|---|\n| codex-cli | codex |\n");
  writeFileSync(path.join(agents, "decisions.jsonl"), "");
  const rows = peer ? ["| 2026-07-18-0700-claude  |[Claude]| 2026-07-18T07:00:00.000Z | Peer work | — |"] : [];
  writeFileSync(path.join(agents, "sessions", "active_sessions.md"), [
    "# active_sessions.md — Sessions currently live", "", "| Session ID | Agent | Started | Topic | Last checkpoint |",
    "|---|---|---|---|---|", ...rows, "---", "", "## Usage", "Keep this text byte-for-byte.", "",
  ].join(newline));
  cpSync(new URL("../../.agents/schemas", import.meta.url), path.join(agents, "schemas"), { recursive: true });
  return root;
}

async function inFixture(options, fn) {
  const root = fixture(options?.newline, options?.peer);
  const previous = process.cwd();
  process.chdir(root);
  try { await fn(root); } finally { process.chdir(previous); rmSync(root, { recursive: true, force: true }); }
}

test("open -> checkpoint -> close preserves peer state and emits verifiable receipts", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const openedAt = new Date("2026-07-18T08:00:00.000Z");
    const receipt = openSession({ actor: "marco", agent: "codex", signature: "[Codex / GPT-5]", topic: "Build Week", now: openedAt });
    assert.equal(receipt.sessionId, "2026-07-18-0800-codex");
    assert.deepEqual(receipt.files.map((f) => f.path), [
      ".agents/CORE_RULES.md", ".agents/PROJECT_RULES.md", ".agents/modules/git-substrate.md",
      ".agents/AGENTS_MAP.md", ".agents/sessions/active_sessions.md", ".agents/local/marco/codex/handoff.md",
    ]);
    for (const file of receipt.files) {
      const bytes = readFileSync(path.join(root, file.path));
      assert.equal(file.sha256, createHash("sha256").update(bytes).digest("hex"));
    }
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    let registry = readFileSync(registryPath, "utf8");
    const peerRow = "| 2026-07-18-0700-claude  |[Claude]| 2026-07-18T07:00:00.000Z | Peer work | — |";
    assert.equal(registry.split(/\r?\n/).includes(peerRow), true);
    assert.match(registry, /Keep this text byte-for-byte\./);
    const checkpoint = createCheckpoint({ actor: "marco", agent: "codex", title: "mvp-proof", body: "Evidence body", now: new Date("2026-07-18T08:01:02.000Z") });
    assert.equal(path.basename(checkpoint.checkpoint), "20260718T080102Z_codex_mvp-proof.md");
    registry = readFileSync(registryPath, "utf8");
    assert.match(registry, /20260718T080102Z_codex_mvp-proof\.md/);
    const closed = closeSession({ actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE", lastAction: "Verified lifecycle.", pendingStep: "None", confirmChecklist: true, now: new Date("2026-07-18T08:02:00.000Z") });
    assert.equal(closed.sessionId, receipt.sessionId);
    registry = readFileSync(registryPath, "utf8");
    assert.equal(registry.split(/\r?\n/).includes(peerRow), true);
    assert.doesNotMatch(registry, /2026-07-18-0800-codex/);
    const handoff = readFileSync(path.join(root, ".agents", "local", "marco", "codex", "handoff.md"), "utf8");
    assert.match(handoff, /\*\*Status:\*\* STABLE/);
    assert.equal((handoff.match(/^- \[x\]/gm) ?? []).length, 8);
  });
});

test("duplicate same-pair open fails safely without changing registry", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    openSession({ actor: "marco", agent: "codex", topic: "one", now: new Date("2026-07-18T08:00:00.000Z") });
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const before = readFileSync(registryPath, "utf8");
    assert.throws(() => openSession({ actor: "marco", agent: "codex", topic: "two", now: new Date("2026-07-18T08:03:00.000Z") }), LifecycleError);
    assert.equal(readFileSync(registryPath, "utf8"), before);
  });
});

test("registry parser rejects duplicate IDs", () => {
  const text = "| Session ID | Agent | Started | Topic | Last checkpoint |\n|---|---|---|---|---|\n| same | [A] | now | one | — |\n| same | [B] | now | two | — |\n";
  assert.throws(() => parseActiveSessions(text), /duplicate active session ID/);
});

test("CRLF registry remains CRLF after open", { concurrency: false }, async () => {
  await inFixture({ newline: "\r\n", peer: false }, (root) => {
    openSession({ actor: "marco", agent: "codex", topic: "crlf", now: new Date("2026-07-18T08:00:00.000Z") });
    const bytes = readFileSync(path.join(root, ".agents", "sessions", "active_sessions.md"), "utf8");
    assert.equal(bytes.replace(/\r\n/g, "").includes("\n"), false);
  });
});

test("significant close requires explicit JOURNAL confirmation", { concurrency: false }, async () => {
  await inFixture({}, () => {
    openSession({ actor: "marco", agent: "codex", topic: "journal", now: new Date("2026-07-18T08:00:00.000Z") });
    assert.throws(() => closeSession({ actor: "marco", agent: "codex", journal: "significant", status: "STABLE", lastAction: "Done", pendingStep: "None", confirmChecklist: true }), /journal-entry-confirmed/);
  });
});

test("malformed existing handoff blocks open without registering a session", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const pair = path.join(root, ".agents", "local", "marco", "codex");
    mkdirSync(pair, { recursive: true });
    writeFileSync(path.join(pair, "handoff.md"), "# malformed\n");
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const before = readFileSync(registryPath, "utf8");
    assert.throws(() => openSession({ actor: "marco", agent: "codex", topic: "unsafe" }), /Version\/Updated/);
    assert.equal(readFileSync(registryPath, "utf8"), before);
  });
});

test("malformed registry blocks open before pair state is created", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    writeFileSync(registryPath, "# malformed registry\n");
    assert.throws(() => openSession({ actor: "marco", agent: "codex", topic: "must reject" }), /malformed table header/);
    assert.equal(existsSync(path.join(root, ".agents", "local", "marco", "codex")), false);
  });
});

test("pristine Active modules rejection leaves no handoff or active-session row", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const projectRules = path.join(root, ".agents", "PROJECT_RULES.md");
    writeFileSync(projectRules, "# Project\n\n- **Active modules:** [comma-separated scopes]\n");
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const before = readFileSync(registryPath, "utf8");
    const pair = path.join(root, ".agents", "local", "marco", "codex");
    assert.throws(() => openSession({ actor: "marco", agent: "codex", topic: "reject pristine" }), /pristine Active modules placeholder/);
    assert.equal(readFileSync(registryPath, "utf8"), before);
    assert.equal(existsSync(path.join(pair, "handoff.md")), false);
  });
});

test("unsafe open metadata is rejected before creating pair state", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const before = readFileSync(registryPath, "utf8");
    assert.throws(() => openSession({ actor: "marco", agent: "codex", topic: "unsafe | topic" }), /unsafe markdown table characters/);
    assert.equal(readFileSync(registryPath, "utf8"), before);
    assert.equal(existsSync(path.join(root, ".agents", "local", "marco", "codex", "handoff.md")), false);
  });
});

test("interrupted open receipt write rolls back registry and newly created handoff", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const pair = path.join(root, ".agents", "local", "marco", "codex");
    const concurrentRow = "| receipt-time-peer | [Peer] | 2026-07-18T08:00:00.000Z | Concurrent | — |";
    assert.throws(() => openSession({
      actor: "marco", agent: "codex", topic: "interrupt open",
      faultInjector(point) {
        if (point === "before-open-receipt-write") {
          const current = readFileSync(registryPath, "utf8");
          writeFileSync(registryPath, current.replace("---\n\n## Usage", `${concurrentRow}\n---\n\n## Usage`));
          throw new Error("injected open interruption");
        }
      },
    }), /injected open interruption/);
    const registry = readFileSync(registryPath, "utf8");
    assert.match(registry, /receipt-time-peer/);
    assert.doesNotMatch(registry, /interrupt open/);
    assert.equal(existsSync(path.join(pair, "handoff.md")), false);
    assert.deepEqual(existsSync(path.join(pair, "receipts")) ? readdirSync(path.join(pair, "receipts")) : [], []);
  });
});

test("open detects a concurrent registry change without overwriting it", { concurrency: false }, async () => {
  await inFixture({ peer: false }, (root) => {
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const concurrentRow = "| concurrent-peer | [Peer] | 2026-07-18T08:00:00.000Z | Concurrent | — |";
    assert.throws(() => openSession({
      actor: "marco", agent: "codex", topic: "cas",
      faultInjector(point) {
        if (point === "before-open-registry-write") {
          const current = readFileSync(registryPath, "utf8");
          writeFileSync(registryPath, current.replace("---\n\n## Usage", `${concurrentRow}\n---\n\n## Usage`));
        }
      },
    }), /concurrent change detected/);
    assert.match(readFileSync(registryPath, "utf8"), /concurrent-peer/);
    assert.equal(existsSync(path.join(root, ".agents", "local", "marco", "codex", "handoff.md")), false);
  });
});

test("local transaction guard rejects a same-pair open during the post-registry gap", { concurrency: false }, async () => {
  await inFixture({ peer: false }, (root) => {
    let competingError;
    const winner = openSession({
      actor: "marco", agent: "codex", topic: "outer", now: new Date("2026-07-18T08:00:00.000Z"),
      faultInjector(point) {
        if (point === "before-open-receipt-write") {
          try { openSession({ actor: "marco", agent: "codex", topic: "competitor", now: new Date("2026-07-18T08:01:00.000Z") }); }
          catch (error) { competingError = error; }
        }
      },
    });
    assert.match(competingError.message, /local lifecycle mutation is in progress/);
    const registry = readFileSync(path.join(root, ".agents", "sessions", "active_sessions.md"), "utf8");
    assert.match(registry, /outer/);
    assert.doesNotMatch(registry, /competitor/);
    assert.equal(parseActiveSessions(registry).length, 1);
    assert.equal(existsSync(path.join(root, ".agents", "local", "marco", "codex", "receipts", `${winner.sessionId}-open.json`)), true);
    assert.match(readFileSync(path.join(root, ".agents", "local", "marco", "codex", "handoff.md"), "utf8"), new RegExp(winner.sessionId));
  });
});

test("unsafe dot actor and symbolic-link pair roots are rejected", { concurrency: false }, async (t) => {
  await inFixture({}, (root) => {
    assert.throws(() => openSession({ actor: "..", agent: "codex", topic: "escape" }), /unsafe path characters/);
    const local = path.join(root, ".agents", "local");
    const outside = mkdtempSync(path.join(os.tmpdir(), "lp-outside-"));
    mkdirSync(local, { recursive: true });
    try {
      try { symlinkSync(outside, path.join(local, "linked"), process.platform === "win32" ? "junction" : "dir"); }
      catch (error) {
        if (error.code === "EPERM" || error.code === "EACCES") { t.skip("symbolic links unavailable in this environment"); return; }
        throw error;
      }
      assert.throws(() => openSession({ actor: "linked", agent: "codex", topic: "escape" }), /symbolic link/);
    }
    finally { rmSync(outside, { recursive: true, force: true }); }
  });
});

test("symbolic-link receipt directories are rejected", { concurrency: false }, async (t) => {
  await inFixture({}, (root) => {
    openSession({ actor: "marco", agent: "codex", topic: "leaf symlink", now: new Date("2026-07-18T08:00:00.000Z") });
    const receipts = path.join(root, ".agents", "local", "marco", "codex", "receipts");
    const outside = mkdtempSync(path.join(os.tmpdir(), "lp-receipts-outside-"));
    rmSync(receipts, { recursive: true });
    try {
      try { symlinkSync(outside, receipts, process.platform === "win32" ? "junction" : "dir"); }
      catch (error) {
        if (error.code === "EPERM" || error.code === "EACCES") { t.skip("symbolic links unavailable in this environment"); return; }
        throw error;
      }
      assert.throws(() => createCheckpoint({ actor: "marco", agent: "codex", title: "escape", body: "body" }), /symbolic link/);
    }
    finally { rmSync(outside, { recursive: true, force: true }); }
  });
});

test("checkpoint CAS conflict preserves the concurrent row and removes the orphan checkpoint", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    openSession({ actor: "marco", agent: "codex", topic: "checkpoint rollback", now: new Date("2026-07-18T08:00:00.000Z") });
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const concurrentRow = "| concurrent-checkpoint-peer | [Peer] | 2026-07-18T08:01:00.000Z | Concurrent | — |";
    assert.throws(() => createCheckpoint({
      actor: "marco", agent: "codex", title: "orphan-proof", body: "body", now: new Date("2026-07-18T08:01:00.000Z"),
      faultInjector(point) {
        if (point === "before-checkpoint-registry-write") {
          const current = readFileSync(registryPath, "utf8");
          writeFileSync(registryPath, current.replace("---\n\n## Usage", `${concurrentRow}\n---\n\n## Usage`));
        }
      },
    }), /concurrent change detected/);
    assert.match(readFileSync(registryPath, "utf8"), /concurrent-checkpoint-peer/);
    assert.equal(existsSync(path.join(root, ".agents", "checkpoints", "20260718T080100Z_codex_orphan-proof.md")), false);
  });
});

test("receipt ownership mismatch cannot mutate another pair's session", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const opened = openSession({ actor: "marco", agent: "codex", topic: "ownership", now: new Date("2026-07-18T08:00:00.000Z") });
    const receiptPath = path.join(root, ".agents", "local", "marco", "codex", "receipts", `${opened.sessionId}-open.json`);
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.pair.actor = "another-actor";
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const before = readFileSync(registryPath, "utf8");
    assert.throws(() => createCheckpoint({ actor: "marco", agent: "codex", title: "must-reject", body: "body" }), /ownership mismatch/);
    assert.equal(readFileSync(registryPath, "utf8"), before);
    assert.equal(readdirSync(path.join(root, ".agents", "checkpoints")).length, 0);
  });
});

test("receipt filename, signature, and registry-row binding are enforced", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const opened = openSession({ actor: "marco", agent: "codex", topic: "receipt binding", now: new Date("2026-07-18T08:00:00.000Z") });
    const receipts = path.join(root, ".agents", "local", "marco", "codex", "receipts");
    const receiptPath = path.join(receipts, `${opened.sessionId}-open.json`);
    const original = readFileSync(receiptPath, "utf8");
    const wrongName = path.join(receipts, "wrong-open.json");
    writeFileSync(wrongName, original);
    rmSync(receiptPath);
    assert.throws(() => createCheckpoint({ actor: "marco", agent: "codex", title: "filename", body: "body" }), /filename mismatch/);
    rmSync(wrongName);
    writeFileSync(receiptPath, original);
    const tampered = JSON.parse(original);
    tampered.pair.signature = "[Codex] | forged";
    writeFileSync(receiptPath, `${JSON.stringify(tampered, null, 2)}\n`);
    assert.throws(() => createCheckpoint({ actor: "marco", agent: "codex", title: "signature", body: "body" }), /unsafe markdown table characters/);
    writeFileSync(receiptPath, original);
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    writeFileSync(registryPath, readFileSync(registryPath, "utf8").replace(opened.pair.signature, "[Other]"));
    assert.throws(() => createCheckpoint({ actor: "marco", agent: "codex", title: "row", body: "body" }), /signature mismatch/);
  });
});

test("invalid close fields are rejected before registry or handoff mutation", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    openSession({ actor: "marco", agent: "codex", topic: "close validation", now: new Date("2026-07-18T08:00:00.000Z") });
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const handoffPath = path.join(root, ".agents", "local", "marco", "codex", "handoff.md");
    const registryBefore = readFileSync(registryPath, "utf8");
    const handoffBefore = readFileSync(handoffPath, "utf8");
    assert.throws(() => closeSession({ actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE", lastAction: "unsafe | cell", pendingStep: "None", confirmChecklist: true }), /unsafe markdown table characters/);
    assert.equal(readFileSync(registryPath, "utf8"), registryBefore);
    assert.equal(readFileSync(handoffPath, "utf8"), handoffBefore);
  });
});

test("interrupted close rolls the registry back and emits no close receipt", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const opened = openSession({ actor: "marco", agent: "codex", topic: "rollback", now: new Date("2026-07-18T08:00:00.000Z") });
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const before = readFileSync(registryPath, "utf8");
    assert.throws(() => closeSession({
      actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE",
      lastAction: "Should not commit", pendingStep: "Retry", confirmChecklist: true,
      faultInjector(point) { if (point === "before-close-handoff-write") throw new Error("injected interruption"); },
    }), /injected interruption/);
    assert.equal(readFileSync(registryPath, "utf8"), before);
    assert.equal(parseActiveSessions(before).some((row) => row.sessionId === opened.sessionId), true);
    const closeReceipt = path.join(root, ".agents", "local", "marco", "codex", "receipts", `${opened.sessionId}-close.json`);
    assert.equal(existsSync(closeReceipt), false);
  });
});

test("interrupted close receipt write rolls back both handoff and registry", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const opened = openSession({ actor: "marco", agent: "codex", topic: "receipt rollback", now: new Date("2026-07-18T08:00:00.000Z") });
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const handoffPath = path.join(root, ".agents", "local", "marco", "codex", "handoff.md");
    const registryBefore = readFileSync(registryPath, "utf8");
    const handoffBefore = readFileSync(handoffPath, "utf8");
    const concurrentRow = "| close-time-peer | [Peer] | 2026-07-18T08:03:00.000Z | Concurrent | — |";
    assert.throws(() => closeSession({
      actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE", lastAction: "Should roll back", pendingStep: "Retry", confirmChecklist: true,
      faultInjector(point) {
        if (point === "before-close-receipt-write") {
          const current = readFileSync(registryPath, "utf8");
          writeFileSync(registryPath, current.replace("---\n\n## Usage", `${concurrentRow}\n---\n\n## Usage`));
          throw new Error("injected receipt interruption");
        }
      },
    }), /injected receipt interruption/);
    const registryAfter = readFileSync(registryPath, "utf8");
    assert.match(registryAfter, /close-time-peer/);
    assert.match(registryAfter, new RegExp(opened.sessionId));
    assert.match(registryBefore, new RegExp(opened.sessionId));
    assert.equal(readFileSync(handoffPath, "utf8"), handoffBefore);
    assert.equal(existsSync(path.join(root, ".agents", "local", "marco", "codex", "receipts", `${opened.sessionId}-close.json`)), false);
  });
});

test("close keeps ownership registered until its final CAS", { concurrency: false }, async () => {
  await inFixture({ peer: false }, (root) => {
    const opened = openSession({ actor: "marco", agent: "codex", topic: "closing", now: new Date("2026-07-18T08:00:00.000Z") });
    let competingError;
    closeSession({
      actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE", lastAction: "Done", pendingStep: "None", confirmChecklist: true,
      faultInjector(point) {
        if (point === "before-close-registry-write") {
          try { openSession({ actor: "marco", agent: "codex", topic: "must wait", now: new Date("2026-07-18T08:02:00.000Z") }); }
          catch (error) { competingError = error; }
        }
      },
    });
    assert.match(competingError.message, /local lifecycle mutation is in progress/);
    assert.equal(parseActiveSessions(readFileSync(path.join(root, ".agents", "sessions", "active_sessions.md"), "utf8")).some((row) => row.sessionId === opened.sessionId), false);
  });
});

test("close final CAS conflict restores handoff and receipt while preserving peer mutation", { concurrency: false }, async () => {
  await inFixture({}, (root) => {
    const opened = openSession({ actor: "marco", agent: "codex", topic: "close CAS", now: new Date("2026-07-18T08:00:00.000Z") });
    const registryPath = path.join(root, ".agents", "sessions", "active_sessions.md");
    const handoffPath = path.join(root, ".agents", "local", "marco", "codex", "handoff.md");
    const handoffBefore = readFileSync(handoffPath, "utf8");
    assert.throws(() => closeSession({
      actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE", lastAction: "Done", pendingStep: "None", confirmChecklist: true,
      faultInjector(point) {
        if (point === "before-close-registry-write") {
          const current = readFileSync(registryPath, "utf8");
          const row = "| late-peer | [Peer] | 2026-07-18T08:03:00.000Z | Concurrent | — |";
          writeFileSync(registryPath, current.replace("---\n\n## Usage", `${row}\n---\n\n## Usage`));
        }
      },
    }), /concurrent change detected/);
    const registry = readFileSync(registryPath, "utf8");
    assert.match(registry, /late-peer/);
    assert.match(registry, new RegExp(opened.sessionId));
    assert.equal(readFileSync(handoffPath, "utf8"), handoffBefore);
    assert.equal(existsSync(path.join(root, ".agents", "local", "marco", "codex", "receipts", `${opened.sessionId}-close.json`)), false);
  });
});

test("a second closed session in the same minute gets a deterministic suffix", { concurrency: false }, async () => {
  await inFixture({}, () => {
    const now = new Date("2026-07-18T08:00:00.000Z");
    const first = openSession({ actor: "marco", agent: "codex", topic: "first", now });
    closeSession({ actor: "marco", agent: "codex", journal: "not-significant", status: "STABLE", lastAction: "First done", pendingStep: "None", confirmChecklist: true, now });
    const second = openSession({ actor: "marco", agent: "codex", topic: "second", now });
    assert.equal(first.sessionId, "2026-07-18-0800-codex");
    assert.equal(second.sessionId, "2026-07-18-0800-codex-2");
  });
});

const evidence = { checks: [{ command: 'npm test', cwd: '/repo', result: 'passed' }, { command: 'npm run e2e', result: 'blocked', reason: 'No sandbox' }] };
const closeOptions = { actor: 'marco', agent: 'codex', journal: 'not-significant', status: 'STABLE', lastAction: 'Validated', pendingStep: 'Review', confirmChecklist: true };
function stateSnapshot(root) {
  return Object.fromEntries(readdirSync(path.join(root, '.agents'), { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => {
    const file = path.join(e.parentPath ?? e.path, e.name); return [file, readFileSync(file, 'utf8')];
  }));
}
test('checkpoint and close persist evidence with discoverable references, preserving the handoff shape', async () => {
  await inFixture({}, root => {
    const opened = openSession({ actor: 'marco', agent: 'codex', topic: 'Evidence' });
    const checkpoint = createCheckpoint({ actor: 'marco', agent: 'codex', title: 'evidence', body: 'Executed checks', evidence });
    const body = readFileSync(checkpoint.checkpoint, 'utf8');
    assert.match(body, /## Execution Evidence/);
    assert.deepEqual(JSON.parse(body.match(/```json\n([\s\S]*?)\n```/)[1]).execution_evidence, evidence);
    const closed = closeSession({ ...closeOptions, evidence });
    assert.deepEqual(closed.execution_evidence, evidence);
    assert.equal(closed.checkpoint, path.basename(checkpoint.checkpoint));
    const pair = path.join(root, '.agents/local/marco/codex');
    assert.deepEqual(JSON.parse(readFileSync(path.join(pair, 'receipts', `${opened.sessionId}-close.json`), 'utf8')), closed);
    const handoff = readFileSync(path.join(pair, 'handoff.md'), 'utf8');
    assert.match(handoff, new RegExp(path.basename(checkpoint.checkpoint)));
    assert.match(handoff, new RegExp(`${opened.sessionId}-close.json`));
    assert.equal((handoff.match(/^- \[x\]/gm) ?? []).length, 8);
    assert.doesNotMatch(handoff, /## Execution Evidence/);
  });
});

test('invalid option, embedded JSON, duplicate evidence and broken schema fail before any state mutation', async () => {
  await inFixture({}, root => {
    openSession({ actor: 'marco', agent: 'codex', topic: 'Reject evidence' });
    const checkpoint = { actor: 'marco', agent: 'codex', title: 'reject', body: 'Body' };
    for (const invalid of [null, { checks: [{ command: 'test', result: 'blocked', reason: ' ' }] }, { browser_validation: { performed: false, result: 'passed' } }, { typo: 1 }]) {
      const before = stateSnapshot(root);
      assert.throws(() => createCheckpoint({ ...checkpoint, evidence: invalid }), /evidence/i);
      assert.throws(() => closeSession({ ...closeOptions, evidence: invalid }), /evidence/i);
      assert.deepEqual(stateSnapshot(root), before);
    }
    for (const body of ['## Execution Evidence\n\n```json\n{oops}\n```', '## Execution Evidence\nmissing JSON']) {
      const before = stateSnapshot(root);
      assert.throws(() => createCheckpoint({ ...checkpoint, body }), /evidence/i);
      assert.deepEqual(stateSnapshot(root), before);
    }
    const body = '## Execution Evidence\n\n```json\n{"execution_evidence":{}}\n```';
    assert.throws(() => createCheckpoint({ ...checkpoint, body, evidence }), /evidence/i);
    const schema = path.join(root, '.agents/schemas/execution-evidence.schema.json');
    for (const invalid of ['{broken', '{"type":"invalid-schema-type"}']) {
      writeFileSync(schema, invalid);
      const before = stateSnapshot(root);
      assert.throws(() => createCheckpoint({ ...checkpoint, evidence }), /evidence/i);
      assert.throws(() => closeSession({ ...closeOptions, evidence }), /evidence/i);
      assert.deepEqual(stateSnapshot(root), before);
    }
  });
});

test('legacy omission preserves exact checkpoint and receipt shapes without needing evidence schema', async () => {
  await inFixture({}, root => {
    rmSync(path.join(root, '.agents/schemas/execution-evidence.schema.json'));
    const now = new Date('2026-07-18T08:00:00.000Z');
    const opened = openSession({ actor: 'marco', agent: 'codex', topic: 'Legacy', now });
    const checkpoint = createCheckpoint({ actor: 'marco', agent: 'codex', title: 'legacy', body: ' Body ', now });
    assert.equal(readFileSync(checkpoint.checkpoint, 'utf8'), `# Checkpoint — legacy\n\n> Timestamp: ${now.toISOString()}\n> Agent: ${opened.pair.signature}\n> Actor: marco\n> Session: \`${opened.sessionId}\`\n\nBody\n`);
    assert.deepEqual(closeSession({ ...closeOptions, now }), { schemaVersion: 1, operation: 'session.close', timestamp: now.toISOString(), pair: opened.pair, sessionId: opened.sessionId, journal: 'not-significant', validation: { handoff: 'passed', decisions: 'passed', checklist: 'passed' } });
  });
});

for (const newline of ['\n', '\r\n']) {
  test(`legacy fenced body preserves exact checkpoint bytes without a schema (${JSON.stringify(newline)})`, async () => {
    await inFixture({}, root => {
      rmSync(path.join(root, '.agents/schemas/execution-evidence.schema.json'));
      const now = new Date('2026-07-18T08:00:00.000Z');
      const opened = openSession({ actor: 'marco', agent: 'codex', topic: 'Legacy fences', now });
      const body = ['Legacy  body', '', '````markdown', '## Execution Evidence', '```json', '{"execution_evidence":{}}', '```', '````', '', '~~~', '## Execution Evidence', 'placeholder', '~~~'].join(newline);
      const checkpoint = createCheckpoint({ actor: 'marco', agent: 'codex', title: 'legacy-fences', body, now });
      assert.equal(readFileSync(checkpoint.checkpoint, 'utf8'), `# Checkpoint — legacy-fences\n\n> Timestamp: ${now.toISOString()}\n> Agent: ${opened.pair.signature}\n> Actor: marco\n> Session: \`${opened.sessionId}\`\n\n${body}\n`);
    });
  });
}

for (const [label, body] of [
  ['open-backtick', '````markdown\nlegacy'],
  ['open-tilde', '~~~~markdown\nlegacy'],
  ['trim-backtick', '    ````markdown\nlegacy'],
  ['trim-tilde', '\t~~~~markdown\nlegacy'],
  ['trim-duplicate', '   ## Execution Evidence\n\n```json\n{"execution_evidence":{}}\n```'],
]) {
  test(`explicit composition refuses ${label} before mutation; omission preserves legacy bytes`, async () => {
    const { parseEvidenceMarkdown } = await import('../dist/lib/execution-evidence.js');
    await inFixture({}, root => {
      const opened = openSession({ actor: 'marco', agent: 'codex', topic: 'Composition' });
      const opts = { actor: 'marco', agent: 'codex', title: label, body, now: new Date('2026-09-12T09:15:00Z') };
      const before = stateSnapshot(root);
      let failure;
      try {
        const written = createCheckpoint({ ...opts, evidence });
        let parsed;
        try { parsed = parseEvidenceMarkdown(readFileSync(written.checkpoint, 'utf8'), path.join(root, '.agents/schemas')); }
        catch (error) { parsed = error.message; }
        console.log('UNSAFE WRITER SUCCESS', label, 'parsed:', parsed);
      } catch (error) { failure = error; }
      assert.ok(failure, 'writer must refuse unsafe explicit evidence composition');
      assert.match(failure.message, /evidence/i);
      assert.deepEqual(stateSnapshot(root), before);
      const legacy = createCheckpoint(opts);
      assert.equal(readFileSync(legacy.checkpoint, 'utf8'), `# Checkpoint — ${label}\n\n> Timestamp: ${opts.now.toISOString()}\n> Agent: ${opened.pair.signature}\n> Actor: marco\n> Session: \`${opened.sessionId}\`\n\n${body.trim()}\n`);
    });
  });
}
