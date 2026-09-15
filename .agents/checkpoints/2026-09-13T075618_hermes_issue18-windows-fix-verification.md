# Checkpoint — Issue18 Windows fix Hermes verification
> Author: [Mike / Hermes]
> Timestamp: 2026-09-13 07:56 UTC
> Reviewed and independently tested product HEAD: adb537556f41395973039a1cfd77d64826704dfe
> Previous submission: 87a622ac573d1d5cdad40cf093d0bb4587795a89
> PR: https://github.com/mmilanez/lead-protocol/pull/55

## Verified failure, correction, separate review
Initial native Windows Node18 job103693161992 in run34745706249 failed54/55
with an unsupported racing entry not throwing; five other PR checks passed.
This invalidated delivery completion, despite earlier local/Opus approval.
Codex added the minimal install-time lstat guard, retained wx/EEXIST handling,
named all real-filesystem cases, and asserted external referent preservation.
Real hosted RED and explicitly modeled local RED/GREEN are distinguished in
`2026-09-13T074650_codex_issue18-windows-ci-remediation.md`.

Fresh independent Opus APPROVED exact adb5375, conditional on native hosted CI,
in `2026-09-13T075227_claude_issue18-windows-ci-review.md`. Actual response includes
claude-opus-4-8; no product edit or self-approval. All workers exited and own rows
closed. Hermes checked that only the review checkpoint remained untracked.

Evidence qualification: original aggregate Windows log does not name the failing
kind or prove referent creation. Missing install-time type validation is directly
verified; the exact dangling-link mechanism is strongly supported by platform
source/docs and the model, not a standalone native before-fix probe. Reviewer
causal wording must be read with this qualification. Current named native cases
must pass in hosted CI before delivery is called complete.

## Hermes-owned rerun at exact SHA
Eight real commands were run serially; full raw logs and structured results
retained locally, separately from previous gates. Linux Node22; PowerShell is
Linux, not a substitute for native Windows.

- `node`: exit0; # tests 63 / # pass 63 / # fail 0 / # skipped 0
- `typecheck`: exit0;
- `python`: exit0; 152 passed in 5.55s
- `pack`: exit0; # tests 23 / # pass 23 / # fail 0 / # skipped 0 / ✔ OK — validated 1 file(s) (1 passed) / [test-pack] PASS: the locally packed artifact installs and runs like production.
- `metadata`: exit0;
- `state`: exit0; OK — validated 4 file(s)
- `diff`: exit0;
- `powershell`: exit0; 52 passed in 5.33s

Package23 cases comprise17 installed-runtime cases and6 source-helper cases,
plus real tarball install and legacy no-INDEX two-session lifecycle. The adapter
models the OS boundary only; it is not presented as native Windows evidence.
Product/package2.1.5 and kernel2.1.1 unchanged. The shared lesson is generic and
points to canonical evidence; no consumer-specific INDEX data or local state ships.

## Publication gate
Only coordination checkpoints/decision evidence follow this reviewed product SHA.
Full workspace state and empty product delta are rechecked before push. This
checkpoint does NOT claim hosted green: push same fork branch, verify exact remote
SHA/files, then read all native/Linux/macOS/package/state/Python checks to completion.
No merge, release, issue closure, JOURNAL promotion or broad dependency remediation.
JOURNAL remains pending owner decision. Residual lstat/open races remain outside scope.
