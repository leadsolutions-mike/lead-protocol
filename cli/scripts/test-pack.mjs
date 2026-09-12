// Faithful "production install" smoke test for @leadsolutions/lead-protocol.
//
// `npm link` reflects your on-disk folder: it ignores the `files` allowlist and
// the dependency split, so it can pass while a real install fails. This script
// exercises the real publish path instead: it builds, packs the exact tarball
// npm would publish, installs that tarball into a throwaway consumer project
// (so `files` and the real `dependencies` are exercised), then runs
// init / validate / status against it. Everything is removed at the end.
//
// One command: `npm run test:pack`.
//
// Note: installing the tarball downloads `dependencies` from the registry, so
// this needs network access (just like a real `npm install` / `npx`).

import { execSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(scriptDir, "..");
const q = (p) => `"${p}"`;

function listRelativeEntries(root, current = root) {
  const entries = [];
  for (const item of readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, item.name);
    entries.push(path.relative(root, absolute));
    if (item.isDirectory()) entries.push(...listRelativeEntries(root, absolute));
  }
  return entries;
}

function run(label, cmd, opts = {}) {
  console.log(`\n[test-pack] ${label}\n[test-pack] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

function capture(label, cmd, opts = {}) {
  console.log(`\n[test-pack] ${label}\n[test-pack] $ ${cmd}`);
  return execSync(cmd, { encoding: "utf8", ...opts });
}

const tmp = realpathSync(mkdtempSync(path.join(os.tmpdir(), "lp-testpack-")));

try {
  // 1. Fresh build (tsup + template sync via onSuccess).
  run("Building", "npm run build", { cwd: pkgRoot });

  // 2. Pack the exact publish artifact straight into the temp dir.
  console.log("\n[test-pack] Packing tarball");
  const tgzName = execSync(`npm pack --pack-destination ${q(tmp)}`, {
    cwd: pkgRoot,
    encoding: "utf-8",
  })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .pop();
  const tgz = path.join(tmp, tgzName);
  console.log(`[test-pack] tarball: ${tgz}`);

  // 3. Install the tarball into a throwaway consumer (real files allowlist + deps).
  writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify({ name: "lp-testpack-consumer", private: true }, null, 2),
  );
  run(
    "Installing tarball (downloads dependencies from the registry)",
    `npm install ${q(tgz)}`,
    { cwd: tmp },
  );

  const installed = path.join(tmp, "node_modules", "@leadsolutions", "lead-protocol");
  const bin = path.join(installed, "dist", "index.js");
  if (!existsSync(bin)) throw new Error(`installed bin not found: ${bin}`);

  // Templates must have shipped inside the installed package (the thing the
  // `files` allowlist controls and `npm link` cannot prove).
  const shipped = path.join(installed, "dist", "templates", ".agents", "CORE_RULES.md");
  if (!existsSync(shipped)) {
    throw new Error(`templates missing from installed package: ${shipped}`);
  }
  console.log("[test-pack] OK: dist/templates shipped inside the installed package");

  const shippedTemplates = path.join(installed, "dist", "templates");
  const excludedCacheArtifacts = listRelativeEntries(shippedTemplates).filter((relative) => {
    const segments = relative.split(path.sep);
    return (
      segments.includes("__pycache__") ||
      segments.includes(".pytest_cache") ||
      /\.(pyc|pyo)$/i.test(segments.at(-1))
    );
  });
  if (excludedCacheArtifacts.length > 0) {
    throw new Error(`excluded cache artifacts shipped in package: ${excludedCacheArtifacts.join(", ")}`);
  }
  console.log("[test-pack] OK: installed scaffold contains no Python cache artifacts");

  // 4. Run init / validate / status in a clean target dir.
  const target = path.join(tmp, "project");
  mkdirSync(target);
  run("init --yes", `node ${q(bin)} init --yes`, { cwd: target });

  for (const file of ["CLAUDE.md", "AGENTS.md"]) {
    const text = readFileSync(path.join(target, file), "utf-8");
    if (!text.includes("<lead-protocol>")) {
      throw new Error(`${file} is missing the <lead-protocol> block`);
    }
  }
  if (!existsSync(path.join(target, ".agents", "CORE_RULES.md"))) {
    throw new Error(".agents/ was not created by init");
  }
  const installedManifestPath = path.join(target, ".agents", "manifest.json");
  if (!existsSync(installedManifestPath)) throw new Error(".agents/manifest.json was not created by init");
  const installedManifest = JSON.parse(readFileSync(installedManifestPath, "utf8"));
  const installedPackage = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"));
  if (installedManifest.manifest_version !== 1 || installedManifest.product_version !== installedPackage.version) {
    throw new Error(`installed manifest does not identify product ${installedPackage.version}`);
  }
  const protocolRules = readFileSync(path.join(target, ".agents", "PROTOCOL_RULES.md"), "utf8");
  const kernelVersion = protocolRules.match(/^>\s*Version:\s*(\d+\.\d+\.\d+)\s*\|/m)?.[1];
  if (!kernelVersion || installedManifest.kernel_version !== kernelVersion) {
    throw new Error(`installed manifest kernel ${installedManifest.kernel_version} does not match PROTOCOL_RULES ${kernelVersion ?? "missing"}`);
  }
  console.log(`[test-pack] OK: installed manifest identifies product ${installedPackage.version} and kernel ${kernelVersion}`);

  for (const relativePath of [
    path.join(".agents", "PROJECT_RULES.md"),
    path.join(".agents", "modules", "git-substrate.md"),
  ]) {
    const text = readFileSync(path.join(target, relativePath), "utf-8");
    if (!text.includes("`<agent-slug>/<description>`")) {
      throw new Error(`${relativePath} is missing the agent-neutral branch convention`);
    }
    if (text.includes("`claude/*`") || text.includes("`claude/<description>`")) {
      throw new Error(`${relativePath} still uses a vendor-specific generic branch default`);
    }
  }
  console.log("[test-pack] OK: installed scaffold uses agent-neutral branch guidance");

  console.log("[test-pack] OK: init created .agents/ and tagged CLAUDE.md / AGENTS.md");

  // Materialize the minimum project configuration required by the canonical
  // boot gate before exercising the session lifecycle.
  const projectRules = path.join(target, ".agents", "PROJECT_RULES.md");
  writeFileSync(
    projectRules,
    readFileSync(projectRules, "utf-8")
      .replace("# PROJECT_RULES.md — [Project Name]", "# PROJECT_RULES.md — Package smoke")
      .replace("- **Name:** [Project Name]", "- **Name:** Package smoke")
      .replace(/- \*\*Active modules:\*\*.*$/m, "- **Active modules:** none"),
  );

  run("validate", `node ${q(bin)} validate`, { cwd: target });
  const humanStatus = capture("status", `node ${q(bin)} status`, { cwd: target });
  if (!humanStatus.includes("Product Version") || !humanStatus.includes(installedPackage.version)) {
    throw new Error("human status does not report the installed product version");
  }
  if (!humanStatus.includes("Kernel Version") || !humanStatus.includes(kernelVersion)) {
    throw new Error("human status does not report the installed kernel version");
  }
  if (humanStatus.includes("Protocol Version")) throw new Error("human status still uses the ambiguous Protocol Version label");
  const pristineStatus = JSON.parse(capture("status --json", `node ${q(bin)} status --json`, { cwd: target }));
  if (pristineStatus.productVersion !== installedPackage.version || pristineStatus.kernelVersion !== kernelVersion) {
    throw new Error(`JSON status version identity mismatch: ${JSON.stringify(pristineStatus)}`);
  }
  if (pristineStatus.protocolVersion !== kernelVersion) {
    throw new Error("JSON status backward-compatible protocolVersion alias does not identify the kernel");
  }
  if (pristineStatus.activeSessions !== 0) {
    throw new Error(`fresh install inherited ${pristineStatus.activeSessions} active session(s)`);
  }
  if (pristineStatus.recentDecisions.length !== 0) {
    throw new Error(`fresh install inherited ${pristineStatus.recentDecisions.length} decision(s)`);
  }
  const pristineCheckpoints = readdirSync(path.join(target, ".agents", "checkpoints")).filter((name) => name !== ".gitkeep");
  if (pristineCheckpoints.length !== 0) {
    throw new Error(`fresh install inherited ${pristineCheckpoints.length} checkpoint(s)`);
  }
  const pristineSessionFiles = readdirSync(path.join(target, ".agents", "sessions"));
  if (pristineSessionFiles.length !== 1 || pristineSessionFiles[0] !== "active_sessions.md") {
    throw new Error(`fresh install inherited unexpected session artifacts: ${pristineSessionFiles.join(", ")}`);
  }
  console.log("[test-pack] OK: fresh install contains no source-repository sessions, decisions, or checkpoints");

  const legacyTarget = path.join(tmp, "legacy-project");
  mkdirSync(legacyTarget);
  run("legacy init --yes", `node ${q(bin)} init --yes`, { cwd: legacyTarget });
  rmSync(path.join(legacyTarget, ".agents", "manifest.json"));
  const legacyJson = JSON.parse(capture("legacy status --json", `node ${q(bin)} status --json`, { cwd: legacyTarget }));
  const legacyHuman = capture("legacy status", `node ${q(bin)} status`, { cwd: legacyTarget });
  if (legacyJson.productVersion !== "unknown" || legacyJson.kernelVersion !== kernelVersion) {
    throw new Error(`legacy fallback version identity mismatch: ${JSON.stringify(legacyJson)}`);
  }
  if (legacyJson.protocolVersion !== kernelVersion) {
    throw new Error("legacy JSON protocolVersion alias does not identify the kernel");
  }
  if (legacyHuman.includes("Protocol Version") || legacyHuman.includes("1.5.0")) {
    throw new Error("legacy fallback misreports CORE_RULES 1.5.0 as protocol identity");
  }
  console.log("[test-pack] OK: pre-manifest fallback reports unknown product and the actual kernel");

  // 5. Exercise the exact installed lifecycle binary without rebuilding.
  run(
    "session open",
    `node ${q(bin)} session open --actor judge --agent codex --signature "[Codex / GPT-5]" --topic "Package lifecycle smoke" --json`,
    { cwd: target },
  );
  const checkpointBody = path.join(target, "checkpoint-body.md");
  writeFileSync(checkpointBody, "Package smoke checkpoint body.\n");
  run(
    "checkpoint",
    `node ${q(bin)} checkpoint --actor judge --agent codex --title package-smoke --file ${q(checkpointBody)} --json`,
    { cwd: target },
  );
  run(
    "session close",
    `node ${q(bin)} session close --actor judge --agent codex --journal not-significant --status stable --last-action "Package lifecycle verified." --pending-step None --confirm-checklist --json`,
    { cwd: target },
  );
  const receipts = path.join(target, ".agents", "local", "judge", "codex", "receipts");
  if (!existsSync(receipts)) throw new Error("lifecycle receipts directory was not created");
  const resumed = JSON.parse(capture(
    "second session open / resume",
    `node ${q(bin)} session open --actor judge --agent codex --signature "[Codex / GPT-5]" --topic "Resume from prior handoff" --json`,
    { cwd: target },
  ));
  if (resumed.previousHandoff?.status !== "STABLE" || resumed.previousHandoff?.last_action !== "Package lifecycle verified.") {
    throw new Error("second session did not receive the terminal handoff from the first session");
  }
  run(
    "second session close",
    `node ${q(bin)} session close --actor judge --agent codex --journal not-significant --status stable --last-action "Two-session resume verified." --pending-step None --confirm-checklist --json`,
    { cwd: target },
  );
  console.log("[test-pack] OK: installed lifecycle completed a two-session resume flow");

  // Evidence is exercised through the installed tarball, never a source import.
  const evidenceLib = await import(pathToFileURL(path.join(installed, "dist/lib/execution-evidence.js")).href);
  const schemasDir = path.join(target, ".agents/schemas");
  const examples = [...protocolRules.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m => JSON.parse(m[1])).filter(v => v.execution_evidence);
  if (examples.length !== 2) throw new Error("shipped close/checkpoint examples missing");
  for (const example of examples) evidenceLib.validateEvidence(example.execution_evidence, schemasDir);
  console.log("[test-pack] OK: both illustrative examples validate against the shipped schema");
  const evidenceFile = path.join(target, "execution-evidence.json");
  const evidence = { checks: [{ command: "installed lifecycle fixture", cwd: target, result: "not_run", reason: "Illustrative roundtrip payload; not a claim of separate command execution" }], environment: { runtime: process.version, cwd: target } };
  writeFileSync(evidenceFile, JSON.stringify(evidence));
  const opened = JSON.parse(capture("evidence session open", `node ${q(bin)} session open --actor judge --agent codex --topic "Evidence roundtrip" --json`, { cwd: target }));
  const quotedBody = ['Legacy freeform examples', '````markdown', '## Execution Evidence', '```json', '{"execution_evidence":{}}', '```', '````', '~~~~', '## Execution Evidence', 'placeholder', '~~~~'].join("\r\n");
  const quotedFile = path.join(target, "quoted-body.md");
  writeFileSync(quotedFile, quotedBody);
  const schemaFile = path.join(schemasDir, "execution-evidence.schema.json");
  const schemaBytes = readFileSync(schemaFile);
  rmSync(schemaFile);
  const quotedArgs = [bin, "checkpoint", "--actor", "judge", "--agent", "codex", "--title", "quoted-example", "--file", quotedFile, "--json"];
  const quotedProcess = spawnSync(process.execPath, quotedArgs, { cwd: target, encoding: "utf8" });
  if (quotedProcess.status !== 0) throw new Error(`installed CLI rejected legacy fences: ${quotedProcess.stderr}`);
  const quotedCheckpoint = JSON.parse(quotedProcess.stdout);
  const quotedSaved = readFileSync(quotedCheckpoint.checkpoint, "utf8");
  const expectedQuoted = `# Checkpoint — quoted-example\n\n> Timestamp: ${quotedCheckpoint.timestamp}\n> Agent: ${opened.pair.signature}\n> Actor: judge\n> Session: \`${opened.sessionId}\`\n\n${quotedBody}\n`;
  if (quotedSaved !== expectedQuoted || evidenceLib.parseEvidenceMarkdown(quotedSaved, schemasDir) !== undefined) throw new Error("installed CLI changed legacy body or extracted fake evidence");
  writeFileSync(schemaFile, schemaBytes);
  const stateSnapshot = () => listRelativeEntries(path.join(target, ".agents")).filter(name => !statSync(path.join(target, ".agents", name)).isDirectory()).map(name => [name, readFileSync(path.join(target, ".agents", name)).toString("base64")]);
  const beforeMalformed = JSON.stringify(stateSnapshot());
  writeFileSync(quotedFile, quotedBody + "\n## Execution Evidence\nmissing JSON");
  const malformedProcess = spawnSync(process.execPath, quotedArgs, { cwd: target, encoding: "utf8" });
  if (malformedProcess.status === 0 || !/Malformed execution evidence/.test(malformedProcess.stderr)) throw new Error("installed CLI accepted malformed real section");
  if (JSON.stringify(stateSnapshot()) !== beforeMalformed) throw new Error("malformed real section mutated installed project state");
  console.log("[test-pack] OK: schema-free fenced legacy bytes preserved; malformed real section refused without state change");
  // Quoted examples must also coexist with explicitly supplied real evidence.
  writeFileSync(checkpointBody, quotedBody);
  const checkpoint = JSON.parse(capture("evidence checkpoint", `node ${q(bin)} checkpoint --actor judge --agent codex --title evidence-roundtrip --file ${q(checkpointBody)} --evidence ${q(evidenceFile)} --json`, { cwd: target }));
  const parsedCheckpoint = evidenceLib.parseEvidenceMarkdown(readFileSync(checkpoint.checkpoint, "utf8"), schemasDir);
  if (evidenceLib.renderEvidenceMarkdown(parsedCheckpoint) !== evidenceLib.renderEvidenceMarkdown(evidence)) throw new Error("installed checkpoint lost evidence");
  const registry = path.join(target, ".agents/sessions/active_sessions.md");
  const handoffPath = path.join(target, ".agents/local/judge/codex/handoff.md");
  const beforeInvalid = [readFileSync(registry, "utf8"), readFileSync(handoffPath, "utf8"), readdirSync(receipts).join(",")];
  writeFileSync(evidenceFile, '{"checks":[{"command":"test","result":"blocked","reason":" "}]}');
  const closeArgs = [bin, "session", "close", "--actor", "judge", "--agent", "codex", "--journal", "not-significant", "--status", "stable", "--last-action", "Evidence roundtrip verified", "--pending-step", "None", "--confirm-checklist", "--evidence", evidenceFile, "--json"];
  const rejected = spawnSync(process.execPath, closeArgs, { cwd: target, encoding: "utf8" });
  if (rejected.status === 0 || !/execution evidence/i.test(rejected.stderr)) throw new Error("installed CLI accepted invalid evidence");
  if (JSON.stringify(beforeInvalid) !== JSON.stringify([readFileSync(registry, "utf8"), readFileSync(handoffPath, "utf8"), readdirSync(receipts).join(",")])) throw new Error("invalid installed close mutated state");
  writeFileSync(evidenceFile, JSON.stringify(evidence));
  const closedProcess = spawnSync(process.execPath, closeArgs, { cwd: target, encoding: "utf8" });
  if (closedProcess.status !== 0) throw new Error(closedProcess.stderr);
  const closed = JSON.parse(closedProcess.stdout);
  const saved = JSON.parse(readFileSync(path.join(receipts, `${opened.sessionId}-close.json`), "utf8"));
  if (JSON.stringify(saved) !== JSON.stringify(closed) || JSON.stringify(evidenceLib.parseCloseReceiptEvidence(saved, schemasDir)) !== JSON.stringify(evidence)) throw new Error("installed close receipt lost evidence");
  if (!readFileSync(handoffPath, "utf8").includes(path.basename(checkpoint.checkpoint))) throw new Error("installed handoff lost checkpoint reference");
  console.log("[test-pack] OK: installed evidence roundtrip, invalid-input preservation, receipt and handoff references");

  console.log("\n[test-pack] PASS: the locally packed artifact installs and runs like production.");
} catch (err) {
  process.exitCode = 1;
  console.error(`\n[test-pack] FAIL: ${err.message}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
  console.log(`[test-pack] cleaned up ${tmp}`);
}
