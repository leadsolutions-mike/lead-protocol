# Checkpoint — Issue46 explicit evidence writer composition remediation

> Author: [Mike / Codex]
> Session: 2026-09-12-0913-codex
> Timestamp: 2026-09-12T09:17:47.608511+00:00
> Implementation: 597c9cd369f16f879219cb5a96d5837a2f5d8ede
> Gate: Opus re-review PENDING; Hermes verification PENDING.

## Finding and scope

Canonical input: `2026-09-12T091000_hermes_issue46-explicit-evidence-composition.md`.
The hypothesis is confirmed through actual `createCheckpoint` and a freshly packed, installed CLI.
The old writer returned success and persisted explicit evidence hidden by an unclosed legacy fence;
`parseEvidenceMarkdown` returned undefined. Leading whitespace trimmed from a fence opener had the
same failure. Leading whitespace trimmed from the reserved heading exposed a second section,
producing a duplicate-section parse error after a successful write.

RED tests were committed first as `7351011`; implementation and the pre-guard assertion are in
`597c9cd369f16f879219cb5a96d5837a2f5d8ede`. The final serialized artifact is now parsed and compared with the supplied evidence
before any mutation, including guard creation. Preparation repeats under the guard to avoid reusing
lifecycle reads across lock acquisition. Duplicate sections throw via the existing parser. Hidden or
nonmatching evidence is refused. No-evidence serialization and generic parser semantics are unchanged.

Tests cover open backticks/tildes, space/tab trimming, a trim-exposed duplicate heading, unchanged
state snapshots, refusal even when a transaction guard already exists, exact legacy omission bytes,
and the installed normal explicit roundtrip with illustrative examples. All CLI gates ran serially.
The Hermes parser-only probe still exits 1 intentionally: extracting that hidden record would weaken
fake-example suppression. Its failure is preserved, not described as a passing check.

## Validation and limitations

- Before fix: npm test 61/66 passed, five expected failures; installed test:pack failed on successful unsafe write.
- After fix: npm test 66/66; typecheck, installed test:pack, metadata 2.1.5 all exit 0; Python 112/112.
- Initial own-session CLI open refused the pristine Active modules placeholder; used manual protocol
  registry/handoff closure, without changing project configuration. Two npm invocations from root
  failed due to no package.json; corrected CLI-directory commands are the recorded RED/GREEN runs.
- Own session closed; JOURNAL remains owner-deferred under the no-wait instruction. No new general
  project lesson; ordinary writer integration finding only. Prior review/checkpoints preserved.
- Independent review and coordinator verification remain PENDING; no external delivery performed.

## Log hashes (SHA-256)

| Log | SHA-256 |
|---|---|
| `lead-protocol-46-composition-red-lifecycle.log` | `34e00bbb3c05b29f7574fc67967d7c27cb68042dc56844391d36ec8605a6106c` |
| `lead-protocol-46-composition-red-installed.log` | `e4dd57e775df4cb9864913af348ed0a1bfd9c1cdcb1492c3acf3326b6ea36ff8` |
| `lead-protocol-46-composition-green-test.log` | `d4ad92b5fed601ffe518d73955d24246a9d0b0ad44419c006ec7b2a0992194d0` |
| `lead-protocol-46-composition-green-typecheck.log` | `8f30c0aba98bd71a715742ac94da29cb984b8a0039fc1e15c787072872a7912c` |
| `lead-protocol-46-composition-green-installed.log` | `68d6d629903ebc049dd3e5959b62481c6eb8111f7fe20cb07a57925a777bcbf7` |
| `lead-protocol-46-composition-green-metadata.log` | `53d6332aafc6978cdde200b6de38f509232995f1e54644de676a7498a3c2f360` |
| `lead-protocol-46-composition-green-python.log` | `c1dd810c66346aec2325600319e9becb4b9e6a0a23c99c2972b243dd78f31187` |
| `lead-protocol-46-composition-parser-expected-red.log` | `d816c08330e8477ce38a2852a23824b6337b51f5831f36b88d995646b7c233ea` |

## Execution Evidence

```json
{
  "execution_evidence": {
    "git": {
      "branch": "mike/issue46-execution-evidence",
      "commit": "597c9cd369f16f879219cb5a96d5837a2f5d8ede"
    },
    "environment": {
      "runtime": "Node.js v22.22.0; Python 3.12.3; Linux",
      "package_manager": "npm 11.8.0",
      "cwd": "/home/mmilanez/workspaces/lead-protocol-46"
    },
    "checks": [
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "failed",
        "reason": "Actual pre-fix RED: 61 passed, 5 failed; four successful writes parsed as undefined; trim-exposed heading produced duplicate sections.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-red-lifecycle.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "failed",
        "reason": "Actual pre-fix installed tarball RED: writer exit 0, saved artifact parsed as undefined.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-red-installed.log"
      },
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "66 passed, zero failed/skipped.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-green-test.log"
      },
      {
        "command": "npm run typecheck",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-green-typecheck.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0; all five unsafe cases refused with full file snapshots unchanged, exact omission bytes preserved, quoted examples plus explicit evidence roundtrip passed.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-green-installed.log"
      },
      {
        "command": "node scripts/check-release-metadata.mjs 2.1.5",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0; product 2.1.5, kernel unchanged.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-green-metadata.log"
      },
      {
        "command": "uv run --with pytest --with jsonschema pytest .agents/scripts/ -q",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "passed",
        "reason": "112 passed, exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-green-python.log"
      },
      {
        "command": "node /home/mmilanez/lead-protocol-46-hermes-open-fence-probe.mjs",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "failed",
        "reason": "Expected exit 1 remains: parser suppresses evidence inside an unclosed fence. Writer now refuses the unsafe composition; this parser-only assertion must not become green.",
        "artifact": "/home/mmilanez/lead-protocol-46-composition-parser-expected-red.log"
      }
    ],
    "unresolved": [
      "Opus independent exact-SHA re-review PENDING; Hermes verification PENDING. Prior APPROVED review applies to the earlier fence fix, not this implementation.",
      "GREEN executed with the product tree subsequently committed unchanged as 597c9cd369f16f879219cb5a96d5837a2f5d8ede. Session registry was dirty during checks.",
      "Logs are machine-local; committed test cases, results and hashes provide durable review references.",
      "No push, PR, merge, closure, release, schema/kernel/version/AGENTS_MAP/profile changes. JOURNAL owner-deferred under explicit no-wait scope."
    ]
  }
}
```

## Session-close verification

`uv run --with jsonschema python .agents/scripts/validate_state.py .agents/local/mike/codex/handoff.md .agents/decisions.jsonl` exited 0 (2 files); log `/home/mmilanez/lead-protocol-46-composition-green-state.log`.
The compiled TypeScript parsers validated the canonical checkpoint and own close receipt and asserted
equal evidence. `git diff --check` passed. Own registry row removed; registry has zero net diff.
