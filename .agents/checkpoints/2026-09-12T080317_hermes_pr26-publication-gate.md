# Checkpoint — PR26 Hermes verification and fork publication gate
> Session: 2026-09-12-0707-hermes
> Timestamp: 2026-09-12 08:03 UTC
> Author: [Mike / Hermes]
> Reviewed exact head: 26b60fa5cebe294f269b7d7c1b5b9afd511a6a8c
> Status: VERIFIED LOCALLY; hosted CI pending publication

Opus independent reviews explicitly approved 695e33a and follow-up26b60fa; canonical checkpoints074747 and075953 carry verdicts and evidence. Real response model claude-opus-4-8; CLI auxiliary usage is separately reported, not a planner/reviewer substitution. Real Codex gpt-6-astra completed implementation via CLI0.154.0. CLI0.147.0 API incompatibility was resolved by pinned npm exec without global/config updates; service bubblewrap failure required documented compatible execution mode with unchanged scope.

Hermes independently executed serially on reviewed product:
- `cd cli && npm test`: exit0, 84/84.
- `npm run typecheck`: exit0.
- `npm run test:pack`: exit0, 44/44 installed regression tests plus existing install/status/validate/lifecycle smoke.
- `node scripts/check-release-metadata.mjs 2.1.5`: exit0.
- Temporary-fixture independent replay of original symlink/partial-init defects: both refused; outside/project bytes preserved. Force output explicitly lists affected project files.
- `python3 .agents/scripts/validate_state.py --schemas-dir .agents/schemas .agents/decisions.jsonl`: OK.
- System Python lacked pytest; alternative isolated `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/ -q`: 96 passed.
- `git diff --check`: clean.
Logs retained as `/home/mmilanez/lead-protocol-26-hermes-{tests,typecheck,pack,metadata,verify,python}.log`. Regression RED records and chronological caveats are in Codex TDD checkpoints; no fabricated test-first claim for manifest classifier replay.

Final changes after reviewed head are coordination evidence only. Product remains the exact reviewed diff. Leonardo original authorship retained in co-author trailer and documentation; successor references PR26/issues25/40 and does not administratively replace or close original PR.

Actor-agent worker sessions closed; registry has no worker rows. Hermes mission remains active in separate triage coordinator worktree until issue46 is delivered. JOURNAL promotion deferred to owner. No merge/release/tag/publish/closure performed. Upstream PR/fork pushes and scoped PR26 comment are owner-authorized next, not blocked by reviewer advisory release gates. Hosted CI must be read back before final claims. Non-blocking UX nits: refusal stack trace and noop 'created' wording. Static preflight is not transactional rollback or concurrent/hard-link protection; documented limits remain.
