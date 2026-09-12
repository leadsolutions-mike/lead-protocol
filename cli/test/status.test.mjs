import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const bin = path.resolve(testDir, "..", "dist", "index.js");
const manifest = { manifest_version: 1, product_version: "7.8.9", kernel_version: "2.0.1" };
const decision = { timestamp: "2026-06-01T12:00:00", agent: "[Fixture]", decision: "Preserve this decision", status: "completed" };

function fixture(manifestText, header, eol) {
  const root = mkdtempSync(path.join(os.tmpdir(), "lp-status-"));
  const agents = path.join(root, ".agents");
  const write = (file, text) => writeFileSync(path.join(agents, file), text.replace(/\n/g, eol));
  mkdirSync(path.join(agents, "sessions"), { recursive: true });
  mkdirSync(path.join(agents, "local", "fixture", "codex"), { recursive: true });
  write("CORE_RULES.md", "> Version: 1.5.0 | Protocol: Lead Protocol v2.0.0\n");
  if (header !== null) write("PROTOCOL_RULES.md", header);
  write("PROJECT_RULES.md", "# PROJECT_RULES.md — Status fixture\n\n- **Name:** Status fixture\n");
  write("decisions.jsonl", `${JSON.stringify(decision)}\n`);
  write(path.join("local", "fixture", "codex", "handoff.md"), "Unparseable handoff\n");
  write(path.join("sessions", "active_sessions.md"), "| Session ID | Agent | Started | Topic | Last checkpoint |\n|---|---|---|---|---|\n| fixture-session | codex | 2026-06-01 | Status | — |\n");
  if (manifestText !== null) write("manifest.json", manifestText);
  return root;
}

function status(root, ...args) {
  const output = execFileSync(process.execPath, [bin, "status", ...args], {
    cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
  });
  assert.doesNotMatch(output, /\x1b/, "no ANSI escapes in no-color output");
  return output.replace(/\r\n/g, "\n");
}

const manifests = [
  ["valid", JSON.stringify(manifest), "7.8.9"],
  ["absent", null, "unknown"],
  ["malformed JSON", "{ invalid", "unknown"],
  ["invalid schema version", JSON.stringify({ ...manifest, manifest_version: 2 }), "unknown"],
  ["missing field", JSON.stringify({ manifest_version: 1, product_version: "7.8.9" }), "unknown"],
  ["invalid field type", JSON.stringify({ ...manifest, product_version: 789 }), "unknown"],
  ["invalid product semver", JSON.stringify({ ...manifest, product_version: "7.8" }), "unknown"],
  ["invalid kernel semver", JSON.stringify({ ...manifest, kernel_version: "invalid" }), "unknown"],
];
const headers = [
  ["matching header", "> Version: 2.0.1 | Updated: 2026-06-01\n", "2.0.1"],
  ["divergent header", "> Version: 3.4.5 | Updated: 2026-06-01\n", "3.4.5"],
  ["absent header", null, null],
  ["invalid header", "> Version: invalid | Updated: 2026-06-01\n", null],
];

for (const [manifestName, manifestText, productVersion] of manifests) {
  for (const [headerName, header, explicitKernel] of headers) {
    for (const eol of ["\n", "\r\n"]) {
      test(`status: ${manifestName}, ${headerName}, ${eol === "\n" ? "LF" : "CRLF"}`, () => {
        const root = fixture(manifestText, header, eol);
        const kernelVersion = explicitKernel ?? (manifestName === "valid" ? "2.0.1" : "unknown");
        try {
          assert.deepEqual(JSON.parse(status(root, "--json")), {
            project: "Status fixture",
            productVersion,
            kernelVersion,
            protocolVersion: kernelVersion,
            activeSessions: 1,
            pairs: [{ actor: "fixture", agent: "codex", parseError: true }],
            recentDecisions: [decision],
          });
          const human = status(root);
          const lines = human.split("\n");
          const first = lines.findIndex((line) => line.trim() !== "");
          assert.equal(lines[first], `Lead Protocol ${productVersion} — Status fixture`);
          assert.equal(lines[first + 1], `  Kernel: ${kernelVersion} (technical detail)`);
          assert.doesNotMatch(human, /Product Version|Kernel Version|Protocol Version|1\.5\.0/);
          assert.match(human, /fixture\/codex — could not parse handoff/);
          assert.match(human, /Recent Decisions\n\s+2026-06-01  Preserve this decision/);
          assert.match(human, /Active Sessions:\s+1/);
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      });
    }
  }
}
