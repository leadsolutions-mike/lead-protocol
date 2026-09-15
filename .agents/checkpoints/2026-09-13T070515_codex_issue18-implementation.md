# Checkpoint — Issue18 local implementation and execution evidence
> Session: 2026-09-13-0652-codex
> Timestamp: 2026-09-13 07:05 UTC
> Author: [Mike / Codex]

## Scope and disposition

Implemented the owner-authorized scope in `2026-09-13T065200_hermes_issue18-approved-scope.md`, committed first as `6daa906`. The owner explicitly superseded planning-only authorization for implementation, but limited this Codex session to local work and commits. No remote writes, reviewer invocation, implementation approval, product release selection or JOURNAL promotion occurred. Independent Opus review and Hermes verification remain pending. This checkpoint records execution evidence, not a review verdict.

Baseline branch: `feature-18-knowledge-map`, source base `66995ea13983cdfc5bd98741c52db839e3723aba`. Root is the distribution source, not a dual-copy template layout. J8 remains pristine and AGENTS_MAP unchanged. Used the kernel's documented direct state format for `[Mike / Codex]`; preserved Hermes's own local state and registry row.

## Delivered behavior

- Generic, project-owned root INDEX with three pointer-only rows whose file and heading targets are tested. Optional folder navigation is empty. J6 remains the protocol inventory. Both raw and installed managed pointers route questions to relevant entries and canonical evidence on demand, with independent J6/P-Access fallback.
- Kernel discovery guidance covers older/current/archived evidence, literal matching, bounded pages and continuation, complete relevant entry retrieval, and explicit limitations for missing/stale/truncated/inaccessible evidence. Portable Python examples live in fenced docs and are executed by extraction, without a crawler or service.
- Same-session affected-pointer maintenance appears in P3 close prose, P4 and J5, including section/anchor changes. The persisted handoff checklist remains exactly eight items.
- Init preflights the readable regular source and destination using lstat/read before any mutation, then uses exclusive creation. Regular existing/racing maps are preserved byte-for-byte; symlinks, directories and other unsupported types are refused. Cancellation writes nothing. Other init behavior is unchanged.
- npm bundle includes the exact generic seed; package test pins its SHA-256 and compares source/package/created bytes. Python tests inspect actual seed rows and heading targets, rather than accepting a marker as a privacy check. Packed runtime fixtures use installed dependencies; only the isolated helper unit test uses source transpilation.
- Source-adoption docs use an extracted/tested Python exclusive-create example usable from POSIX and PowerShell. Commands pinned to v2.1.5 remain unchanged. CLI docs accurately describe the existing global blank-line normalization; guideline-writer code is untouched.
- Product/package/lockfile remain 2.1.5. Kernel and manifest are 2.1.0; CORE is 1.6.0; PROJECT_RULES is 2.1.0. Feature is listed under Unreleased. CI's existing path filters now include root INDEX, so seed-only changes trigger existing gates.

## Strict vertical RED / GREEN evidence

All log paths below are relative to `.agents/local/mike/codex/` (gitignored pair state). Failures were observed before the corresponding production slice. Raw RED logs were retained; counts are not reconstructed successes.

| Slice | Exact RED command from repository root | Observed RED | GREEN evidence |
|---|---|---|---|
| Seed/discovery/maintenance contracts | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_knowledge_map_contract.py -q` | `red-contract.log`: 3 failed (missing seed, discovery, maintenance) | `green-contract.log`: 5 passed with existing checklist regression |
| Executable history recipes | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_index_recipes.py -q` | `red-recipes.log`: 4 failed (recipe absent) | `green-recipes.log`: 9 passed including contracts/checklist |
| Init preflight/exclusive creation | `node --test cli/test/init-index.test.mjs` | `red-init.log`: 16 failed, 1 passed; fresh missing seed, unsafe paths mutated targets, helper absent; existing cancellation passed | `green-init.log`: 17 passed after implementation/build |
| Actual npm seed delivery | `npm --prefix cli run test:pack` | `red-pack.log`: actual installed tarball missing `dist/templates/INDEX.md` (ENOENT) | `green-pack.log`: PASS after bundling; final pack below includes later regression additions |
| Source adoption and CI seed trigger | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_index_adoption.py -q` | `red-adoption.log`: 10 failed (example/docs/trigger absent) | `green-adoption.log`: 19 passed including other focused contracts |

Exact intermediate GREEN commands:

```sh
uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_knowledge_map_contract.py .agents/scripts/test_checklist_contract.py -q
uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_index_recipes.py .agents/scripts/test_knowledge_map_contract.py .agents/scripts/test_checklist_contract.py -q
npm --prefix cli run sync:manifest
npm --prefix cli run build
node --test cli/test/init-index.test.mjs
npm --prefix cli run test:pack
uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_index_adoption.py .agents/scripts/test_index_recipes.py .agents/scripts/test_knowledge_map_contract.py .agents/scripts/test_checklist_contract.py -q
```

Corresponding additional logs: `sync-manifest.log`, `build-init.log`. Final regression coverage added missing-map cancellation and a packed two-session legacy lifecycle with INDEX deliberately removed; these exercise existing backward-compatible behavior, not additional production changes. Original full Node run had 57 passes (`full-node.log`); final count is 58 after the additional cancellation case.

## Full local gates

Host: Linux, Node v22.22.0, isolated Python 3.11.15. `gates.json` records exact final gate command arrays rendered as commands, exit statuses and log paths. All final gate exits are 0.

| Exact command | Result | Log |
|---|---|---|
| `npm --prefix cli test` | Build + 58 passed, 0 failed/skipped | `gate-node.log` |
| `npm --prefix cli run typecheck` | PASS | `gate-typecheck.log` |
| `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/` | 113 passed (96 existing + 17 new) | `gate-pytest.log` |
| `node cli/scripts/check-release-metadata.mjs 2.1.5` | Source/bundle/package/lockfile/readme/changelog consistent | `gate-metadata.log` |
| `uv run --with pytest --with jsonschema python .agents/scripts/validate_state.py` | OK, 3 state files validated before close | `gate-state.log`; final close rerun recorded below |
| `git diff --check` | PASS | `gate-diff.log`; staged rerun at close |
| `npm --prefix cli run test:pack` | Actual tarball install PASS; 18 fixture tests (17 packed-runtime + 1 source-helper), 0 skipped; exact seed; clean sessions/decisions/checkpoints/caches; legacy no-INDEX two-session lifecycle PASS | `final-pack-deps.log` |
| `npm exec --yes --package=node@18 -- node --test cli/test/session-lifecycle.test.mjs cli/test/status.test.mjs cli/test/validate.test.mjs cli/test/release-metadata.test.mjs cli/test/init-index.test.mjs` | Node 18.20.8: 58 passed, 0 failed/skipped | `node18.log`, `node18-version.log` |
| `pwsh -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.ToString(); uv run --with pytest --with jsonschema python -m pytest .agents/scripts/test_index_adoption.py .agents/scripts/test_index_recipes.py -q; exit $LASTEXITCODE'` | Linux PowerShell 7.6.5: 14 passed | `powershell.log` |

Fixtures cover literal metacharacters, old/archive hits, many/zero hits, bounded previews and complete Markdown/JSONL entries; no-map discovery contract; initial/repeat custom/empty/CRLF maps; cancellation with/without maps; invalid/missing/unreadable sources; live/dangling links/directories/FIFOs; complete target snapshots and outside-target preservation on preflight refusal; deterministic post-preflight regular/directory/link races; both managed pointers and unchanged normalization baseline. No symlink or permission cases were skipped locally.

## References, privacy, remaining limits

Inspected all three seed rows and canonical headings; pointers to §J6, §P-Access, §P6/§P7 and the README source-adoption anchor resolve. Checked the intended diff for machine-private paths and credential prefixes (no matches); this is a bounded inspection, not a universal secret scanner guarantee. Seed hash/row checks and installed clean-state checks prevent source-session/topic rows from silently shipping in the map. The prohibition mentioning local state is explanatory prose, not an actor-local map entry.

Not run: native Windows/macOS filesystems, hosted CI, Node 20 pack runtime, immutable published-release verification, UI/browser tests (no UI scope), independent reviewer. PowerShell execution above is on Linux and is not native Windows coverage. Node 18 suite preceded only a test-fixture dependency-routing refinement; the final full Node 22 suite and actual pack exercised that refinement.

Risks: no whole-init rollback, arbitrary concurrent replacement protection, crawler, automatic map maintenance, history completeness or future LLM compliance guarantee. Search output is bounded; the entry example reads its selected file internally and supports JSONL or Markdown `## ` entry boundaries; other formats need explicit ranges. Existing repeated-init replacement of other protocol files and guideline blank-line normalization remain unchanged. Manual pointer maintenance can drift; incomplete evidence must be reported.

## Session close and review handoff

Codex handoff/activity and appended decision evidence are completed locally before the final implementation commit; only Codex's registry row is removed. Hermes's active row stays uncommitted. JOURNAL promotion is deferred to the owner by explicit instruction; no yes/no answer or promotion was invented. No personal/project lesson was inferred beyond task evidence. Reviewer should inspect the commit containing this checkpoint and its parent planning commit; no self-approval is claimed.

Close verification: `uv run --with pytest --with jsonschema python .agents/scripts/validate_state.py` returned `OK — validated 3 file(s)` after handoff/decision/registry close (`close-state.log`); `git diff --cached --check` passed (`close-diff.log`). Applicable state artifacts carry today's date; the JOURNAL box remains explicitly deferred. Staged paths are checked against the 23-file two-commit allowlist, and the registry is excluded.

## Exact intended changed files (both local commits)

- `.agents/CORE_RULES.md`
- `.agents/PROJECT_RULES.md`
- `.agents/PROTOCOL_RULES.md`
- `.agents/checkpoints/2026-09-13T065200_hermes_issue18-approved-scope.md`
- `.agents/checkpoints/2026-09-13T070515_codex_issue18-implementation.md`
- `.agents/decisions.jsonl`
- `.agents/manifest.json`
- `.agents/scripts/test_index_adoption.py`
- `.agents/scripts/test_index_recipes.py`
- `.agents/scripts/test_knowledge_map_contract.py`
- `.github/workflows/cli-lifecycle.yml`
- `AGENTS.md`
- `CHANGELOG.md`
- `CLAUDE.md`
- `INDEX.md`
- `README.md`
- `cli/README.md`
- `cli/package.json`
- `cli/scripts/sync-templates.mjs`
- `cli/scripts/test-pack.mjs`
- `cli/src/commands/init.ts`
- `cli/src/lib/index-seed.ts`
- `cli/test/init-index.test.mjs`
