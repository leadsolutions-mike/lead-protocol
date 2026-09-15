# Checkpoint — Issue46 execution_evidence — independent Opus exact-diff review

> Timestamp: 2026-09-12T08:54:32Z
> Agent: [Mike / Claude]
> Actor: mike
> Reviewer model (real): Claude Opus 4.8 (claude-opus-4-8)
> Frozen HEAD: 71c7b88a8f705b579776571f1f3e4a5439daf289
> Base origin/main: 66995ea13983cdfc5bd98741c52db839e3723aba
> Scope: review-only, no product edits. Independent of unmerged PR50.

## Verdict: CHANGES REQUESTED

One blocking finding (F1). All five acceptance criteria are otherwise substantively met and
every executable gate is green at the frozen HEAD. The blocker is narrow, fails safely (no
state corruption), and has a small localized fix. This checkpoint records review, not approval;
no push/PR/merge/release/tag/publish/issue-closure performed.

## Executable gates (run at frozen HEAD)

| Gate | Result |
|---|---|
| `cli/ npm test` | PASS 48/48 |
| `cli/ npm run typecheck` | PASS (exit 0) |
| `cli/ npm run test:pack` | PASS (packs 2.1.5, installs tarball, evidence roundtrip + invalid-input preservation) |
| `node scripts/check-release-metadata.mjs 2.1.5` | PASS (all manifests agree on 2.1.5) |
| root `uv ... pytest .agents/scripts/` | PASS 112/112 |
| root `validate_state.py` | PASS (3 files) |

Logs: `/home/mmilanez/lead-protocol-46-opus-review-cli-gates.log`,
`-python-gates.log`, `-verdict.log`.

## Acceptance criteria (authoritative from live issue #46)

- **AC1** define + optional-vs-required: **MET** (§P3 "Execution evidence"; "optional globally"; normative "must not be marked complete solely because files were changed"; kernel 2.0.2→2.1.0).
- **AC2** close + checkpoint examples w/ passing/failing/not-run: **MET, exceeds** (two labelled illustrative examples, each covering passed/failed/not_run/blocked; asserted by JS+Python+tarball tests).
- **AC3** passed/failed/not_run/blocked + reason for latter two: **MET** (enum + conditional required reason on checks[] and browser; nonblank `\S`; browser performed/status contradiction rejected).
- **AC4** reproducible commands/CI/artifacts/screenshots/branch/commit: **MET** (schema covers all; docs require durable refs + dirty-tree disclosure via `unresolved`).
- **AC5** backward compatibility: **PARTIALLY MET → see F1**. Plain omission fully compatible (verified even with schema file deleted; handoff schema untouched; validate scope unchanged). The existing `checkpoint` workflow regresses for bodies containing the reserved heading.

## Findings

### F1 — BLOCKING — parser lacks fenced-code awareness (Hermes hypothesis CONFIRMED)
`parseEvidenceMarkdown` (`cli/src/lib/execution-evidence.ts:48-54`), invoked on every checkpoint
body (`session-lifecycle.ts:369`), detects the reserved heading with `/^## Execution Evidence[ \t]*\r?$/gm`,
which matches at column 0 even inside a fenced code example. Reproduced against the compiled dist
parser in an isolated temp fixture:

- **Case A** — legacy body quoting the reserved heading in a fenced example, no JSON envelope after →
  `THROWS "Malformed execution evidence JSON section"` → `createCheckpoint` rejects a body the
  pre-feature CLI accepted. Contradicts the shipped kernel's unqualified "schema-free omission
  behavior remain compatible".
- **Case B** — body quoting the full documented example (heading + fenced json) nested in an outer
  4-backtick fence → **silently parsed as REAL evidence** (fence nesting ignored). Can also spuriously
  trigger the "supply evidence in body OR option, not both" error.
- Control: genuine section parses; plain legacy body returns `undefined` (compatible).

Fails safely (runs before any state mutation → no corruption). Blast radius = bodies that carry the
reserved heading — realistic when documenting this very feature. The project already treats
"fenced examples must not be mistaken for real markers" as in-scope (sibling handoff validation has
dedicated fenced-example tests; see `decisions.jsonl` 2026-09-12 handoff-parser entry); the new parser
lacks the equivalent defense.

**Remediation (either, small):** (a) make `parseEvidenceMarkdown` ignore the heading inside fenced
spans + add Case A/B tests; or (b) narrow the compatibility claim to explicitly reserve the heading
and convert Case B's silent-accept into an explicit error.

### F2 — MINOR — test-coverage gap
The "legacy omission" lifecycle test uses only a plain body; no fixture covers a reserved-heading body.
This gap let F1 ship. Add Case A/B fixtures.

### F3 — TRIVIAL — cosmetic churn
`cli/package.json` description changes a literal em dash to its `—` escape (functionally identical;
release-metadata still green). Unrelated, harmless.

## Adversarial edge cases (verified correct)
Bad JSON, unknown/typo fields, whitespace-only reasons, browser performed/status contradictions,
fence/HTML/line-separator injection (escaped, deterministic, lossless roundtrip), duplicate sections,
both-supplied conflict, missing/broken schema (fails closed only when evidence supplied),
transactional rollback with peer-row preservation and orphan-checkpoint cleanup — all handled.
Structural-validity ≠ execution proof is asserted across schema, kernel, both READMEs, and CLI output.

## TDD / RED artifacts (chronology limitation noted)
Commit ordering confirms test-before-implementation across all four slices. RED/GREEN logs exist;
`red-02-lifecycle.log` SHA-256 `36eab2b8…162f010` matches the codex TDD checkpoint's recorded hash.
Limitation: RED logs live outside the repo; I verified existence + one hash + commit graph but did NOT
re-execute historical RED states, and infer no TDD step beyond what the artifacts substantiate.

## Security (scoped)
No secrets introduced; schema load path not user-controlled; markdown injection mitigated by escaping;
no meaningful DoS surface in local JSON parse. No unrelated hardening recommended.

## Kernel/packaging
kernel 2.1.0 consistent across manifest/PROTOCOL/CORE; product stays 2.1.5; no release/tag/publish; no
invented template/ tree; AGENTS_MAP/config/credentials untouched.

## Exclusions
No push/PR/merge/release/tag/publish/issue-closure. JOURNAL promotion owner-deferred. Historical RED
states not re-run. Python handoff/decisions parser parity intentionally untouched. No user-supplied
evidence commands executed; reproduction in temp fixtures only.

— Claude Opus 4.8 as [Mike / Claude] — CHANGES REQUESTED — SHA 71c7b88.
