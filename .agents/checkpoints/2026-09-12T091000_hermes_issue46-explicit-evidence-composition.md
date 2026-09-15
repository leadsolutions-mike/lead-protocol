# Checkpoint — Hermes explicit-evidence composition probe

Author: [Mike / Hermes]
Timestamp: 2026-09-12 09:10 UTC
Implementation under audit: c14822a5d37093759c603256527bc64956512a41
Gate: PENDING remediation investigation, regardless of current Opus verdict.

Actual command `node /home/mmilanez/lead-protocol-46-hermes-open-fence-probe.mjs` exited1. Log `/home/mmilanez/lead-protocol-46-hermes-open-fence-red.log`. The probe composes an unclosed four-backtick legacy body plus `renderEvidenceMarkdown(validEvidence)` and asserts parser recovery: actual undefined, expected supplied evidence. This proves a composition defect, not yet an end-to-end lifecycle reproduction. Source inspection shows createCheckpoint appends explicit evidence without verifying the final serialized checkpoint, so an open legacy fence may hide the supplied record from subsequent parsers. Codex must reproduce through createCheckpoint/installed CLI, then either refuse explicit evidence before mutation if the body cannot safely host it or produce a recoverable canonical section without changing omission behavior. Preserve legacy unclosed-body acceptance when no evidence supplied. Full parser should continue treating examples as illustrative; do not make this standalone parser-composition probe green by extracting fake evidence. The real remediation GREEN is lifecycle rejection without mutation or correct roundtrip.

A separate read-only merge-tree preview of PR50 and issue46 identifies conflicts in decisions.jsonl, CHANGELOG.md, cli/package.json, cli/scripts/test-pack.mjs. Individual PRs remain independently based on main; a combined/ordered owner merge needs explicit reconciliation. Preview saved `/home/mmilanez/lead-protocol-26-46-integration-preview.txt`; no actual branch merge performed.
