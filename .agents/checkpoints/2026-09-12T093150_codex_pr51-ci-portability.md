# Checkpoint — PR51 CI docs-example portability remediation

> Author: [Mike / Codex]
> Session: 2026-09-12-0929-codex
> Timestamp: 2026-09-12 09:31 UTC
> Base: 7c01e85 (published PR51)
> Regression: be227c6
> Implementation: 9eaa97420b9eb8ae85dea2afd440d6552dbcecbb

## Finding and bounded change

Hosted run 34685900906, Windows Node18, failed only the illustrative docs-example test
(65/66 passed), with expected 2 and actual 0. Source evidence:
`/home/mmilanez/lead-protocol-51-ci-failure.log`.
The test-only fence extraction assumed LF. `cli/test/execution-evidence.test.mjs`
now runs the original assertions against deterministic LF and CRLF copies of the actual
protocol text, regardless of checkout line endings. The regression was executed and committed
before the fix; LF passed and CRLF reproduced expected 2 / actual 0.
The minimal subsequent change accepts optional carriage return at both regex fence boundaries.
Exact count 2, schema validation, all four statuses, git/environment references, artifact/browser
references and both normative-text assertions remain intact for each line ending.
No product/parser behavior, versions, rules, workflows, credentials or configuration changed.
PROJECT_RULES declares only placeholder modules, so no concrete module was active; own state
was maintained manually as in the prior session. Explicit owner instruction authorized this session.

## Reproduction and results

From `cli`, checkout regression commit `be227c6` and run the focused command below to reproduce
one passing LF case and one failing CRLF case. At implementation `9eaa97420b9eb8ae85dea2afd440d6552dbcecbb`, both pass.
The focused commands were actually invoked from repository root with the equivalent
`cli/test/execution-evidence.test.mjs` path. Full gates ran sequentially from `cli`:
`npm test`, `npm run typecheck`, `npm run test:pack`, then metadata check.
The working test tree during GREEN is identical to implementation commit. Registry was active.

## Bounded review requested

Opus: inspect only `7c01e85..9eaa97420b9eb8ae85dea2afd440d6552dbcecbb` test delta for deterministic coverage, unchanged assertions
and newline-safe extraction; confirm RED-before-fix sequence. Hermes: independently test this
reviewed result and handle push. Prior approvals concern the previous implementation only.
Own registry row removed and own handoff closed. No external action taken.

## Log hashes (SHA-256)

| Log under /home/mmilanez | SHA-256 |
|---|---|
| `lead-protocol-51-ci-fix-red.log` | `f8084a73af526904054e6d8a55c15846abe52ecf40cda3e028daf70878288b6f` |
| `lead-protocol-51-ci-fix-green-focused.log` | `0b3deca461e06fd81189afcedf059da64b8705e47cb2e989762c1199b5e4d007` |
| `lead-protocol-51-ci-fix-green-test.log` | `862fd61e77acae9891e04f58cad65b20e263763c6af855bafb54cf2da2264b22` |
| `lead-protocol-51-ci-fix-green-typecheck.log` | `8f30c0aba98bd71a715742ac94da29cb984b8a0039fc1e15c787072872a7912c` |
| `lead-protocol-51-ci-fix-green-pack.log` | `78a10dc3feae76b400ac40f59531a7cef7160c48dcefd62b1ac7febb2542ced5` |
| `lead-protocol-51-ci-fix-green-metadata.log` | `53d6332aafc6978cdde200b6de38f509232995f1e54644de676a7498a3c2f360` |

## Execution Evidence

```json
{
  "execution_evidence": {
    "git": {
      "branch": "mike/issue46-execution-evidence",
      "commit": "9eaa97420b9eb8ae85dea2afd440d6552dbcecbb"
    },
    "environment": {
      "runtime": "Node.js v22.22.0 on Linux",
      "package_manager": "npm 11.8.0",
      "cwd": "/home/mmilanez/workspaces/lead-protocol-46"
    },
    "checks": [
      {
        "command": "node --test --test-name-pattern='illustrative closeout' test/execution-evidence.test.mjs",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "failed",
        "reason": "Regression-first be227c6: LF passed; CRLF failed at exact count assertion, expected 2 actual 0. Exit 1.",
        "artifact": "/home/mmilanez/lead-protocol-51-ci-fix-red.log"
      },
      {
        "command": "node --test --test-name-pattern='illustrative closeout' test/execution-evidence.test.mjs",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Both LF and CRLF passed, 2/2; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-ci-fix-green-focused.log"
      },
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "67/67 passed; zero failures or skips; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-ci-fix-green-test.log"
      },
      {
        "command": "npm run typecheck",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-ci-fix-green-typecheck.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Installed tarball tests passed; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-ci-fix-green-pack.log"
      },
      {
        "command": "node scripts/check-release-metadata.mjs 2.1.5",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Release metadata 2.1.5 valid; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-ci-fix-green-metadata.log"
      }
    ],
    "unresolved": [
      "Hosted Windows Node18 rerun not performed locally; deterministic LF/CRLF fixtures exercised on Linux Node22.",
      "Opus bounded review pending, then Hermes independent tests and push. No push, PR mutation, merge, issue closure or release by this worker.",
      "JOURNAL promotion owner-deferred under explicit no-wait instruction. Machine-local logs supplemented by committed reproducer, results and hashes."
    ]
  }
}
```

## Close verification

State validator passed for own handoff and decisions (exit 0), logged in
`/home/mmilanez/lead-protocol-51-ci-fix-green-state.log`. The compiled checkpoint parser
validated this canonical evidence and asserted one failed RED plus five passed GREEN checks
(exit 0), logged in `/home/mmilanez/lead-protocol-51-ci-fix-green-checkpoint.log`.
`git diff --check` passed; registry returned to its original empty state.
