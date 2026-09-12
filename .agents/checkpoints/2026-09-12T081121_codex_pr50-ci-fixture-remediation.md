# Checkpoint — PR50 macOS CI fixture remediation
> Session: 2026-09-12-ci-fix-codex
> Timestamp: 2026-09-12 08:11:21 UTC
> Author: [Mike / Codex]
> Branch: mike/pr26-safe-update
> Exact fix commit: `a08614e6c9f93033c749b1b850a6008774c8d557`
> Base: `d1e3ab82695db82eba1d822ebe013916ffae1275`
> Independent review: **PENDING**
> Hosted CI for new commit: **PENDING** (worker did not push)

## Diagnosis
Fetched evidence `/home/mmilanez/lead-protocol-26-ci-failure.log` for hosted run34682367348 on PR50 base reports three macOS Node18 failures: manifest refresh, injected traversal/local paths and late symlinks, and template actor seed exclusion. Each throws `Unsafe symbolic link: /var` before its direct-library assertions. Linux/Windows/package/state pass per coordinator report; this worker did not query remote CI.

`fixture()` previously allocated from lexical `tmpdir()`, which on macOS includes the `/var` alias. Direct `planUpdate(source, target)` preserves that lexical ancestor; `preflightPath()` uses `path.resolve()` (lexical, not realpath) and checks every component with `lstatSync()`, correctly rejecting the alias. Spawned CLI processes use canonical `process.cwd()`, so CLI tests avoid that ancestor. A Linux child-cwd probe confirms this distinction exactly.

Minimal fix: import `realpathSync`, allocate with `mkdtempSync(path.join(realpathSync(tmpdir()), 'lp-update-'))`, explain why. Resolution happens only at allocation, before hazards exist. Product paths/preflight, workflows, test assertions, test registration, framework/map and release metadata are unchanged.

## Actual execution evidence
All logs below have prefix `/home/mmilanez/lead-protocol-26-ci-fix-`.

| Gate | Command / condition | Result | Log suffix |
|---|---|---|---|
| Build before RED | `cd cli && npm run build` | exit 0 | `build.log` |
| RED, unmodified base test | `TMPDIR=/tmp/lp-ci-alias-klublfu9/alias node --test test/updater.test.mjs` from cli | exit 1; 41 pass, exactly the same 3 direct-library failures on alias ancestor | `red.log` |
| GREEN, minimal fixture fix | same command, same allocated symlink TMPDIR | exit 0; 44 pass, 0 fail, 0 skipped | `green.log` |
| Canonical cwd probe | Node tmpdir/realpath/lstat and spawned child process.cwd | alias remains symlink; child cwd is real directory | `diagnosis.log` |
| Hazard audit | compare all test bodies/helpers after fixture with base | byte-identical | `hazard-audit.log` |
| Full tests | `cd cli && npm test` | exit 0; 84/84, 0 skipped | `test.log` |
| Types | `cd cli && npm run typecheck` | exit 0 | `typecheck.log` |
| Package | `cd cli && npm run test:pack` | exit 0; installed 44/44 plus lifecycle/two-session resume | `pack.log` |
| Metadata | `cd cli && node scripts/check-release-metadata.mjs 2.1.5` | exit 0 | `metadata.log` |
| State | `python3 .agents/scripts/validate_state.py --schemas-dir .agents/schemas .agents/decisions.jsonl` | exit 0 | `state.log` |

Full tests, typecheck, pack, metadata ran serially; no overlapping dist rebuilds. Local Node v22.22.0 on Linux. Native macOS rerun remains hosted CI work for Hermes; Linux reproduction is not a claim of native macOS execution. Temporary alias fixture cleaned after both runs; allocation record retained in `fixture.json`.

## Hazard authenticity
All 30 CLI matrix cases still create real symlinks or malformed paths, assert nonzero refusal, and compare whole-fixture snapshots including external bytes, symlink targets, modes and mtimes. No fixture-internal path is canonicalized. The direct-library adversarial test now reaches a successful clean plan, checks five injected traversal/local paths, then replaces target PROTOCOL_RULES.md with a real symlink AFTER planning and checks rejection before any earlier write. Local-link exclusion, broken template-local links, partial/malformed installs and preservation/idempotence tests remain intact. Every test body is byte-identical to base; all 44 execute without skips through the alias.

## Handoff
Fix review is PENDING; prior Opus approval does not approve this delta. Hermes owns independent review/verification/push and hosted exact-head CI readback. No push, PR mutation, merge, release, map/framework/workflow change or issue46 work performed. This is block1; issue46 remains next only after green. Own session closed. JOURNAL promotion remains owner-deferred per prior handoff; diagnosis is captured here and in decisions/activity, with no new personal lesson.
