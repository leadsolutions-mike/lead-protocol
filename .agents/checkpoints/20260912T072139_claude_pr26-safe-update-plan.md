# Checkpoint — PR26 safe `update` command: plan + test findings

> Session: 2026-09-12-0721-claude
> Timestamp: 2026-09-12 07:21 UTC
> Author: [Mike / Claude] (real Opus planner)
> Status: PLAN-READY (plan only — no implementation, no GitHub writes)

## Open question

Is Leonardo's PR26 (`feat(cli): add update command and stop init from
overwriting existing installs`) safe to deliver against **current main**, and if
not, what is the minimal, correctly-attributed successor scope with a TDD
RED/GREEN regression suite that closes issues #25 / #40 without an arbitrary
release bump?

## Exact SHAs and environment

- Current main / this worktree base: `66995ea` (release v2.1.5).
- PR26 head (detached worktree `../lead-protocol-26-original`):
  `4000b1479a075dcceb205c6586870cbee8901359` (`feat(cli): update command`).
- PR26 merge-base with main: `6071441` (`ci: add GitHub Actions workflow…`).
- PR26 metadata (live): OPEN, cross-repo (`leonardobuares:feat-cli-update`),
  `mergeable=CONFLICTING`, `mergeStateStatus=DIRTY`, +629 / −76, 12 files,
  created 2026-07-06. URL: https://github.com/mmilanez/lead-protocol/pull/26.
- Issues: #25 (requests exactly this `update` command; OPEN) and #40 (`init`
  overwrites project-layer state unconditionally; OPEN). PR26 `Closes #25` and
  materially resolves #40.
- Toolchain used: Node v22.22.0, npm 11.8.0.

## What PR26 does (as authored, on its old base)

- New `cli/src/lib/updater.ts` — three-layer-aware planner/applier.
- New `cli/src/commands/update.ts` — `update [--yes] [--dry-run]`.
- New `cli/src/lib/scaffold.ts` — extracts `generateGuidelines` /
  `ensureGitignoreEntries` so `init` and `update` share them.
- `cli/src/commands/init.ts` — refuses when installed (exit 1), points to
  `update`; `init --force` reinstalls with an explicit data-loss warning;
  `.agents/local/` preserved.
- New `cli/test/updater.test.mjs` (8 tests) + `cli/scripts/test-pack.mjs`
  scenarios; `cli/README.md` + `CHANGELOG.md`; `cli/tsup.config.ts` adds an
  `updater` entry; `@types/node` added to devDeps.

## Commands run and results (original PR, its own base)

In `../lead-protocol-26-original/cli` at head `4000b14`:

- `npm ci` → 91 packages, OK (2 audit advisories, pre-existing/unrelated).
- `npm run typecheck` → **EXIT 0** (pass).
- `npm test` → **8/8 pass** (only `updater.test.mjs` runs — the other suites did
  not yet exist at merge-base `6071441`).
- `npm run test:pack` → **PASS** end-to-end: `update --dry-run` writes nothing;
  `update --yes` refreshes framework, preserves customized `PROJECT_RULES.md`,
  preserves an orphan module; plain `init` refuses on an existing install;
  `init --force --yes` reinstalls.

**Conclusion:** PR26 is well-engineered and green *on its own base*. Every defect
below is a **current-main integration** issue, not a flaw in Leonardo's logic.

## Defects and hazards vs current main

### D1 — CRITICAL (correctness): `update` leaves `manifest.json` stale
Current main ships `.agents/manifest.json`
(`{manifest_version, product_version, kernel_version}`), consumed by `status`,
`sync-manifest.mjs`, `release-metadata.mjs`, `verify-published-release.mjs`, and
`test-pack.mjs`. PR26's classifier only treats
`FRAMEWORK_ROOT_FILES=["CORE_RULES.md","PROTOCOL_RULES.md"]` and
`FRAMEWORK_DIRS=["modules","schemas","scripts"]` as framework; everything else is
project-layer (created if missing, **never overwritten**). So on any install that
already has a `manifest.json`, `update` skips it and the version stays stale — the
exact bug `update` is meant to prevent.

**Empirical proof** (PR26's own built `dist/lib/updater.js` vs current-main
templates, target carrying a stale `manifest.json` 2.0.3):
```
isFrameworkPath('manifest.json') = false
plan.files entry for manifest.json = (none)
manifest.json in skipped[] = true
BUNDLED product_version: 2.1.5
TARGET AFTER PLAN product_version: 2.0.3  (unchanged => STALE)
```
Note: on a *pre-manifest* install (no file) `update` correctly **creates** it;
the bug bites on repeat updates / any install that already has a manifest.

### D2 — BLOCKER (mergeability): cannot merge as-is
`git merge-tree 66995ea 4000b14` reports content conflicts in: `CHANGELOG.md`,
`cli/package.json`, `cli/package-lock.json`, `cli/scripts/test-pack.mjs`,
`cli/tsup.config.ts`. `init.ts` auto-merges but only textually — current main's
`init.ts` was rewritten independently, so a raw merge is semantically unsafe.
A current-main-based reimplementation is required, not a rebase/merge.

### D3 — HIGH (packaging regression): `tsup` entry would drop `session-lifecycle`
Current `tsup.config.ts` uses an object entry `{index, "lib/session-lifecycle"}`.
PR26 uses an array `["src/index.ts","src/lib/updater.ts"]`. Taking PR26's config
verbatim removes the `lib/session-lifecycle` entry, so `dist/lib/session-lifecycle.js`
is not emitted and `test/session-lifecycle.test.mjs` breaks. Merged config must
emit **all three**: `index`, `lib/session-lifecycle`, `lib/updater`.

### D4 — HIGH (test regression): `npm test` script would drop suites
Current test script runs session-lifecycle + status + validate + release-metadata.
PR26's script (from its base) runs only `updater.test.mjs`. The successor must
**add** `updater.test.mjs` to the current list, not replace it.

### D5 — MEDIUM (arbitrary release bump — excluded by mission)
PR26 bumps `cli/package.json` 2.0.3→2.2.0 and adds a `[2.2.0]` CHANGELOG entry.
Current main is 2.1.5. `check-release-metadata.mjs` (run in `publish-cli.yml`)
enforces version consistency across package/lockfile/README/CHANGELOG/kernel/
manifest, so a partial bump fails publish CI. Successor must **keep 2.1.5** and
record the change under an unreleased/pending CHANGELOG note; release is the
owner's gate.

### D6 — MEDIUM (path safety): `update` writes through symlinks
`applyUpdate` uses `copyFileSync`/`statSync` (follows links) with no `lstat`
guard. If a target framework path (e.g. `.agents/schemas` or a framework file) is
a symlink, `update` writes through it — potentially outside `.agents/`. The
project already hardened path traversal in `469613b`, so this regresses an
existing safety property. Writes should refuse/replace symlinked targets.

### D7 — LOW (robustness): malformed/partial install can crash mid-write
`update` only checks that `.agents/` exists. If a framework dir is present as a
*file* (e.g. `.agents/schemas` is a regular file), `applyUpdate`'s
`mkdirSync(dirname)` throws `ENOTDIR` mid-run, leaving a partial write. Detect and
report malformed installs before writing.

### D8 — LOW (cosmetic): `init --force` warning overstates loss
`init --force` uses `cpSync` overlay, so orphan modules and existing checkpoint
files actually survive, though the warning implies `checkpoints/` is wiped. Also
`@types/node` (PR26 devDep addition) is already on current main — that part of
PR26 is obsolete and should be dropped.

## Recommended implementation scope (for the execution block)

Branch off current main (`66995ea`) on the **Mike fork**, preserving Leonardo's
authorship (`Co-authored-by: Leonardo Buares Correa`) on reused code. Deliver:

1. `cli/src/lib/updater.ts` (from PR26) **+ fix D1**: add `manifest.json` to the
   framework root set (single canonical framework-file list) **+ fix D6**:
   `lstat`-guard writes (refuse/replace symlinked targets).
2. `cli/src/lib/scaffold.ts` (from PR26, unchanged) and refactor current
   `init.ts` to import it (dedupe the two copies).
3. `cli/src/commands/update.ts` (from PR26, unchanged).
4. `cli/src/commands/init.ts`: apply PR26's guard/`--force`/warning **on top of
   current main's init**; drop the obsolete `@types/node` change (D8).
5. `cli/src/index.ts`: register `update` (2 lines).
6. `cli/tsup.config.ts`: object entry `{index, "lib/session-lifecycle",
   "lib/updater"}` (fix D3).
7. `cli/package.json`: add `updater.test.mjs` to the test list (fix D4); **no
   version bump** (fix D5).
8. `cli/scripts/test-pack.mjs`: integrate PR26's update/init-guard scenarios into
   current test-pack (which already asserts manifest + pre-manifest fallback);
   add the stale-manifest-refresh assertion (D1 at pack level).
9. `cli/README.md` (document `update` + new `init`); `CHANGELOG.md` unreleased/
   pending note (no release number).

## TDD RED/GREEN regression plan (vertical)

Each RED is written to fail against unmodified PR26 logic on current main, then
GREEN after the fix. Capture and preserve actual RED output.

- **R1 manifest freshness (unit, `updater.test.mjs`)**: template `manifest.json`
  = new version, target = old version → assert classified `framework` and action
  `updated`; after `applyUpdate`, target equals template. RED today (proven:
  `skipped`, stale). GREEN after D1.
- **R2 manifest created when missing (unit)**: no target manifest → `created`.
  (Guards that the D1 fix keeps the good pre-manifest behavior.)
- **R3 update idempotence (unit + pack)**: two consecutive `update` runs; second
  reports all framework `unchanged`, zero pending writes, stable `skipped`.
- **R4 symlink/path safety (unit)**: target framework path is a symlink to an
  out-of-tree file/dir → `update` must not write through it. RED today (follows
  link). GREEN after D6.
- **R5 project + actor state preservation (unit + pack)**: assert `update` leaves
  `PROJECT_RULES.md`, `JOURNAL.md`, `decisions.jsonl`, `AGENTS_MAP.md`,
  `sessions/active_sessions.md`, and everything under `local/` byte-identical.
- **R6 init refusal incl. malformed/partial (pack + unit)**: `init` on a valid
  install exits 1 and mutates nothing; on a *malformed* install (`.agents` present
  but `CORE_RULES.md` absent, or a framework dir present as a file) behavior is
  defined and non-destructive (D7).
- **R7 init --force (pack)**: reinstalls project layer, preserves `local/`.
- **R8 packaging (pack)**: real tarball emits **both** `dist/lib/updater.js` and
  `dist/lib/session-lifecycle.js` (guards D3); `update`/`init` run from the packed
  bin; after `update --yes` on a stale-manifest install, packed `manifest.json`
  equals bundled `product_version` (D1 at pack level).

## Verification gates for the execution block

`npm run typecheck` (0) · `npm test` (all suites incl. new updater RED→GREEN) ·
`npm run test:pack` · `git diff --check` · `node scripts/check-release-metadata.mjs`
(must stay consistent since no version bump) · exact-file commit list · Opus
independent exact-diff review (APPROVED/CHANGES REQUESTED; PENDING on truncation).
CI to observe on the Mike fork: `cli-lifecycle.yml` (typecheck/test/test:pack).

## Final recommendation

**PLAN-READY.** Do not merge or rebase PR26 as-is (D2, D5). Build a
current-main-based, Leonardo-attributed successor on the Mike fork implementing
the scope above; the only true correctness bug is D1 (manifest freshness), the
rest are integration/packaging/safety. Keep release, merge, issue/PR closure, and
JOURNAL promotion as **owner gates**. Do not administratively close PR26.
