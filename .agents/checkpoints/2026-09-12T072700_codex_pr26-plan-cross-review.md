# Checkpoint — PR26 plan cross-review
> Session: 2026-09-12-0727-codex
> Timestamp: 2026-09-12 07:27 UTC
> Author: [Mike / Codex] — gpt-6-astra
> Verdict: APPROVED WITH SCOPED AMENDMENTS (plan only)

## Data gathered
Read root AGENTS, CORE, template PROJECT (no active modules), map, registry; own pair absent, created mike/codex state. Consulted kernel session/quality/threat contracts and meta-repo on demand. No root framework or map changes planned.
Reviewed Opus checkpoint `20260912T072139_claude_pr26-safe-update-plan.md`, current main 66995ea and original PR26 source at 4000b1479a075dcceb205c6586870cbee8901359.
Re-ran `node /home/mmilanez/lead-protocol-26-original-probe.mjs` against original built PR26. Actual output: external symlink sentinel overwritten with new framework; partial init exits 0 and custom project preservation is false. Evidence: `/home/mmilanez/lead-protocol-26-codex-original-probe.log` (exit 0). Coordinator's original probe and log independently agree.

## Scoped amendments
1. Retract “every defect is integration-only” and “only true correctness bug is D1”: symlink overwrite and partial-install init bypass exist on the original base. Treat both as correctness/data-safety defects.
2. Refuse symlinks; never replace/unlink them. Preflight all destination writes and ancestors, including .agents itself, nested framework paths, guideline files and .gitignore, before any mutation. Detect malformed path types and reject traversal. Avoid traversing local entirely.
3. Any existing .agents entry (including malformed/partial/dangling link) blocks ordinary init, even --yes. Explicit --force permits an overlay of project seeds but preserves all local bytes, including collisions with bundled example actor seeds. Local is never seeded, scanned or written by init/update.
4. Guideline refresh must preserve all bytes outside tagged regions. Dry-run must preflight without writing; repeat update must avoid unnecessary writes. Keep orphans; seed missing project state only.
5. Preserve 2.1.5, current main entrypoints/tests/metadata. Reuse PR26 source with `Co-authored-by: Leonardo Buares <contact@leonardobuares.dev>` and references PR26/#25/#40. Scaffold and command source need amendments, not unchanged adoption.
6. Test one vertical slice at a time: regression -> saved actual RED -> minimum implementation -> GREEN; then full typecheck/test/pack/metadata gates. Packed install must exercise current-main lifecycle compatibility.

## Current recommendation
Implement this narrowed successor locally on mike/pr26-safe-update. No push, PR, merge, release, tag, config or permission changes. Owner has authorized ordinary choices; JOURNAL deferred. Opus independent exact-commit implementation review remains PENDING, never inferred from this plan approval.

## Limitations to document
Preflight handles static path hazards, not adversarial concurrent filesystem replacement, hard-link aliases or transactional rollback after I/O failure. Do not claim atomic multi-file installation.
