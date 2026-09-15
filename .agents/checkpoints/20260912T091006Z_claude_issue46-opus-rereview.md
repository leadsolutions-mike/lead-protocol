# Checkpoint — Issue46 execution_evidence — independent Opus exact-SHA RE-REVIEW

> Timestamp: 2026-09-12T09:10:06Z
> Agent: [Mike / Claude]
> Actor: mike
> Reviewer model (real): Claude Opus 4.8 (claude-opus-4-8)
> Frozen HEAD: c14822a5d37093759c603256527bc64956512a41
> Base origin/main: 66995ea13983cdfc5bd98741c52db839e3723aba
> Delta re-reviewed: 7c39296..HEAD (6f5d8c1 test, c4b3ddc fix, c14822a docs)
> Scope: review-only, no product edits. Independent of unmerged PR50.

## Verdict: APPROVED

The single blocking finding from the prior canonical review (F1, CHANGES REQUESTED at 71c7b88,
preserved byte-for-byte in `20260912T085432Z_claude_issue46-opus-exact-diff-review.md`) is
remediated. All five acceptance criteria are now met, every executable gate is green at the frozen
HEAD, and I reproduced the fix independently against the compiled `dist` parser. This checkpoint
records review, not approval-to-ship; no push/PR/merge/release/tag/publish/issue-closure performed.
Owner retains the release gate.

## Executable gates (run serially at frozen HEAD c14822a)

| Gate | Result |
|---|---|
| `cli/ npm test` | PASS 61/61 |
| `cli/ npm run typecheck` | PASS (exit 0) |
| `cli/ npm run test:pack` | PASS — incl. "schema-free fenced legacy bytes preserved; malformed real section refused without state change" |
| `node scripts/check-release-metadata.mjs 2.1.5` | PASS (product 2.1.5, kernel 2.1.0) |
| root `uv … pytest .agents/scripts/ -q` | PASS 112/112 |
| root `validate_state.py` | PASS (2 files) |
| Hermes standalone fence probe (compiled dist) | PASS both cases (exit 0) — verified myself |
| Opus independent adversarial probe (compiled dist) | PASS 9/9 (exit 0) |

Logs: `/home/mmilanez/lead-protocol-46-opus-rereview-cli-gates.log`,
`-python-gates.log`, `-verdict.log`. Earlier RED/review logs left intact (no overwrite).

## Finding disposition (carried forward from prior review)

### F1 — BLOCKING (prior) → RESOLVED
`parseEvidenceMarkdown` (`cli/src/lib/execution-evidence.ts:48-75`) now locates the reserved
`## Execution Evidence` heading only **outside** fenced spans. The replacement is a deterministic
CommonMark-style line scanner: it tracks the active fence marker (`` ` `` vs `~`) and length,
honours ≤3 leading spaces, opens a backtick fence only when the info string has no backtick, closes
only on a same-marker fence of ≥ opening length with a whitespace-only suffix, and normalises CRLF.
- **Case A** (legacy body quoting the reserved heading inside a fenced example, no JSON envelope) no
  longer throws → returns `undefined` (schema-free omission compatibility restored).
- **Case B** (a documented example — heading + fenced json — nested in an outer longer fence) is no
  longer silently parsed as real evidence → returns `undefined`.
Verified against the **compiled `dist`** parser (not only source) via the Hermes probe and my own
9-case adversarial fixture, plus the committed unit/lifecycle/tarball tests. Still fails safe (runs
before any state mutation).

### F2 — MINOR test-coverage (prior) → RESOLVED
New fixtures in `cli/test/execution-evidence.test.mjs` and `cli/test/session-lifecycle.test.mjs`
cover Case A/B, backtick and tilde fences, LF and CRLF, shorter/longer nested fences, unclosed
fences, invalid backtick openers, duplicate and malformed real sections. `cli/scripts/test-pack.mjs`
adds an installed-tarball check that preserves exact legacy bytes with the schema deleted and
refuses a malformed real section with a full `.agents` state snapshot proving no mutation.

### F3 — TRIVIAL em-dash churn (prior) → RESOLVED
`cli/package.json` description restored to the literal em dash matching main; release-metadata green.

## Acceptance criteria (authoritative from live issue #46)

- **AC1** define + optional-vs-required normative completion rule — **MET** (unchanged since 71c7b88).
- **AC2** close + checkpoint examples covering passed/failed/not_run/blocked — **MET** (both labelled
  illustrative examples validate against the shipped schema; asserted JS + Python + tarball).
- **AC3** four statuses + nonblank reason for `not_run`/`blocked`; browser `performed`↔status guard —
  **MET** (schema `execution-evidence.schema.json` unchanged: enum + conditional `reason`; browser
  `performed:false` ⇒ only `not_run`/`blocked`, `performed:true` ⇒ only `passed`/`failed`;
  contradictions rejected).
- **AC4** reproducible command/cwd/runtime/CI/artifact/screenshot/branch/commit — **MET** (schema
  fields present; docs require durable refs + dirty-tree disclosure via `unresolved`).
- **AC5** backward compatibility — **MET** (was PARTIAL; F1 remediation closes the regression for
  legacy bodies carrying the reserved heading; plain omission remains compatible, handoff schema
  untouched, `validate`/`validate_state.py` scope unchanged).

## Adversarial edge cases (independently verified at HEAD)
Case A/B, genuine section parses, genuine-after-quoted-example, two-genuine → `Duplicate`, closing
fence with an info string does not close, tilde fence not closed by a backtick fence, CRLF genuine,
malformed real section after a quoted example → `Malformed` (fails safe, no silent accept), installed
tarball refuses malformed real section with zero state change. All pass.

## Observation (non-blocking)
An **unclosed** fence in a legacy body suppresses a genuine trailing section (returns `undefined` =
treated as no evidence). This is CommonMark-consistent (an unclosed fence runs to EOF) and fails safe
(evidence is optional; no corruption). Not a defect; recorded for completeness.

## TDD / chronology
Tests committed first (`6f5d8c1`) then scanner + em-dash (`c4b3ddc`); docs (`c14822a`). RED→GREEN
recorded in the codex remediation checkpoint with log SHA-256 hashes. Limitation: RED logs live
outside the repo; I confirmed commit ordering and re-ran the current GREEN state, and infer no TDD
step beyond what the artifacts substantiate.

## Security (scoped)
No secrets introduced; schema load path not user-controlled; markdown injection still escaped in the
renderer; the new scanner is a bounded single-pass line walk with no meaningful DoS surface. No
unrelated hardening recommended.

## Kernel / packaging
kernel 2.1.0 consistent across manifest/PROTOCOL/CORE; product stays 2.1.5; no release/tag/publish;
no invented `template/` tree; AGENTS_MAP/config/credentials/profiles untouched. Product delta is
confined to the parser, its tests, `test-pack.mjs`, and the `package.json` description.

## Exclusions
No push/PR/merge/release/tag/publish/issue-closure. JOURNAL promotion owner-deferred. Historical RED
states not re-executed. Python handoff/decisions parser parity intentionally untouched (does not
consume this evidence). No user-supplied evidence commands executed; reproduction in temp fixtures
only; no init/update in the repository.

— Claude Opus 4.8 as [Mike / Claude] — APPROVED — SHA c14822a.
