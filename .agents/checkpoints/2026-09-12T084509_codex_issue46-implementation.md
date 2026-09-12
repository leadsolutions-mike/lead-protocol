# Issue46 implementation and close evidence — [Mike / Codex]
> Timestamp: 2026-09-12T08:45:09.961642+00:00
> Status: Implementation verified; PENDING independent review (not self-approved).
> Exact tested product commit: ccba8c6fe5fb83eea355b56b1994989710d899de
> Base main: 66995ea13983cdfc5bd98741c52db839e3723aba
> Branch: mike/issue46-execution-evidence

Sources: live issue46; Opus plan `20260912T082802_claude_issue46-execution-evidence-plan.md`;
mandatory Hermes layout correction `2026-09-12T082400_hermes_issue46-layout.md`;
resolved cross-review `2026-09-12T083317_codex_issue46-plan-crossreview.md`;
executed TDD `2026-09-12T084509_codex_issue46-tdd.md`. Subsequent commits only record coordination/close artifacts.

## Acceptance mapping

1. Globally optional contract plus normative implementation-completion evidence rule: `.agents/PROTOCOL_RULES.md` session-close section;
CORE pointer, schema README, root/CLI README. Empty and omitted evidence is structural compatibility, never completion proof.
2. Both closeout and checkpoint illustrative JSON examples cover passed/failed/not_run/blocked: PROTOCOL_RULES;
`cli/test/execution-evidence.test.mjs`, `.agents/scripts/test_execution_evidence.py`, installed tarball test validate them.
3. All four statuses with nonblank inability reasons on checks and browser: `execution-evidence.schema.json`, TS module and schema tests.
Unperformed browser cannot claim passed/failed. Browser omission remains optional when inapplicable.
4. Commands/cwd/runtime/package manager/CI/artifact/screenshots/branch/commit references: schema and both illustrative examples.
Actual mission evidence below is separate and includes no claimed browser or hosted CI execution.
5. Legacy omission: `cli/test/session-lifecycle.test.mjs` exact shape regression without evidence schema; unchanged handoff/decisions parsers;
full 48 JS + 112 Python tests; installed legacy two-session resume plus evidence roundtrip. Package stays 2.1.5, kernel 2.1.0,
CORE 1.6.0 and manifest consistent. No PR50 product changes were copied; only test allocation roots use the requested portability principle.

## Executable scope and discovery

`cli/src/lib/execution-evidence.ts` provides strict schema validation, JSON input loader, deterministic safe canonical rendering,
canonical checkpoint parser and optional close-receipt evidence parser. Lifecycle and CLI checkpoint/close validate before writes,
reject malformed/invalid/duplicate evidence, preserve transaction/identity/checklist guards, store evidence in the checkpoint/receipt,
and reference the evidence receipt/latest checkpoint through existing handoff context. No handoff schema expansion.
No new central service and no historical Python parser parity refactor. The new Python tests consume the portable schema directly.

## Executed verification

- `npm test`: 48 passed, 0 failed, 0 skipped.
- `npm run typecheck`: exit 0.
- `npm run test:pack`: exit 0; actual installed tarball init/validate/status + legacy two-session resume + evidence session,
  invalid-input preservation, receipt/handoff references, and two shipped examples against shipped schema.
- Source metadata: exit 0, package/lockfile/README/CHANGELOG/kernel/manifest agree; product 2.1.5 and kernel 2.1.0.
- Python: 112 passed, 0 failed (including 16 evidence schema tests and the existing validator/migration/checklist regressions).
- Total automated test cases: 160 passing, plus typecheck/pack/metadata gates. Four test-first vertical slices; five saved initial RED logs
  (Node and Python docs tests count separately). Earlier SPDX and Ajv failures are explicitly recorded in the TDD checkpoint.

All final product checks ran serially at `ccba8c6fe5fb83eea355b56b1994989710d899de`; only own ignored state/advisory registry differed during runs.
No clean builds ran concurrently. The pristine configuration prevented using the lifecycle CLI for this repository's own boot,
so the own session closes manually per the immutable handoff ritual without changing PROJECT_RULES.
JOURNAL promotion is explicitly owner-deferred. No other pair's state or AGENTS_MAP changed.

## Retained real log artifacts

- `/home/mmilanez/lead-protocol-46-final-npm-test.log` — SHA-256 `8f1b8f4c9ce053542d2d5043b4ae9e769242df876f6d59fb256e1abf681a3325`.
- `/home/mmilanez/lead-protocol-46-final-typecheck.log` — SHA-256 `8f30c0aba98bd71a715742ac94da29cb984b8a0039fc1e15c787072872a7912c`.
- `/home/mmilanez/lead-protocol-46-final-pack.log` — SHA-256 `1a2ee2c8e73422bee57fcfa0bd3f4dee00a97ee78981ebcbc9b4a4f596b76a00`.
- `/home/mmilanez/lead-protocol-46-final-metadata.log` — SHA-256 `00d3416e99f9299db29045db2d0bbe08de064b2c44529d7f34b1947cdec1b2c2`.
- `/home/mmilanez/lead-protocol-46-full-python-final.log` — SHA-256 `2cdffef4e52d4d6fff38e736fbc2043daaa9c3778f375b01ca498d46d9cc99b2`.

## Changed files at tested commit (including inherited scoped coordination)

- `.agents/CORE_RULES.md`
- `.agents/PROTOCOL_RULES.md`
- `.agents/checkpoints/2026-09-12T082400_hermes_issue46-layout.md`
- `.agents/checkpoints/2026-09-12T083317_codex_issue46-plan-crossreview.md`
- `.agents/checkpoints/20260912T082802_claude_issue46-execution-evidence-plan.md`
- `.agents/decisions.jsonl`
- `.agents/manifest.json`
- `.agents/schemas/README.md`
- `.agents/schemas/execution-evidence.schema.json`
- `.agents/scripts/test_execution_evidence.py`
- `CHANGELOG.md`
- `README.md`
- `cli/README.md`
- `cli/package.json`
- `cli/scripts/test-pack.mjs`
- `cli/src/commands/checkpoint.ts`
- `cli/src/commands/session.ts`
- `cli/src/lib/execution-evidence.ts`
- `cli/src/lib/session-lifecycle.ts`
- `cli/test/evidence-cli.test.mjs`
- `cli/test/execution-evidence.test.mjs`
- `cli/test/session-lifecycle.test.mjs`
- `cli/tsup.config.ts`

## Execution Evidence

```json
{
  "execution_evidence": {
    "git": {
      "branch": "mike/issue46-execution-evidence",
      "commit": "ccba8c6fe5fb83eea355b56b1994989710d899de",
      "files_changed": 23
    },
    "environment": {
      "runtime": "Node.js v22.22.0; Python 3.12.3; Linux 6.8.0-138-generic x86_64",
      "package_manager": "npm 11.8.0",
      "cwd": "/home/mmilanez/workspaces/lead-protocol-46"
    },
    "checks": [
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "artifact": "/home/mmilanez/lead-protocol-46-final-npm-test.log"
      },
      {
        "command": "npm run typecheck",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "artifact": "/home/mmilanez/lead-protocol-46-final-typecheck.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "artifact": "/home/mmilanez/lead-protocol-46-final-pack.log"
      },
      {
        "command": "node scripts/check-release-metadata.mjs 2.1.5 --source-only",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "artifact": "/home/mmilanez/lead-protocol-46-final-metadata.log"
      },
      {
        "command": "python3 -m pytest .agents/scripts/ -q",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "passed",
        "artifact": "/home/mmilanez/lead-protocol-46-full-python-final.log"
      },
      {
        "command": "Independent Opus exact-diff review / hosted CI",
        "result": "not_run",
        "reason": "Independent review and approved scoped external publication are the next Hermes-owned gates; no push or CI dispatch authorized for this worker."
      }
    ],
    "browser_validation": {
      "performed": false,
      "result": "not_run",
      "reason": "This change provides CLI/protocol/schema behavior; no applicable browser UI flow."
    },
    "unresolved": [
      "PENDING independent Opus exact-diff review; no self-approval.",
      "No hosted CI, external publication, merge, release, tag, npm publish or issue closure performed.",
      "Full logs are machine-local; Hermes must publish accessible artifacts with the reviewed change. Canonical checkpoints retain summaries and hashes.",
      "Structural evidence validation cannot establish execution truth, completeness, applicability or integrity of remote artifacts.",
      "Python validate_state.py and CLI validate retain handoff/decisions scope; evidence consumers are the dedicated TS library and lifecycle inputs.",
      "Own session uses manual ritual because repository PROJECT_RULES Active modules remains pristine; no config guard bypass."
    ]
  }
}
```

## Own close references

Manual receipt: `.agents/local/mike/codex/receipts/2026-09-12-0833-codex-close.json`.
Own handoff: `.agents/local/mike/codex/handoff.md`. Shared evidence and resume entrypoint: this checkpoint.
Hermes next gate: independent Opus review of `ccba8c6fe5fb83eea355b56b1994989710d899de` plus the final coordination-only diff; publish only after the independent gate.

## Own close verification

Own handoff and decisions passed the shipped Python state validator (2 files); real mission evidence, manual receipt and shared checkpoint passed the TS evidence validator. Own registry row removed; no peer rows changed. These are structural/self-verification results, not independent approval.

- `/home/mmilanez/lead-protocol-46-own-close-validation.log` — SHA-256 `51ca70955c4817eff37fee1814eb4388e74276466941a30c804d1f0a62e97715`.
- `/home/mmilanez/lead-protocol-46-canonical-evidence-validation.log` — SHA-256 `a5420eb31f317800775ffcc1e61b8f906decc7359023ff5f6237b8df66e40fbe`.
