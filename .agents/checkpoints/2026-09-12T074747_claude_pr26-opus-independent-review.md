# Checkpoint — PR26 successor independent exact-diff review (Opus)

> Session: 2026-09-12-0721-claude (owner-authorized continuation of closed plan session)
> Timestamp: 2026-09-12 07:47 UTC
> Author: [Mike / Claude] — real Opus 4.8 (claude-opus-4-8), independent reviewer
> Reviewed SHA (frozen HEAD): `695e33af3b221cb83d5b20608299afe4c59f1722`
> Product implementation commit: `005de1c1c5806b540ace5b8d6d26054b7a64c367` (695e33a and 2d8fbd6 are coordination-only docs)
> Canonical review path: `.agents/checkpoints/2026-09-12T074747_claude_pr26-opus-independent-review.md`

## Scope and method

Independent adversarial review of `git diff origin/main...HEAD` (merge-base
`66995ea` = v2.1.5). No product code edited. Executable gates run first, then
exact-diff audit, then independent reproduction of the two originally-confirmed
defects against the freshly built `dist/` in throwaway temp fixtures only. No
init/update run against this worktree.

Reviewed diff: 19 files, +1055/-136. Product: `cli/src/commands/{init,update}.ts`,
`cli/src/lib/{updater,scaffold,safe-path,guideline-writer}.ts`, `cli/src/index.ts`,
`cli/tsup.config.ts`, `cli/package.json`, `cli/scripts/test-pack.mjs`,
`cli/test/updater.test.mjs`. Docs: `CHANGELOG.md`, `cli/README.md`,
`.agents/decisions.jsonl` (append-only, 2 tail entries), 5 coordination checkpoints.

## Executable gates (from `cli/`, node v22.22.0)

| Gate | Command | Exit | Result | Log |
|---|---|---|---|---|
| Unit | `npm test` | 0 | **81/81 pass** (40 baseline retained + updater suite) | `lead-protocol-26-opus-review-test.log` |
| Types | `npm run typecheck` | 0 | clean (`tsc --noEmit`) | `lead-protocol-26-opus-review-typecheck.log` |
| Pack | `npm run test:pack` | 0 | **41/41** against installed binary + updater entrypoint | `lead-protocol-26-opus-review-pack.log` |
| Metadata | `node scripts/check-release-metadata.mjs 2.1.5` | 0 | package/lockfile/README/CHANGELOG/kernel/manifest/bundle all agree on 2.1.5 | `lead-protocol-26-opus-review-metadata.log` |

Test and pack run sequentially (both clean `dist/`).

## Scope-item verification

- **Current-main compatibility** — PASS. `update` registered in `index.ts` alongside all existing commands; `test` script adds `updater.test.mjs` while retaining all four prior suites; `tsup` adds `lib/updater` entry; `test:pack` verifies installed `dist/lib/updater.js` + `dist/lib/session-lifecycle.js`. Metadata gate green at 2.1.5 (no version bump).
- **No dropped lifecycle/test entries** — PASS. `published-release.test.mjs` was already excluded from the `test` script on `origin/main` (network/registry test); not a regression.
- **Manifest refresh** — PASS. `manifest.json` ∈ `FRAMEWORK_ROOT_FILES`; stale target manifest planned `updated`; verified by unit test and independent reproduction.
- **Init refuses existing/partial/malformed without writes** — PASS. `isLeadProtocolInstalled` uses `lstatSync` (catches dir/file/dangling-symlink) before any plan/apply; refusal returns exit 1 with no writes. Independently reproduced: partial `.agents/PROJECT_RULES.md` preserved byte-identical, exit 1.
- **Explicit force overlay preserves ALL actor/local** — PASS. `walkFiles(..., excludeLocal=true)` skips top-level `local/`; `safeRelativePath` rejects injected `local/...`; unit test asserts `local` snapshot identical under both `force=false/true`. Template ships no `local/` (excluded by unchanged `sync-templates.mjs`), so exclusion drops nothing old `init` copied.
- **Update preserves all project + local bytes** — PASS. `planUpdate(overwriteProject=false)` skips existing project files; unit test compares exact bytes for 7 project paths + full `local/` snapshot.
- **Missing project seeds created** — PASS. not-exists branch precedes project-skip branch; deleted `checkpoints/.gitkeep` restored.
- **No deleting orphans** — PASS. orphans within framework dirs reported, never removed.
- **Dry-run no writes + idempotence** — PASS. dry-run returns before any preflight/apply write path; snapshot (incl. mtimes) unchanged; repeat `update` leaves `.agents` snapshot identical.
- **Guideline external bytes** — PASS. `guideline-writer` now works in `Buffer`s and preserves every byte outside the first complete `<lead-protocol>` block. This is a genuine improvement over the old implementation, which ran `replace(/\n{3,}/g,"\n\n")` across the whole file (user-byte mangling).
- **Static symlink/path type preflight incl guideline & .gitignore before mutations** — PASS. `preflightPath` walks every ancestor (no symlink-follow) for `.agents`, guideline, and `.gitignore` destinations; runs in `planUpdate`, `applyUpdate` (twice, incl. after confirmation), and `preflightScaffold` before writes.
- **Security (secrets/injection/traversal)** — PASS. No secrets in diff. No shell/`exec`/`eval`; child processes in tests use argv arrays, not shells. `safeRelativePath` rejects `..`, absolute, drive-letter, backslash, null-byte, and leading-`local` paths; `applyUpdate` re-validates per file. Traversal reproduction covered by unit test.

## Independent reproduction (temp fixtures, built dist)

1. **Partial-init data loss (original PR26 confirmed defect) — FIXED.** `init --yes`
   over a partial `.agents/` with a custom `PROJECT_RULES.md` now refuses (exit 1),
   custom bytes md5 identical before/after.
2. **Symlink write-through (original PR26 confirmed defect) — FIXED.** `update --yes`
   with `.agents/CORE_RULES.md` symlinked to an outside file refuses via preflight;
   the outside file md5 is unchanged and the link is preserved (not followed, not deleted).

## RED evidence authenticity

Verified `lead-protocol-26-red-01..05` are real `node --test` TAP output. `red-01`
shows the pre-fix `init` actually creating/overwriting a partial install (genuine
`ERR_ASSERTION`), confirming saved RED is actual execution, not imagined.

## Findings (both non-blocking)

- **[Low] Preflight refusal surfaces as an uncaught stack trace.** When a symlink or
  malformed path is detected, `planUpdate`/`preflightPath` throw and the command
  handler does not wrap them, so the user sees a raw Node stack trace. Behavior is
  **safe** (no writes, non-zero exit) and is codified by tests; this is UX polish,
  not a correctness/safety defect.
- **[Nit] Cosmetic message.** `generateGuidelines` prints "created" when
  `writeGuidelines` returns `noop` on an idempotent repeat. No data impact.

## Honored non-goals (disclosed in README, not defects)

No distributed locking, no atomic multi-file rollback, no protection against
concurrent filesystem replacement or hard-link aliases. Static preflight is
explicitly not a lock. Consistent with mission-documented non-goals.

## Attribution

Leonardo Buares credited in CHANGELOG, README, commit `Co-authored-by`, and
decisions, referencing PR #26 / issues #25, #40 and original head
`4000b1479a075dcceb205c6586870cbee8901359`. Confirmed defects (symlink
write-through, partial-init data loss) are preserved and disclosed, not softened.

## Limitations

Review is static + fixture-based on local build at frozen HEAD. No hosted/fork CI
observed. No merge/release/tag/publish/PR/issue-closure performed. Concurrency and
hard-link aliasing untested (documented non-goals). No product code modified.

## FINAL VERDICT

**APPROVED** — model: real Opus 4.8 (`claude-opus-4-8`).

All four executable gates green; every mission scope item verified; both original
confirmed defects independently reproduced as fixed; no secrets/injection/traversal;
attribution intact. The two findings are non-blocking (UX/cosmetic). Merge, release,
and issue closure remain the owner's gate.

Canonical review path: `.agents/checkpoints/2026-09-12T074747_claude_pr26-opus-independent-review.md`
