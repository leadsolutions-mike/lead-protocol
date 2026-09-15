# Checkpoint — Issue18 fresh independent Opus re-review (post-B1 remediation)

> Session: 2026-09-13-0730-claude
> Timestamp: 2026-09-13 07:30 UTC
> Author: [Mike / Claude] (claude-opus-4-8)
> Reviewed HEAD: d5c004fc442580912b5bc2f570cabd860a673939
> Review base: 66995ea13983cdfc5bd98741c52db839e3723aba (exact diff 66995ea..HEAD)

## Verdict

**APPROVED** for exact HEAD d5c004f — 0 blockers; 1 pre-existing non-blocking nit (N1).

This is a fresh, independent local review — an explicit serial continuation after the
prior mike/claude reviewer (checkpoint 071320) and the Codex B1 remediation (072142) and
Hermes consistency (072430) workers all exited. I did not assume the implementation or the
remediation correct: I inspected the full diff, re-ran every required gate myself, and
independently extracted and executed the shipped recipe against my own fixtures (not the
project's test file). No product/test/doc edits, no commit, no push/PR/CI/merge/release/tag/
npm/issue/JOURNAL action performed.

## Target integrity

- HEAD = d5c004f (matches brief). Branch feature-18-knowledge-map, 5 commits ahead of origin/main, 0 behind.
- Commits base..HEAD: 6daa906 scope, 934c7cd feat, 3e5a354 review evidence, e896e13 B1 fix, d5c004f reconcile.
- Only dirty tracked file at entry: `.agents/sessions/active_sessions.md` (Hermes registry row, uncommitted — expected peer coordination, preserved; I appended then removed my own row at close).
- `git diff --check 66995ea..HEAD`: clean.
- Worker(s) exited; static target — safe to review. 27 files changed vs base (product diff + committed coordination checkpoints + decisions.jsonl).

## Gate 1 — Spec completeness (vs 2026-09-13T065200_hermes_issue18-approved-scope.md)

All eight approved contract items delivered:

1. Generic root INDEX, pointer-only — **PASS.** 3 rows; all targets resolve (`### Project knowledge discovery` in PROTOCOL_RULES.md, `## §J1`, `## §J6` in PROJECT_RULES.md); `.agents/local/**` only in prohibition prose; §P6/§P7 carve-out present; no actor-local/private/issue/name rows.
2. Kernel P-Access discovery contract + CORE/AGENTS/CLAUDE/kernel pointers, J6 + P-Access fallback — **PASS.** All four surfaces carry "Before answering a project question…" with INDEX/§J6/§P-Access on-demand fallback.
3. Missing-map fallback + bounded literal search recipes, **complete multiline entry retrieval**, explicit limitations never absolute absence — **PASS (prior BLOCKER B1 now resolved; see below).**
4. Same-session maintenance in §P3 close / §P4 / §J5; no ninth handoff field — **PASS.** handoff.schema.json still exactly 8 checklist items (`additionalProperties:false`); maintenance added as prose/quality-check only.
5. Preflight lstat + exclusive create; preserve regular byte-for-byte; refuse symlink/non-regular — **PASS** (directly reproduced via actual runtime, below).
6. Bundle exact seed; SHA-256 pin; row/target byte checks; clean packaged state — **PASS** (`test:pack` runs actual tarball; sha256 `6bfeca63…71d5` matches shipped + installed seed; sync-templates excludes `local`/checkpoints content).
7. Manual adoption docs; v2.1.5 commands unchanged; guideline normalization untouched — **PASS** (adoption example executed under real pwsh; init.ts leaves guideline-writer behavior unchanged; README/cli-README flag feature as unreleased, v2.1.5 lacks seed).
8. Rule minor bumps + manifest kernel consistency; retain product/package 2.1.5 — **PASS.** kernel 2.1.1 (manifest + PROTOCOL_RULES agree), CORE 1.6.0, PROJECT_RULES 2.1.0; CHANGELOG Unreleased corrected to Kernel 2.1.1 (Hermes 072430); `check-release-metadata.mjs 2.1.5` consistent, exit 0.

## Gate 2 — Safety / correctness / quality

### B1 (prior sole blocker) — RESOLVED and independently verified

`entry_page` in `.agents/PROTOCOL_RULES.md` (`<!-- knowledge-search-python -->` block) now walks
from file start tracking backtick/tilde fence state and classifies column-zero `## ` boundaries
only outside fences. I extracted the *shipped* recipe (not the test file) and ran six independent
fixtures — all PASS:

| Probe | Result |
|---|---|
| Original B1 fixture (fenced `## ` inside entry) → complete entry incl. final rationale, correct `next` | PASS |
| Marker length: 3-backtick line does NOT close a 4-backtick fence (stays fenced) | PASS |
| Unclosed fence anywhere → `ValueError("Unterminated fence…")`, **even when requesting an earlier entry** | PASS |
| Narrow convention: nested `###`, indented `  ## `, `##\ttab` all stay inside entry (not boundaries) | PASS |
| Backtick opener with backtick in info text is NOT a fence (CommonMark) | PASS |
| Tilde opener with backtick in info text IS a fence | PASS |

The fix is conservative and honestly scoped: it never emits `next:None` on an incomplete entry;
unclosed/unsupported input refuses with an explicit "completeness is unknown" limitation rather
than a false-complete signal — the exact P-Access failure mode. This closes the same fence-blind
marker-matching class recorded in decisions.jsonl 2026-09-12.

### N2 (prior coverage gap) — RESOLVED

`test_index_recipes.py` now carries the fenced regression: both markers, lengths 3/4/7, indent 0/1/3,
hits before/inside/after fences, adjacent entries, 500-line body paged at 80 chars, valid/invalid
closers (short/mismatch/text-suffixed/four-space), unclosed fences at multiple hit positions,
non-openers, and preamble/heading boundaries. Directly executed: focused 56 passed; full 152 passed.

### Init seeding safety (`index-seed.ts` / `init.ts`)

Preflight of source (read now → unreadable required source refuses) and destination (lstat rejects
live+dangling symlinks, directories, non-regular) runs before all init writes. Exclusive `wx` create;
EEXIST → re-lstat: regular ⇒ "preserved" (never overwritten), vanished ⇒ throw, unsupported racing
type ⇒ throw. Sound within the (correctly non-atomic, per-scope) init boundary. Directly reproduced
via actual `cli/dist/index.js init --yes` into a dir with a dangling-symlink INDEX.md: refused before
any write; no `.agents/` created, pre-existing AGENTS.md and the symlink intact, exit 1.

### Nit N1 (non-blocking, pre-existing) — preflight refusal is a raw stack trace

`init` surfaces preflight refusals as an uncaught `Error` with a full Node stack dump rather than a
clean `ui.error` + `exit(1)`. Behavior is safe (aborts before any mutation — directly verified). The
Codex remediation deliberately left N1 unchanged and it is out of the approved minimal scope; recorded
as a non-blocking cosmetic nit, not a blocker.

## Execution evidence (all run by this reviewer, this checkout, sequentially — no concurrent suites)

Host: Linux, Node v22.22.0, uv 0.10.6 isolated Python, pwsh 7.6.5 (`/snap/bin/pwsh`).

| Gate | Command | Result |
|---|---|---|
| Full pytest | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/ -q` | **152 passed** |
| Focused new pytest | `… pytest test_knowledge_map_contract.py test_index_recipes.py test_index_adoption.py -q` | **56 passed** |
| Release metadata | `node cli/scripts/check-release-metadata.mjs 2.1.5` | **consistent at 2.1.5**, exit 0 |
| npm test (build + node --test) | `npm --prefix cli test` | **58 passed, 0 fail/skip**, exit 0 |
| Typecheck | `npm --prefix cli run typecheck` | **PASS**, exit 0 |
| Pack (actual tarball install) | `npm --prefix cli run test:pack` | **PASS** — exact seed sha256, byte-equal install, packed init-index fixtures, legacy no-INDEX two-session lifecycle |
| Diff check | `git diff --check 66995ea..HEAD` | **clean**, exit 0 |
| Seed sha256 | `sha256sum INDEX.md` | `6bfeca63…71d5` — matches test:pack pin |
| B1 independent repro | extracted shipped `entry_page` vs 6 fixtures | all PASS (table above) |
| Manual adoption (real pwsh) | extracted `<!-- index-adoption-python -->` via `pwsh … python3 …` | create ✓ / repeat-preserve byte-for-byte ✓ / dangling-symlink refuse nonzero ✓ |
| Highest-risk safety repro | actual `cli/dist/index.js init --yes` into dir with dangling-symlink INDEX.md | refused before any write; no `.agents/`, AGENTS.md + symlink intact, exit 1 |
| State validator (pre-repair) | `uv run … validate_state.py` | exit 1 — parse error on **my own** mike/claude handoff ("missing field: Blockers/Context"); Hermes + Codex handoffs pass |

The 152/56 pytest counts are consistent with Codex 072142 (151) plus Hermes's added
consistency test (072430). Node/pack counts match the implementer and prior review.

## State hygiene (this session)

The prior mike/claude reviewer left a malformed OWN handoff (timestamp `07:13` without date;
status `review-complete` outside the STABLE/BLOCKED/IN_PROGRESS enum; Blockers/Context and Open
Threads written as `## ` section headers instead of the canonical inline `**Field:**` form).
Codex 072142 and Hermes 072430 correctly preserved it as a peer-owned defect rather than editing
another pair's state. As the fresh mike/claude reviewer I repaired **only my own pair state** to
the exact P3 canonical format (inline `**Field:**` fields, full `YYYY-MM-DD HH:MM` timestamp,
STABLE status, eight canonical checklist labels). Hermes and Codex handoffs/rows untouched. I
appended my own registry row at open and removed it at close, leaving Hermes's pre-existing dirty
row. The full state validator was re-run **after** the handoff repair and row removal — see the
handoff/activity for the post-close green result.

## Limitations of this review (not defects)

- No native Windows/macOS filesystem, no hosted CI, no Node 18/20 pack runtime, no published-release
  verification. PowerShell exercise was Linux pwsh 7.6.5, not native Windows. Hosted CI (Node 18/20,
  3 OSes) is a separate later gate — not claimed here.
- Baseline `npm audit` low-severity esbuild dev-server advisory (GHSA-g7r4-m6w7-qqqr) predates this
  change; not counted as a new product defect.
- Deterministic tests demonstrate artifact/runtime/example behavior only — not future-LLM rule
  compliance, search exhaustiveness, or pointer-maintenance discipline.
- Private-row inspection is bounded (seed rows, targets, generic-row regex), not a universal scanner.
  Within that bound: no private/actor-local rows in the shipped seed.

## Disposition

**APPROVED** at exact HEAD d5c004f. No commit made; Hermes commits review evidence after inspection.
JOURNAL promotion remains an explicit owner gate — not performed, not inferred; the bounded review
brief excluded it and I invent no owner statement. Peer (Hermes, Codex) pair state and the Hermes
registry row are preserved; only my own row was added at open and removed at close.
