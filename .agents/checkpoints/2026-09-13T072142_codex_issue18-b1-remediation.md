# Checkpoint — Issue18 bounded B1 remediation
> Session: 2026-09-13-0718-codex
> Timestamp: 2026-09-13 07:21 UTC
> Author: [Mike / Codex]
> Base: 3e5a354 (implementation 934c7cd plus review evidence)
> Remediation commit: the commit containing this checkpoint; exact SHA returned at session close.

## Scope and disposition
Owner authorized end-to-end B1 correction, including N2 regression coverage, as an
explicit serial continuation after the prior mike/codex worker exited. Own pair
reopened and logged under direct kernel state. J8 is pristine distribution source;
no modules inferred active, no AGENTS_MAP edits. Hermes and Claude state/rows are
preserved. This checkpoint records implementation evidence, not self-approval;
fresh independent Opus rereview of the containing commit remains required.

Sources: `.agents/checkpoints/2026-09-13T071320_claude_issue18-review.md` and
`.agents/checkpoints/2026-09-13T070800_hermes_issue18-fenced-entry-repro.md`.
Both show the old recipe dropping the final rationale at a fenced heading with
`next=None`. Prior decisions and review evidence remain unchanged.

## Correction and supported limits
Only the P-Access example, its tests, kernel rule patch version and manifest change.
The scan walks from file start to classify real column-zero `## ` boundaries outside
backtick/tilde fences. Same-marker closers require at least the opener length and
only trailing spaces/tabs; opener/closer indentation is zero to three ASCII spaces.
Backtick info text cannot contain backticks; tilde info can. An unclosed fence
anywhere in the selected file raises ValueError before emitting any chunk, even
when the requested entry precedes it. This conservative refusal requires explicit
range inspection and reporting unknown completeness.

Supported convention is intentionally narrow, not a general Markdown parser.
Indented/tab-separated/Setext headings, block-quote/list container fences and HTML
block semantics are unsupported and are not automatically validated/refused.
Callers must establish the documented log convention before using the example.
Preamble is a separate range; nested headings remain in an entry. The example
still reads the selected file internally, rescans for every chunk, and emits bounded
character chunks. Stable files/contents are required during continuation. No search
subsystem, Markdown library, crawler or exhaustive-search guarantee is introduced.
JSONL physical-line retrieval and search_page are unchanged. N1 raw init error
stack is deliberately unchanged. Product stays 2.1.5; kernel/manifest become 2.1.1.

## Strict TDD evidence
Tests were appended and executed BEFORE any recipe/manifest edit. Existing tests
were neither weakened nor replaced. The tests extract and execute the actual
canonical documented Python block.

RED command: `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_index_recipes.py -q`

Observed RED: **32 failed, 10 passed in 0.58s**. Representative failure:
`test_fenced_headings_preserve_complete_entry[0-3-backtick]` expected the actual
entry through its final rationale, but received only the heading, needle and opening
fence. Unterminated cases failed because ValueError was not raised. The shell wrapper
tailed the saved output and itself exited 0; the pytest failure summary, not that
wrapper exit, is the RED evidence. Local full output: `/tmp/issue18-b1-red.log`.

After the recipe edit, the same focused command: **42 passed in 4.11s**, exit 0.
38 added cases cover both markers, lengths 3/4/7, indentation 0/1/3, heading/needle
hits before/inside/after fences, previous/next entries, 500 body lines paged at 80
characters, equal/longer closers, short/mismatched/text-suffixed/four-space closers,
unclosed fences at multiple hit positions, non-openers and exact heading/preamble
boundaries. Additional isolated Python probes passed for two-space fences, tilde
info containing a backtick, and refusal of an earlier entry before an unclosed later
fence. Initial plain-Python probe could not import pytest; rerun under uv passed.

## Serial validation evidence
All gates executed serially on Linux, Node v22.22.0; no concurrent test suites.

| Gate | Command | Observed result |
|---|---|---|
| Full isolated pytest | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/ -q` | 151 passed in 5.54s; exit 0 |
| Node/npm | `npm --prefix cli test` | build + 58 passed, 0 failed/skipped; exit 0 |
| Typecheck | `npm --prefix cli run typecheck` | exit 0 |
| Actual tarball | `npm --prefix cli run test:pack` | PASS packed INDEX fixtures and legacy two-session lifecycle; exit 0 |
| Metadata | `node cli/scripts/check-release-metadata.mjs 2.1.5` | package/lock/README/CHANGELOG/kernel/source manifest/bundle agree; exit 0 |
| Full workspace state | `uv run --with pytest --with jsonschema python .agents/scripts/validate_state.py` | exit 1: Claude local handoff missing Blockers/Context |
| Authorized state subset | same validator with `.agents/decisions.jsonl .agents/local/mike/codex/handoff.md` | OK, 2 files; exit 0 |
| Diff | `git diff --check` | clean; exit 0 |

Full state validation is NOT green: the peer-owned Claude handoff parse error is
outside this authorized correction and is preserved, not repaired or concealed.
This differs from the earlier review's successful state gate. Logs for pytest,
Node, typecheck and pack are local `/tmp/issue18-b1-*.log`; their durable result
summaries are above. No native Windows/macOS or hosted CI runs claimed.

## Close and review handoff
No sections/anchors or existing file locations changed. Generic root INDEX and J6
already point to the canonical kernel/checkpoint inventory; no new map row needed.
Only own session row is removed at close; Hermes's pre-existing dirty registry row
is left unstaged. Own handoff/activity are gitignored and remain local. Decisions
are tail-appended. No new separate lesson beyond the already recorded review finding.
No push, PR, release, merge, JOURNAL write or self-approval. Owner explicitly forbids
JOURNAL for this contribution, superseding the routine promotion question.
Fresh Opus rereview should inspect the exact containing SHA, fence-boundary and
refusal behavior, the documented unsupported structures and the state-gate exception.
