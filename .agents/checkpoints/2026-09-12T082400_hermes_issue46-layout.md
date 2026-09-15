# Checkpoint — Issue46 actual distributable layout clarification
> Session: 2026-09-12-0707-hermes
> Timestamp: 2026-09-12 08:24 UTC
> Author: [Mike / Hermes]
> Status: Coordinator scope correction

`git ls-tree --name-only HEAD` at main66995ea shows no template/ directory. `cli/scripts/sync-templates.mjs` lines1–7 and19–23 explicitly make repository root `.agents/`, AGENTS.md and CLAUDE.md the distributable template source; generated `cli/dist/templates` is not an editable source tree.

My initial block2 worker brief incorrectly assumed a dual-copy template layout and said not to edit root framework. That coordinator restriction is corrected: the owner's issue46 authorization is a methodology upgrade of the actual distributable source, so narrowly scoped changes to root `.agents/PROTOCOL_RULES.md`, relevant schemas/scripts and index references ARE authorized when the plan requires them. Apply protocol-file versions per P1 and sync manifest kernel field; keep package/release2.1.5, do not invent a template/ tree or perform an unrelated promotion. PROJECT_RULES has no concrete active modules; meta-repo module is reference, not activated authority over an absent two-copy layout.

Do not change AGENTS_MAP, credentials, other profiles/config, release/tag/merge/closure, unrelated parser parity or central services. Preserve old no-evidence workflows. Canonical plan/cross-review should cite this correction rather than defer an authorized issue46 implementation.
