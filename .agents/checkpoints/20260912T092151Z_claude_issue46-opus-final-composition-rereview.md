# Checkpoint — Issue46 explicit-evidence composition — independent Opus FINAL re-review

> Timestamp: 2026-09-12T09:21:51Z
> Agent: [Mike / Claude]
> Actor: mike
> Reviewer model (real): Claude Opus 4.8 (claude-opus-4-8)
> Frozen HEAD: b8c57ed09071804a2fa1d06c67646d1411c36a9e
> Base origin/main: 66995ea13983cdfc5bd98741c52db839e3723aba
> Delta audited: 38bb30f..HEAD (7351011 RED reproduce → 597c9cd fix → b8c57ed docs)
> Scope: review-only, no product edits. Independent of any unmerged PR.

## Verdict: APPROVED

The writer-side silent-evidence-loss defect that Hermes escalated
(`2026-09-12T091000_hermes_issue46-explicit-evidence-composition.md`) is remediated. This closes the
gap left by my prior review's non-blocking observation: an unclosed/whitespace-shifted legacy fence
could hide or duplicate an appended `## Execution Evidence` section, and the old `createCheckpoint`
appended explicit evidence **without verifying** the final serialized artifact was parser-recoverable —
so a caller-supplied evidence record could be persisted yet parse back as `undefined`. The fix refuses
such compositions before any mutation. All executable gates are green at the frozen HEAD. This records
review, not approval-to-ship; owner retains the release/merge gate.

## What changed (delta 38bb30f..HEAD), verified by source inspection

- `cli/src/lib/session-lifecycle.ts` (+17/-1): the checkpoint preparation body is extracted into a new
  **side-effect-free** `prepareCheckpoint(opts)` (only `findAgentsDir`, `parseEvidenceMarkdown`,
  `validateEvidence`, `resolvePair`, read-only `activeReceipt`, and string assembly — no writes). When
  `evidence !== undefined` it re-parses the *final* `content` and throws
  `"Explicit execution evidence is not recoverable from the serialized checkpoint"` unless
  `renderEvidenceMarkdown(recovered) === renderEvidenceMarkdown(evidence)` (canonical round-trip
  equality, order-insensitive). `createCheckpointUnlocked` now consumes `prepareCheckpoint`; the
  exported `createCheckpoint` runs `prepareCheckpoint(opts)` **before** `guarded()` so an unsafe
  composition is refused before the transaction guard/lock is created, then prepares again under the
  guard to avoid reusing pre-lock reads across lock acquisition.
- `cli/test/session-lifecycle.test.mjs` (+36): five composition fixtures (open-backtick, open-tilde,
  trim-backtick, trim-tilde, trim-exposed-duplicate) assert refusal, `/evidence/i` message, unchanged
  `stateSnapshot`, that a **pre-existing** transaction guard does not mask the error and survives, and
  that the no-evidence legacy path writes byte-exact bytes.
- `cli/scripts/test-pack.mjs` (+25): the same five cases exercised against the **packed + installed**
  tarball CLI — refusal with non-zero exit, unchanged installed project state, and byte-exact legacy
  omission when evidence is omitted.
- `.agents/decisions.jsonl` (+1, `[Mike / Codex]`) and the codex remediation checkpoint. No product
  source beyond the writer, its tests, and `test-pack.mjs`.

## Executable gates (run serially at frozen HEAD b8c57ed)

| Gate | Result |
|---|---|
| `cli/ npm test` | PASS 66/66 |
| `cli/ npm run typecheck` | PASS (exit 0) |
| `cli/ npm run test:pack` | PASS — incl. "unsafe explicit composition refused without mutation; legacy omission bytes preserved" + installed evidence roundtrip |
| `node scripts/check-release-metadata.mjs 2.1.5` | PASS (product 2.1.5, kernel 2.1.0 unchanged) |
| root `uv … pytest .agents/scripts/ -q` | PASS 112/112 |
| root `validate_state.py` | PASS (2 files) |

Logs: `/home/mmilanez/lead-protocol-46-opus-final-{cli-test,cli-typecheck,cli-testpack,cli-metadata,python,state,verdict}.log`.
Earlier review logs left intact (`opus-final-` prefix, no overwrite).

## Mission verification points

1. **Installed writer rejects unrecoverable explicit evidence before state changes** — CONFIRMED. The
   authoritative acceptance test is the tarball path in `test-pack.mjs` (non-zero exit, `/evidence/i`
   stderr, unchanged installed state), not the parser-only probe. Source confirms refusal precedes the
   guard: `prepareCheckpoint` is pure, so the pre-`guarded()` call cannot mutate.
2. **No-evidence legacy bytes unchanged** — CONFIRMED (byte-exact omission in both JS and tarball).
3. **Normal explicit roundtrip intact** — CONFIRMED (installed evidence roundtrip green).
4. **Race/guard invariant intact** — CONFIRMED. The pre-guard refusal creates no `.lifecycle-transaction`
   guard; a pre-existing guard is neither consumed nor removed by the refusal; preparation repeats under
   the lock. Full lifecycle/compensation suite still 66/66.
5. **Parser-only Hermes open-fence probe** — remains intentionally non-recoverable (exit 1) and is NOT
   the writer acceptance test. Extracting the hidden record would weaken fake-example suppression; the
   writer *refusal* is the correct remediation. I did not attempt to make it green.

## Acceptance criteria (issue #46) — carry forward

AC1–AC5 remain **MET** exactly as recorded in my prior APPROVED review
(`20260912T091006Z_claude_issue46-opus-rereview.md`). This delta touches no parser, schema, kernel,
version, `AGENTS_MAP`, or config — so AC1–AC4 are unchanged; **AC5 (backward compatibility) is
strengthened**: legacy no-evidence bodies are preserved byte-for-byte while explicit compositions that
would be silently lost are now refused rather than corrupted.

## Prior review status

The full APPROVED review `20260912T091006Z` remains applicable **except** its non-blocking unclosed-fence
observation, which Hermes correctly escalated to a writer defect and this delta remediates. The earlier
CHANGES-REQUESTED and exact-diff review checkpoints stand byte-for-byte as the audit trail.

## Attribution

The three delta commits are git-authored by `leadsolutions-mike` (env `actor=mike`), committer
`leadsolutions-mike`, but carry the generic `[Codex]` message prefix; the `decisions.jsonl` entry is
signed `[Mike / Codex]`. Recorded accurately here per owner instruction; **no history rewrite required
or performed**.

## Exclusions

Review-only, no product edits. No push/PR/merge/release/tag/publish/issue-closure. Package 2.1.5 and
kernel 2.1.0 unchanged. No profiles/config/credentials/`AGENTS_MAP` touched. JOURNAL promotion
owner-deferred. RED states not re-executed (commit ordering verified: RED `7351011` precedes fix
`597c9cd`); reproduction confined to temp fixtures and the packed tarball. Owner retains the merge gate.

— Claude Opus 4.8 as [Mike / Claude] — APPROVED — SHA b8c57ed09071804a2fa1d06c67646d1411c36a9e.
