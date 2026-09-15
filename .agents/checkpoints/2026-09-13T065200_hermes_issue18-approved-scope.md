# Checkpoint — Issue 18 approved scope and implementation gate
> Session: 2026-09-13-0652-hermes
> Timestamp: 2026-09-13 06:52 UTC
> Author: [Mike / Hermes]

## Authorization
Marco explicitly authorized the reviewed issue #18 scope through Codex implementation, independent Claude/Opus review, Hermes verification, fork PR creation and hosted CI verification. No merge, release/tag/npm publication, issue closure, permissions change, or unrelated remediation. Planning advisors were external read-only source analyses, not repository sessions; no planning registry rows remain to close.

## Sources and baseline
- Issue https://github.com/mmilanez/lead-protocol/issues/18: OPEN, no comments or assigned implementation at initial live inspection.
- Upstream main: 66995ea13983cdfc5bd98741c52db839e3723aba. Product 2.1.5; kernel 2.0.2.
- Branch: feature-18-knowledge-map. Upstream identity leadsolutions-mike has READ; fork used for publication.
- Source root is distributable scaffold, not a template/ dual-copy layout. J8 stays pristine; no module activated on inference. CLI session open was attempted and correctly refused the pristine Active modules placeholder without registration. Use the kernel's direct documented state format; do not customize the distributed project template merely to bootstrap this source-repo work.
- Current main init has --yes, not --force/update. PR50 (init/update), PR22 (boot), PR51 (CORE/kernel) remain unmerged and overlap. Do not duplicate them or assume their behavior.
- Baseline build passed; isolated pytest via uv with pytest/jsonschema: 96 passed. Host default Python lacks pytest; use isolated dependency environment, not global package changes. npm ci reported one low severity dependency finding; no automatic audit fix authorized.

## Approved minimum-complete contract
1. Generic project-owned root INDEX.md: topic/question -> canonical file -> section or record locator. Pointer-only, no copied facts/history, no source-project or private rows. Complements J6 rather than duplicating its inventory. Optional folder INDEX/README navigation registry; substantive README content remains valid.
2. Kernel P-Access canonical discovery contract; brief matching CORE and both raw pointer templates. Consult relevant index entries before answering project questions, then read canonical sources. On-demand, no mandatory full-map or history boot load.
3. Missing-map fallback through J6 AND independently accessible P-Access search recipes; no legacy boot failure. Missing/stale entry is not proof of absence. Relevant older/current/archived logs searched with literal-safe bounded output, continuation, and full relevant entry retrieval. Incomplete/truncated/inaccessible searches get explicit limitations, never absolute absence claims.
4. Same-session maintenance for relevant file/folder create/remove/rename/move and changed section/anchor references; P4/J5 and session-close prose, NOT a ninth handoff checklist item. No automatic crawler or lock system.
5. Pure INDEX source/destination preflight before any init mutation; lstat rejects live/dangling symlinks and non-regular destinations. Required seed source supported/readable regular file. Existing regular maps preserved byte-for-byte (including empty/CRLF and repeat init). Missing maps created exclusively; preserve regular racing entries, reject unsupported racing entries; no whole-init atomicity or arbitrary race defense claim.
6. Bundle and install the actual generic root seed; package tests compare expected bytes and verify seed rows/targets. Marker presence alone is not a privacy check. P6/P7 authorized portable external pointers remain allowed; actual actor-local/private topic rows excluded, prohibition text may mention local/**.
7. Manual source/adoption docs preserve existing maps and refuse unsafe types. Do not add nonexistent files to commands pinned to already-released v2.1.5. Feature is unreleased until maintainer-selected release. No fix of existing guideline global normalization; test no additional regression.
8. Rule file minor bumps and manifest kernel consistency as needed; retain product/package 2.1.5. No release version selection, AGENTS_MAP edit, whole-init rewrite, updater, RAG, DB, embeddings, schema expansion, or remote service.

## Team planning review
[Mike / Claude], actual claude-opus-4-8: PROCEED with framework + seed installation. [Mike / Hermes] corrected original draft's late preflight, speculative 2.2.0 release, nonexistent current --force, tagged-source assumption, unbounded grep, overbroad privacy ban and placement gate. [Mike / Codex], gpt-6-astra CLI0.154.0: APPROVED WITH CORRECTIONS for the corrected contract, not original draft. Corrections are incorporated above. No implementation approval inferred.

## Execution sequence and evidence
- Codex implements vertical RED/GREEN slices, first test then observed expected failure then minimal production change. Preserve real log paths/results in canonical checkpoints. Do not claim tests that never ran.
- Expected product paths: INDEX.md; .agents/{PROTOCOL_RULES,CORE_RULES,PROJECT_RULES}.md; AGENTS.md; CLAUDE.md; cli/src/commands/init.ts; optional narrow cli/src/lib/index-seed.ts; cli/scripts/{sync-templates,test-pack}.mjs; CLI/root docs; tests, manifest and unreleased changelog. Register new Node tests in explicit npm test list.
- Unit/contract/recipe fixtures: literal metacharacters, older/archive hits, many/zero hits, complete multiline entry retrieval, no-map fallback, maintenance wording, immutable eight handoff fields.
- Installed CLI/pack fixtures: fresh create, initial and repeat existing custom/empty/CRLF preservation, cancel, unsupported source/destination, dangling symlink, before-write refusal with complete fixture/target snapshots, deterministic exclusive-create race, both managed pointers and current normalization baseline.
- Independent Opus review must inspect exact diff/SHA, run focused and full applicable tests, reproduce high-risk path, and write a canonical review checkpoint with explicit APPROVED/CHANGES REQUESTED. Product read-only review, pair-owned state only.
- Hermes independently reruns Node tests/build/typecheck/pack, isolated full pytest, state validation, metadata and diff checks; then final sessions close on feature branch before PR. JOURNAL promotion remains explicit owner gate, do not infer consent.
- Hosted CI is separate. No UI/browser task here. Windows/PowerShell behavior must be exercised where runtime/CI supports it; unavailable coverage is not passed.

## Limits
Deterministic tests show artifact/runtime/example behavior, not proof a future LLM will follow rules, search exhaustively, or maintain every pointer. Review status now: implementation PENDING.
