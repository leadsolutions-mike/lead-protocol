# Checkpoint — Independent Opus review of PR50 CI fixture delta: APPROVED

> Session: 2026-09-12-0721-claude (owner-authorized bounded CI follow-up)
> Timestamp: 2026-09-12 08:16:03 UTC
> Author: [Mike / Claude]
> Branch: mike/pr26-safe-update
> Reviewed exact HEAD: `7b7067ffdebc5e01a73c864036fa39d711ef369d`
> Delta reviewed: `d1e3ab8..HEAD` (fix commit `a08614e6c9f93033c749b1b850a6008774c8d557`)
> Model: real Opus 4.8 (`claude-opus-4-8`)
> Verdict: **APPROVED**

## Scope of this review

Bounded, scoped re-review of the CI-only delta on top of the already-APPROVED
product base `26b60fa` (product `296d10a`). The delta introduces **no product
code change**: `git diff --name-only d1e3ab8..HEAD` = one test fixture
(`cli/test/updater.test.mjs`, +4/-2), two append-only `decisions.jsonl` rows,
and the Codex remediation checkpoint. `cli/src` is byte-identical to the prior
approval; the whole-PR src scope (`main..HEAD`) remains the same 7 approved
files (init, update, index, guideline-writer, safe-path, scaffold, updater).

## Fix under review

`fixture()` now allocates from `mkdtempSync(path.join(realpathSync(tmpdir()), 'lp-update-'))`
instead of lexical `tmpdir()`, and imports `realpathSync`. Two explanatory
comment lines added. Nothing else in the test file changed.

Root cause (confirmed against hosted `/home/mmilanez/lead-protocol-26-ci-failure.log`,
run 34682367348, macOS Node 18): three **direct-library** tests call
`planUpdate`/`applyUpdate` in-process on the fixture root. On macOS `tmpdir()`
carries the `/var`→`/private/var` alias; `preflightPath()` resolves lexically
(`path.resolve`, not realpath) and `lstat`s every ancestor, correctly rejecting
the `/var` symlink with `Unsafe symbolic link: /var`. Spawned-CLI tests are
unaffected because the child resolves a canonical `process.cwd()`. Failures
were tests 34 (manifest refresh), 67 (injected traversal/late symlinks), 70
(template actor seed exclusion) — 81 pass / 3 fail / 84.

The fix canonicalizes **only the allocation base, before any fixture content
exists**, so the in-process preflight sees a symlink-free ancestor chain while
every fixture-internal hazard (created afterward) is preserved.

## Hazard preservation — verified by reading the test bodies

Every intra-fixture symlink/malformed-path hazard is created *after* `fixture()`
returns, so `realpathSync(tmpdir())` cannot neutralize it:
- CLI preflight matrix (lines 120–149): `symlinkSync(external, dest)` per hazard;
  asserts nonzero refusal + whole-fixture snapshot equality (bytes, targets,
  modes, mtimes).
- Late-symlink adversarial (line 188): target `PROTOCOL_RULES.md` replaced with
  a real symlink *after* planning; rejection asserted before earlier writes.
- Linked actor-local (line 164) and broken template-local link (line 221):
  intact.
No fixture-internal path is canonicalized. All assertions, test registration,
and hazard construction are byte-identical to base.

## Independent execution evidence (this reviewer, Node v22.22.0, Linux)

| Gate | Command | Result |
|---|---|---|
| RED reproduction | pre-fix fixture copy, symlink TMPDIR, `node --test test/updater.test` | 41 pass / **3 fail** — exactly tests "manifest refresh", "injected traversal/late symlinks", "template actor seeds", each `Unsafe symbolic link: <symlink-tmpdir>` |
| GREEN reproduction | HEAD fixture, same symlink TMPDIR | **44 pass / 0 fail / 0 skipped** |
| Full tests | `npm test` | exit 0 — **84/84, 0 skipped** |
| Types | `npm run typecheck` | exit 0 |
| Package | `npm run test:pack` | exit 0 — **44/44, 0 skipped**, installed two-session resume lifecycle |
| Metadata | `node scripts/check-release-metadata.mjs 2.1.5` | exit 0 — all manifests agree on 2.1.5 |

RED/GREEN independently reproduce the Codex `red.log`/`green.log` artifacts
(41/3 → 44/44) using a fresh symlinked TMPDIR emulating the macOS alias. Linux
reproduction is not a claim of native macOS execution; native macOS rerun is
hosted CI work owned by Hermes.

## Findings

No new findings. No skipped tests, no product weakening, no assertion
softening. Version remains 2.1.5. No secrets/injection/traversal introduced.
Leonardo Buares attribution and the two prior non-blocking findings (uncaught
stack-trace UX on preflight refusal; cosmetic noop message) are unaffected and
out of scope for this CI-only delta.

## Verdict

**APPROVED** — the delta is a minimal, correct, test-only CI remediation that
makes the direct-library updater tests pass on symlinked-tmpdir platforms
without altering product behavior, hazard coverage, or test intent.

Merge, release/tag/npm publish, PR/issue closure, and push remain the owner
gate. Hosted exact-head macOS CI readback remains owned by Hermes.
