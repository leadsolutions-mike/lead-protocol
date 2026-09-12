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

import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const tmp = mkdtempSync(path.join(os.tmpdir(), "lp-testpack-"));

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
  // Invoke the installed artifact directly, with native paths and no shell.
  function assertStatus(cwd, project, productVersion, expectedKernel) {
    const invoke = (...args) => {
      const output = execFileSync(process.execPath, [bin, "status", ...args], {
        cwd, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      });
      assert.doesNotMatch(output, /\x1b/, "no ANSI escapes in no-color output");
      return output.replace(/\r\n/g, "\n");
    };
    assert.deepEqual(JSON.parse(invoke("--json")), {
      project,
      productVersion,
      kernelVersion: expectedKernel,
      protocolVersion: expectedKernel,
      activeSessions: 0,
      pairs: [],
      recentDecisions: [],
    });
    const human = invoke();
    const lines = human.split("\n");
    const first = lines.findIndex((line) => line.trim() !== "");
    assert.equal(lines[first], `Lead Protocol ${productVersion} — ${project}`);
    assert.equal(lines[first + 1], `  Kernel: ${expectedKernel} (technical detail)`);
    assert.doesNotMatch(human, /Product Version|Kernel Version|Protocol Version/);
    assert.match(human, /No sessions recorded yet/);
    assert.match(human, /No decisions recorded yet/);
    assert.match(human, /Active Sessions:\s+0/);
  }
  assertStatus(target, "Package smoke", installedPackage.version, kernelVersion);

  // A consumer scaffold can differ from the CLI that happens to inspect it.
  const differentProduct = installedPackage.version === "7.8.9" ? "7.8.10" : "7.8.9";
  writeFileSync(installedManifestPath, JSON.stringify({ ...installedManifest, product_version: differentProduct }));
  assertStatus(target, "Package smoke", differentProduct, kernelVersion);
  writeFileSync(installedManifestPath, JSON.stringify(installedManifest));
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
  execFileSync(process.execPath, [bin, "init", "--yes"], { cwd: legacyTarget, stdio: "pipe" });
  const legacyManifestPath = path.join(legacyTarget, ".agents", "manifest.json");
  rmSync(legacyManifestPath);
  assertStatus(legacyTarget, "Unknown Project", "unknown", kernelVersion);
  console.log("[test-pack] OK: legacy status preserves complete JSON and human hierarchy");

  for (const invalidManifest of ["{ invalid", JSON.stringify({ ...installedManifest, product_version: "invalid" })]) {
    writeFileSync(legacyManifestPath, invalidManifest);
    assertStatus(legacyTarget, "Unknown Project", "unknown", kernelVersion);
  }
  writeFileSync(path.join(legacyTarget, ".agents", "PROTOCOL_RULES.md"), "> Version: invalid | Updated: 2026-06-01\r\n");
  assertStatus(legacyTarget, "Unknown Project", "unknown", "unknown");
  console.log("[test-pack] OK: pristine, differing-product, legacy, and invalid-manifest status contracts");

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

  console.log("\n[test-pack] PASS: the locally packed artifact installs and runs like production.");
} catch (err) {
  process.exitCode = 1;
  console.error(`\n[test-pack] FAIL: ${err.message}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
  console.log(`[test-pack] cleaned up ${tmp}`);
}
