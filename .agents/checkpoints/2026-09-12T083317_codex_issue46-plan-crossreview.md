# Issue46 plan cross-review — [Mike / Codex], gpt-6-astra
> Timestamp: 2026-09-12T08:33:17.824530+00:00
> Reviewed commit: 7c7fe4e6ea0f53c03ccd53d11f51e1c82c2b4104
> Verdict: ACCEPTED WITH SCOPED CORRECTIONS (resolved below); implementation authorized, independent implementation review PENDING.

Sources: live issue46 (read through gh), canonical `20260912T082802_claude_issue46-execution-evidence-plan.md`, mandatory `2026-09-12T082400_hermes_issue46-layout.md`, root baseline and actual CLI sources. Branch based on main66995ea; preceding two commits are coordination documents only. No PR50 product changes.

Accepted: root distributable schema/kernel and CLI support; checkpoint/close receipt placement keeps handoff immutable; kernel 2.1.0 and package 2.1.5. No active concrete modules. Own mike/codex handoff absent at boot; create own manual session (pristine PROJECT_RULES prevents CLI boot, do not weaken that guard or edit configuration).

Resolved corrections:
- Tests BEFORE schema and implementation, correcting plan sequence 1/2. Save executed absent-module/schema RED explicitly, then vertical lifecycle/CLI/parser/docs/pack slices with real logs.
- Every not_run/blocked result requires a nonblank reason, including browser. Browser performed:false permits only not_run/blocked, never passed/failed; performed:true permits passed/failed. Browser omission stays optional.
- Empty objects, empty checks, and omission are structurally compatible, never task-completion proof. Normative implementation completion records execution or a specific inability reason. Structural validation cannot establish execution truth; legacy receipt validation is state checks only.
- One deterministic fenced JSON envelope execution_evidence, no duplicate human table; escape unsafe markup characters. Parse only the explicit canonical block and close receipt evidence; reject malformed/duplicate blocks and invalid schema before state writes.
- Keep discoverability via checkpoint reference in existing handoff context and receipt/checkpoint references in shared close checkpoint. No new handoff fields. No historical Python parser parity: Python only needs changes if it actually consumes new evidence; add schema conformance tests using its real Draft202012 validator.
- Preserve guards and omitted outputs. Canonicalize fixture allocation roots only, never internal symlinks.

AC1 docs/kernel optionality + normative completion. AC2 illustrative close/checkpoint examples with all four statuses, executed schema tests. AC3 shared schema + TS tests + Python schema tests. AC4 commands/cwd/runtime/CI/artifact/screenshots/branch/commit schema and examples. AC5 omission/lifecycle regressions + installed tarball roundtrip.

Logs: /home/mmilanez/lead-protocol-46-*.log. Independent review follows implementation and is not self-approved. JOURNAL owner-deferred; external publication Hermes-owned.
