# Checkpoint — PR26 original-head adversarial verification
> Session: 2026-09-12-0707-hermes
> Timestamp: 2026-09-12 07:25 UTC
> Author: [Mike / Hermes]
> Status: CHANGES REQUESTED on original head; successor implementation PENDING

## Exact target
PR26 head 4000b1479a075dcceb205c6586870cbee8901359, detached original worktree. Current-main baseline 66995ea. No product writes during this probe; only throwaway temporary fixtures.

## Executed evidence
Hermes ran `node /home/mmilanez/lead-protocol-26-original-probe.mjs` (script/log retained locally). Reproducible operations:
1. Import original built `planUpdate` and `applyUpdate`. Template CORE_RULES.md contains `new framework`. Target CORE_RULES.md is a symlink to an outside fixture initially containing `outside sentinel`. Plan/apply changes outside target to `new framework` — unsafe write-through reproduced.
2. Create a partial `.agents/` with only customized PROJECT_RULES.md and run original packed-entry `node dist/index.js init --yes`. Exit 0 and custom project is replaced — partial-install guard bypass/data loss reproduced.

## Plan correction
These two defects exist in original PR logic, not merely current-main integration. The Opus plan's broad integration-only phrasing is not accepted. Preserve predecessor credit, distinguish old-base passing tests from safety completeness. Current-main compatibility also requires refreshing manifest and preserving all existing suites/entrypoints.

## Next gate
Astra cross-review and TDD remediation on current-main-based branch, followed by independent Opus exact-diff review and Hermes reruns. No merge, release, or PR/issue closure.
