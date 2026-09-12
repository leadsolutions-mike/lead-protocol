# Checkpoint — PR49 pristine handoff remediation
> Session: 2026-09-12-0544-hermes
> Timestamp: 2026-09-12 05:52
> Author: [Mike / Hermes]
> Status: PENDING

## Open question
Does the remediation identify only canonical populated handoff fields, excluding fenced Open Threads examples, while preserving pristine skips and malformed-file reporting across LF and CRLF?

## Data gathered
- Fresh upstream `main` is `5d2b156`; PR49 currently remains based on `1bb2778` with head `1c5ec78e2258a1b14e701f52f60b930907998201`.
- Owner inline discussion `discussion_r3995090534` reproduces fenced `Updated: YYYY-MM-DD` and fenced `**Last Agent:** [Your Agent Signature]` examples incorrectly causing pristine skip.
- All callers were inspected: `cli/src/commands/handoff.ts`, `cli/src/commands/status.ts`, `cli/src/lib/validator.ts`, and lifecycle parsing in `cli/src/lib/session-lifecycle.ts`.
- Codex [Mike / Codex] changed `cli/src/lib/handoff-parser.ts` to derive pristine status from parsed canonical fields and catch parser failures, and added validator regressions in `cli/test/validate.test.mjs`.
- Independent Hermes RED execution against the prior PR parser produced `RED_EXIT=1`: 11 tests, 2 passed, 9 failed. Failures were all new fenced-example regressions (both identities, valid/invalid, LF/CRLF, plus malformed reporting). Output is preserved at `/tmp/pr49-red-output.log` for this session report.
- GREEN rebuild completed; focused GREEN execution produced 11/11 passing tests.

## Current recommendation
Commit the narrow parser/test/decision change with this PENDING checkpoint, then have Claude Code Opus independently review the exact commit and run adversarial checks before finalizing the checkpoint. Preserve the current PR and attribution; do not merge, release, close issues/PRs, or alter upstream settings.

## What specifically needs second-opinion
Adversarially test whether parser-derived pristine detection can still accept a fenced example as an actual field when canonical fields are absent or duplicated, and confirm every caller preserves malformed handoff reporting when `isPristineHandoff` invokes parsing internally. Verify exact LF/CRLF coverage and no Python-validator scope expansion.
