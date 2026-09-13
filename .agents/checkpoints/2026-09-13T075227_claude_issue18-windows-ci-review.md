# Checkpoint — Issue18 Windows CI remediation independent review
> Author: [Mike / Claude] (independent read-only reviewer, claude-opus-4-8)
> Session: 2026-09-13-0752-claude
> Timestamp: 2026-09-13 07:52 UTC
> Reviewed HEAD: adb537556f41395973039a1cfd77d64826704dfe
> Base: 87a622ac573d1d5cdad40cf093d0bb4587795a89 (delta = single commit adb5375)
> Branch: feature-18-knowledge-map

## Scope and authorization
Read-only product review of the bounded Windows CI fix. Owner already authorized
issue18 via fork PR + hosted CI; prior whole-scope Opus approval of d5c004f does
NOT cover this delta (it followed a real native Windows RED). Worker process-exit
is an orchestrator observation, not a new owner message. No product edit, push,
API write, merge, release, dependency upgrade, or JOURNAL promotion performed.
J8 pristine; AGENTS_MAP/schemas/peer state untouched.

## Delta reviewed
`cli/src/lib/index-seed.ts` (+4), `cli/test/init-index.test.mjs` (+81/-9),
`.agents/LESSONS.md` (+7), `.agents/decisions.jsonl` (+2), canonical checkpoint (+115).

## Root cause & fix (confirmed correct)
Original native RED: aggregate race test hit `assert.throws` "Missing expected
exception" — an unsupported racing entry (dangling symlink) did not refuse because
`writeFileSync(dest,{flag:"wx"})` on Windows follows the link and creates its
referent; the only type check sat behind EEXIST. Fix adds one pre-write guard
(`if (isRegularOrMissing(plan.destination)) return "preserved"`): a racing
regular map → preserved; an unsupported entry → throws (refusal) before any write;
a missing dest → false → still `wx`-created. EEXIST re-inspection retained for the
genuine check→open TOCTOU race (regular→preserved, else changed-during-creation).
`wx`/EEXIST semantics and byte-for-byte regular-map preservation preserved.

## Independent verification (this HEAD, real FS)
Linux, Node v22.22.0, Python 3.11.15, npm 11.8.0, uv 0.10.6. Serial.
| Gate | Command | Result |
|---|---|---|
| Focused | `node --test --test-name-pattern='exclusive creation\|link-following exclusive\|racing dangling\|write boundary' cli/test/init-index.test.mjs` | 6 pass, 0 fail, 0 skip |
| Full Node | `npm --prefix cli test` | 63 pass, 0 fail, 0 skip; exit 0 |
| Typecheck | `npm --prefix cli run typecheck` | exit 0 |
| Actual package | `npm --prefix cli run test:pack` | 23 pass (17 installed-runtime CLI-spawn + 6 source-helper), 0 fail/skip; exit 0 |
| Full Python | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/ -q` | 152 passed |
| Metadata | `node cli/scripts/check-release-metadata.mjs 2.1.5` | agree on 2.1.5; exit 0 |
| Diff | `git diff --check` | exit 0 |
| State | `validate_state.py` | OK — 4 files |

## Test integrity
No removed/newly-skipped tests; 58→63 = old aggregate split into 4 per-kind named
race tests + 2 adapter tests. `indexHelper` loads the ACTUAL transpiled source via
an injected `require('node:fs')`, no process-global mocks. Race tests snapshot the
whole `dir` (catches external referent creation); preflight tests assert the
dangling referent `absent` stays ENOENT. The Windows referent-create path (test 22)
is a **deterministic Linux model, explicitly labelled "not native Windows evidence"**
in code, test, and checkpoint — honestly distinguished from installed-runtime cases.

## Risks / limitations (non-blocking)
- Native Windows behavior NOT proven from Linux; hosted rerun remains PENDING until
  Hermes pushes the reviewed fix. This approval does not claim native green.
- Residual lstat→open TOCTOU window persists by design (documented in code & tests).
- Helper name `isRegularOrMissing` is misleading (returns false for missing, throws
  for unsupported); behavior correct — pure readability nit.
- N1 (raw stack trace on init preflight refusal) pre-existing, out of scope, unchanged.

## Verdict
**APPROVED** — 0 blockers. Local fix is correct, minimal, honestly evidenced, and
does not weaken `wx`/EEXIST or preservation guarantees. Approval is **conditional on
a separate native hosted Windows CI gate** (Codex's preserved RED job re-run green
after Hermes pushes this exact SHA). Hermes commits review evidence; no commit here.
