# Checkpoint — Issue18 independent Opus review

> Session: 2026-09-13-0713-claude
> Timestamp: 2026-09-13 07:13 UTC
> Author: [Mike / Claude] (claude-opus-4-8)
> Reviewed HEAD: 934c7cd865f219ea96d207057b1fff8035111592
> Review base: 66995ea13983cdfc5bd98741c52db839e3723aba (exact diff 66995ea..HEAD)

## Verdict

**CHANGES REQUESTED** for exact HEAD 934c7cd — 1 blocker, 2 non-blocking nits.

This is an independent local review. I did not assume the implementation correct;
I inspected the exact diff, ran the required gates myself, and directly reproduced
the highest-risk fixtures (both the safety path and the defect). No product/test/
doc edits, no commit, no remote/PR/CI/release/JOURNAL action was performed.

## Target integrity

- HEAD = 934c7cd (matches brief). Branch feature-18-knowledge-map, 2 commits ahead of origin/main.
- Only dirty tracked file: `.agents/sessions/active_sessions.md` (Hermes registry row; +my own row appended for this session). Not product dirt.
- Untracked: `.agents/checkpoints/2026-09-13T070800_hermes_issue18-fenced-entry-repro.md` (peer coordination artifact, not part of reviewed HEAD).
- `git diff --check 66995ea..HEAD`: clean.
- 23 changed files, matching the implementer manifest. Worker exited; static target — safe to review.

## Gate 1 — Spec completeness (vs 2026-09-13T065200_hermes_issue18-approved-scope.md)

All eight approved contract items are delivered **except one sub-requirement of item #3**:

1. Generic root INDEX pointer-only — **PASS.** 3 rows, all targets resolve (`### Project knowledge discovery`, `## §J1`, `## §J6` verified present); no actor-local/private/issue/name rows; `.agents/local/**` referenced only in prohibition prose; §P6/§P7 carve-out present.
2. Kernel P-Access discovery contract + CORE/AGENTS/CLAUDE/kernel pointers with J6 + P-Access fallback — **PASS** (all four surfaces carry "Before answering a project question…", INDEX/§J6/§P-Access, on-demand).
3. Missing-map fallback + bounded literal search recipes, complete multiline entry retrieval, explicit limitations never absolute absence — **PARTIAL / BLOCKER.** Search-page recipe (literal, bounded, continuation, clipped-preview, zero/many/old/archive) is correct. `entry_page` **fails "complete multiline entry retrieval"** for a within-scope Markdown format (see blocker B1).
4. Same-session maintenance in §P3 close / §P4 / §J5; no ninth handoff field — **PASS.** `handoff.schema.json` unchanged; `session_close_checklist` still exactly 8 items (`additionalProperties:false`); maintenance added as prose only.
5. Preflight lstat + exclusive create; preserve regular byte-for-byte; refuse symlink/non-regular — **PASS** (directly reproduced, below).
6. Bundle exact seed; SHA-256 pin; row/target byte checks; clean packaged state — **PASS** (`test:pack` ran the actual tarball; sha256 matches).
7. Manual adoption docs; v2.1.5 commands unchanged; guideline normalization untouched — **PASS** (adoption example executed under real pwsh; init.ts leaves guideline-writer behavior unchanged).
8. Rule minor bumps + manifest kernel consistency; retain product/package 2.1.5 — **PASS** (`check-release-metadata.mjs 2.1.5` consistent; kernel 2.1.0 / CORE 1.6.0 / PROJECT_RULES 2.1.0 / manifest 2.1.0).

## Gate 2 — Safety / correctness / quality

Init seeding logic (`cli/src/lib/index-seed.ts`, `cli/src/commands/init.ts`) is correct:
- Preflight of source (read now, so unreadable required source refuses) and destination
  (lstat, rejects live+dangling symlinks, directories, FIFOs) runs **before all init writes**
  (lines 122-127, ahead of copyAgentsDir/generateGuidelines/ensureGitignoreEntries; only
  non-writing confirm prompts precede it).
- Exclusive `wx` creation; EEXIST → re-lstat: regular ⇒ "preserved" (never overwritten),
  vanished ⇒ throw, unsupported racing type ⇒ throw. Race handling is sound within the
  (correctly, per-scope) non-atomic-whole-init boundary.

### BLOCKER B1 — `entry_page` Markdown boundary scan is fence-blind (silent incomplete retrieval)

- **File/line:** `.agents/PROTOCOL_RULES.md:389-392` (the `entry_page` function inside the
  `<!-- knowledge-search-python -->` block). The scan uses `lines[i].startswith("## ")` with
  no awareness of fenced code regions.
- **Defect:** For a `## `-delimited Markdown log (the stated supported format) whose entry body
  contains a fenced block with a `## ` line, the forward scan stops at that fenced line, so the
  returned entry is truncated **and `next` is `None`** — a false "complete" signal that silently
  drops the remainder (including the entry's final rationale) and the true `## ` boundary.
- **Reproduction (directly executed by this reviewer against the shipped, extracted recipe):**
  fixture entry `## Actual entry\nneedle before fence\n` + a ```` ```markdown ```` fence containing
  `## illustrative heading` + closing fence + `important final rationale\n` + `## Next entry`.
  `search_page` locates the needle at line 2; the documented `entry_page(file, 2)` continuation
  loop returns `'## Actual entry\nneedle before fence\n```markdown\n'` with `next=None` — dropping
  the fenced content, the final rationale, and everything after. Independently corroborated by
  Hermes's `2026-09-13T070800_hermes_issue18-fenced-entry-repro.md`.
- **Severity:** Blocker. It defeats scope item #3's "complete multiline entry retrieval" within
  a supported format and produces an *absolute completeness signal on incomplete evidence* —
  exactly the failure mode the P-Access section is written to prevent ("retrieve the complete
  relevant entry before drawing conclusions"; "never turn limitations into an absolute … claim").
  It is the same fence-blind marker-matching class this project already hit in the handoff parser
  (decisions.jsonl 2026-09-12). The docs' "for other formats" escape hatch does not cover it: a
  fenced `## ` inside a `## `-delimited Markdown log *is* the supported format, and the failure is
  silent, not flagged.
- **Minimal correction (either):** (a) make the Markdown boundary scan fence-aware — track
  ```` ``` ```` / `~~~` fence open/close while scanning and ignore `## ` inside fenced regions; or
  (b) detect fenced content the simple scan cannot safely bound and refuse with an explicit
  limitation instead of ever emitting `next: None` on an incomplete entry. No Markdown library or
  crawler is required.
- **Regression expectation:** add a failing-first fixture (backtick **and** tilde fences; hit
  before/inside/after the fence; adjacent entries; multi-chunk continuation). After the fix,
  `entry_page` returns the entry through the true next `## ` boundary with correct `next`
  continuation, and the existing 113-test pytest suite still passes.

### Nit N1 (non-blocking) — raw crash on INDEX preflight failure
`init` surfaces preflight refusals (dangling symlink / directory / unreadable source) as an
uncaught `Error` with a full Node stack trace rather than a clean `ui.error` + exit(1). Behavior
is safe (aborts before any mutation — directly verified) but the UX is a raw stack dump. Cosmetic.

### Nit N2 (non-blocking) — recipe test coverage gap
`.agents/scripts/test_index_recipes.py::test_complete_entry_retrieval_in_bounded_chunks` claims
"complete multiline entry retrieval" but its Markdown fixture has no fenced heading, so it masks
B1. Add the fenced regression alongside the B1 fix.

## Execution evidence (all run by this reviewer on this checkout, sequentially)

Host: Linux, Node v22.22.0, uv-isolated Python 3.11, pwsh 7.6.5 (`/snap/bin/pwsh`).

| Gate | Command | Result |
|---|---|---|
| Full pytest | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/ -q` | **113 passed** |
| Focused new pytest | `… pytest test_knowledge_map_contract.py test_index_recipes.py test_index_adoption.py -q` | **17 passed** |
| State validator | `uv run … python .agents/scripts/validate_state.py` | **OK — validated 3 file(s)** |
| Release metadata | `node cli/scripts/check-release-metadata.mjs 2.1.5` | **consistent at 2.1.5**, exit 0 |
| npm test (build + node --test) | `npm --prefix cli test` | **58 passed, 0 fail/skip**, exit 0 |
| Typecheck | `npm --prefix cli run typecheck` | **PASS**, exit 0 |
| Pack (actual tarball install) | `npm --prefix cli run test:pack` | **PASS** — sha256 seed pin, packed init-index fixtures, legacy no-INDEX two-session lifecycle |
| Diff check | `git diff --check 66995ea..HEAD` | **clean** |
| Manual adoption (real pwsh) | extracted `<!-- index-adoption-python -->` run via `pwsh … python3 …` | create ✓ / repeat-preserve byte-for-byte ✓ / refuse-symlink nonzero ✓ |
| Highest-risk safety repro | built `cli/dist/index.js init --yes` into dir with dangling-symlink `INDEX.md` | refused before any write; no `.agents/`, AGENTS.md + symlink intact |
| Highest-risk defect repro | shipped `entry_page` extracted from PROTOCOL_RULES.md vs fenced fixture | truncated entry, `next=None`, rationale dropped (B1) |

The 113/17 pytest passes are consistent with the implementer's counts; note the suite passes
*because* it lacks a fenced-entry fixture (N2), which is why B1 was not caught by CI-shaped gates.

## Limitations of this review (not defects)

- No native Windows/macOS filesystem, no hosted CI, no Node 20 pack runtime, no published-release
  verification. PowerShell exercise was on Linux pwsh, not native Windows. Hosted CI (Node 18/20,
  3 OSes) is a separate later gate — not claimed here.
- Baseline `npm audit` low-severity esbuild dev-server advisory (GHSA-g7r4-m6w7-qqqr) predates this
  change and is not counted as a new product defect.
- Deterministic tests demonstrate artifact/runtime/example behavior only, not future-LLM compliance,
  search exhaustiveness, or pointer-maintenance discipline.
- Secret/private-row inspection is bounded (seed rows, targets, generic-row regex), not a universal
  scanner. Within that bound: no private/actor-local rows in the shipped seed.

## Disposition

Not APPROVED. Fix B1 (and fold in N2's regression), optionally N1, then re-review. No commit made;
Hermes commits review evidence after inspection. JOURNAL promotion remains an explicit owner gate —
not performed or inferred. Hermes pair state and registry row preserved; only my own row added
(removed at my session close).
