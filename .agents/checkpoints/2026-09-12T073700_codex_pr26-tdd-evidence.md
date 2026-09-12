# Checkpoint — PR26 TDD execution evidence
> Session: 2026-09-12-0727-codex
> Timestamp: 2026-09-12 07:37 UTC
> Author: [Mike / Codex] — gpt-6-astra
> Implementation review: PENDING (independent Opus next)

## Scope and sequence
Current-main base 66995ea, branch mike/pr26-safe-update. Plan approved with amendments in `2026-09-12T072700_codex_pr26-plan-cross-review.md` before product edits. PR26 source reused from 4000b1479a075dcceb205c6586870cbee8901359: updater, scaffold and update command, adapted to current main and safety requirements. No version bump, no root framework/map changes, no external mutations.

All init/update invocations operated on temporary fixtures, never this working repository. Explicit force appears only in throwaway fixtures. Runtime pair state is mike/codex. Logs live under `/home/mmilanez/`.

## Actual regression execution
Each numbered log prefix below is `lead-protocol-26-`. Tests were added before the corresponding remediation. Build command: `cd cli && npm run build`; regression command: `node --test test/updater.test.mjs` (from cli).

| Slice | Actual RED artifact / outcome | Implementation and GREEN |
|---|---|---|
| 01 init | `red-01-init.log`: 0/2 pass, partial init wrongly exits 0; --force unknown | guard any lstat-visible .agents entry; explicit force; local exclusion. `green-01-init.log`: 2/2 |
| 02 update | `red-02-update.log`: 2 pass / 2 fail; absent update command and one invalid seed fixture | adapt original command/planner/scaffold, retain current tests/entrypoints, skip local, refresh manifest. First `green-02-update.log`: 3/4, because README.md was not a shipped seed. Corrected fixture to checkpoints/.gitkeep; `green-02-update-fixed-fixture.log`: 4/4 |
| 03 manifest classifier | `red-03-manifest.log`: explicit manifest classification assertion fails using replay of original two-root-file classifier (temporarily removed earlier manifest inclusion) | restore manifest framework classification; `green-03-manifest.log`: 5/5. This is an explicit original-classifier replay, not an assertion that the already integrated classifier was still broken |
| 04 path preflight | `red-04-path-safety.log`: 7/38 pass, 31 fail | whole-plan source/destination preflight, no link traversal/deletion, nearest malformed install refusal, local skipped before walking, apply-time path validation. `green-04-path-safety.log`: 38/38 |
| 05 guidelines | `red-05-guidelines.log`: both selected tests fail on outside-tag prefix changes | byte-buffer tag replacement, append without trimming, no identical rewrites. `green-05-guidelines.log`: 40/40 |

One initial test-file creation command mistakenly used `cli/test` while already in cli and failed before writing the test; it was corrected immediately. The early `build-initial.log` is a successful baseline build; it is not a regression result. The corrected real RED init artifact above contains actual assertion failures.

Additional passing validation covers bundled local example collisions and ignored broken source-local links (41 new tests total), exercised both from build and real installed tarball.

## Full quality gates
- `cd cli && npm run typecheck` → exit 0; `lead-protocol-26-typecheck.log`.
- `cd cli && npm test` → first attempt 78/81 in `lead-protocol-26-test.log`. Operator launched pack's clean build while suite was active; three failures are missing dist files/templates during clean, not accepted as product verification. Retained without overwriting.
- Reran `cd cli && npm test` with no concurrent build → exit 0, **81/81**, `lead-protocol-26-test-serial.log`.
- `cd cli && npm run test:pack` → exit 0, `lead-protocol-26-pack.log`. Real npm pack + temporary consumer npm install + installed init/validate/status/pre-manifest fallback + two-session resume lifecycle + **41/41 installed-binary safety regressions**. Both updater and session-lifecycle entrypoints exist. No publish/link substitution.
- `node cli/scripts/check-release-metadata.mjs 2.1.5` → exit 0; `lead-protocol-26-metadata.log` (package/lock/README/CHANGELOG/kernel/source manifest/bundle consistent).
- `git diff --check` → exit 0; empty `lead-protocol-26-diff-check.log`.
- Original adversarial replay: `node /home/mmilanez/lead-protocol-26-original-probe.mjs` → exit 0, unsafe external overwrite and partial-init data loss reproduced in `lead-protocol-26-codex-original-probe.log`. Original implementation is NOT safety-approved despite its old passing tests.

## Coverage and limits
Project rules, map, journal, lessons, decisions, registry/checkpoints and all local bytes preserved; absent project seed restored; stale/missing manifest handled; orphans retained; update idempotence includes mtimes. Static hazards cover .agents links, nested framework links including orphans, framework directory-as-file, guideline directories/links and .gitignore links; full snapshots prove no earlier mutation and links remain in place. Apply validates injected traversal/local paths before earlier writes. Local is excluded even if linked or shipped by a future bundle.

No transactional rollback, hard-link alias defense, distributed locking or guarantee against concurrent source/destination replacement. Other I/O failures (e.g. permissions/disk exhaustion) can leave partial application. These limits are documented in cli/README.md. No new dependency, audit remediation, release, merge, push, PR or hosted CI action in this scope. Independent review is required next; no self-approval.

State gate: `node cli/dist/index.js validate .agents/decisions.jsonl` initially rejected the new Codex 07:27 timestamp without timezone (kernel prose allows optional timezone but AJV format requires it). Repaired only this session's new malformed timestamp to 2026-09-12T07:27:00Z and appended an explicit repair record; peer history preserved. Initial output retained in `lead-protocol-26-state-validation.log`; final read-only state checks in `lead-protocol-26-state-validation-final.log`. Own handoff initially passed.
