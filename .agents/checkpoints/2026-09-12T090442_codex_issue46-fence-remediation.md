# Checkpoint — issue46 fenced evidence remediation

> Author: [Mike / Codex]
> Timestamp: 2026-09-12T09:04:42.910900+00:00
> Session: 2026-09-12-0859-codex
> Branch: mike/issue46-execution-evidence
> Exact implementation SHA: c4b3ddca0bc7b72433580eeee3a2c19c71716675
> Independent Opus exact-SHA re-review: **PENDING**

Sources: canonical initial review `20260912T085432Z_claude_issue46-opus-exact-diff-review.md` (CHANGES REQUESTED at 71c7b88, preserved), canonical plan `20260912T082802_claude_issue46-execution-evidence-plan.md`, Hermes layout correction `2026-09-12T082400_hermes_issue46-layout.md`, owner mission `/home/mmilanez/lead-protocol-26-46-mission.md`, bounded remediation instruction and separate Hermes probe.

## Changes and review disposition

- F1/F2 implemented: minimal deterministic line scanner in `cli/src/lib/execution-evidence.ts` recognizes the reserved column-zero heading only outside fenced spans. Tracks backticks/tilde, length, up to three leading spaces, valid closing suffix, and CRLF offsets. Shorter/mixed illustrative fences do not terminate outer spans. No markdown dependency or other parser rewrite.
- Existing canonical JSON/envelope/schema validation and duplicate real-section rejection remain unchanged. Omission returns before schema load; lifecycle rendering is untouched.
- Regression coverage: backtick/tilde, longer/nested examples, single illustrative JSON never extracted, unclosed spans, invalid backtick info string, LF/CRLF, real canonical evidence before/after quoted headings, real malformed/duplicate sections. Lifecycle exact bytes with absent schema; installed binary exact bytes/no extraction, explicit evidence coexistence and all-files state snapshot on malformed rejection.
- F3: restored only package description's literal em dash to main. Product remains 2.1.5; kernel remains 2.1.0; no contract-text or metadata changes, so no gratuitous version bump. AGENTS_MAP and peer state untouched.

## Executed TDD and serial gates

Tests committed first as `6f5d8c1`; scanner/package description committed as `c4b3ddca0bc7b72433580eeee3a2c19c71716675` only after GREEN. Before implementation, full npm RED exited 1 (48 pass / 11 fail), installed pack RED exited 1 on quoted legacy body, expanded parser RED exited 1 (4 pass / 11 fail, including both single fake-evidence extractions). After implementation: full npm GREEN 61/61, typecheck, installed pack GREEN, metadata, Python 112/112, and unchanged Hermes probe all passed in serial order. Three wrong-working-directory command attempts are retained separately and are not represented as regression failures.

Logs remain machine-local, but this committed checkpoint preserves commands, results, failure descriptions, test chronology and SHA-256 hashes. A valid evidence object does not attest execution truth. Reviewer should freeze the final branch HEAD (implementation SHA above plus this coordination-only close commit) and issue an independent verdict. No self-approval; Hermes verification/publication comes after Opus.

## Log integrity

| Log | SHA-256 |
|---|---|
| `lead-protocol-46-fence-fix-green.log` | `7ba3eff6d76b61a73a053570a84f10332cab4c03d259de1a39155662fa5c07fa` |
| `lead-protocol-46-fence-fix-hermes-probe.log` | `833aa640c4fc2428d9a5befef9e2b53a093c517cc7117531b4ce677390c00b28` |
| `lead-protocol-46-fence-fix-metadata-command-error.log` | `a973bafa88bcd66867b074864aebc53fee00cc6a57b55fe65db290fb0414d70d` |
| `lead-protocol-46-fence-fix-metadata.log` | `d98559e05ebd1f62129feaf3c2026e006e0783ce1de8fe28023a96acadb28b6c` |
| `lead-protocol-46-fence-fix-pack-green.log` | `c23e748b4c76a554082072ddc89dba800778d07ce67da97af06c160552c334db` |
| `lead-protocol-46-fence-fix-pack-red.log` | `72ada615f998cdab859dfd275d0faadb8ede8c8ea468fe40274c085d0a60fd68` |
| `lead-protocol-46-fence-fix-parser-red.log` | `c4009ccac066f0aaedc62adb3e96b3a3256c92cb4b19c30f30338e35a95e5fa0` |
| `lead-protocol-46-fence-fix-python.log` | `6aa2065358cc30f21d0c797bf6871885916001a077b4d562f7c7624533b58d5a` |
| `lead-protocol-46-fence-fix-red.log` | `e3f7a81084dd7041a150d2644582eb0878033ed09bae9b7e299b842e3401906e` |
| `lead-protocol-46-fence-fix-root-command-error.log` | `d4bafcfaf17d96868b6a49d0df13666aa691971bc54f0fb077c0c7b8b4b95836` |
| `lead-protocol-46-fence-fix-root-green-command-error.log` | `a70f4fa6cd07cddec4e9d6a7e769d7167058d3dd0918ca8fd60082cdcd4ee0ad` |
| `lead-protocol-46-fence-fix-typecheck.log` | `c39b469b1e9861ccd75d2d4665ca22815f702c74b2061ea4d101fd275e0650a9` |

## Execution Evidence

```json
{
  "execution_evidence": {
    "git": {
      "branch": "mike/issue46-execution-evidence",
      "commit": "c4b3ddca0bc7b72433580eeee3a2c19c71716675",
      "files_changed": 5
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
        "reason": "Regression-first, old parser: 48 passed, 11 new tests failed; exit 1.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-red.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "failed",
        "reason": "Old installed binary rejected legacy fenced examples with Duplicate execution evidence sections; exit 1.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-pack-red.log"
      },
      {
        "command": "node --test test/execution-evidence.test.mjs",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "failed",
        "reason": "Old parser: 4 passed, 11 failed, including two single-example fake-evidence extractions; exit 1.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-parser-red.log"
      },
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "61 passed, zero failed/skipped.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-green.log"
      },
      {
        "command": "npm run typecheck",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-typecheck.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0; installed binary preserves exact LF header/CRLF body without evidence schema, extracts no fake evidence, rejects malformed outside section without any .agents file change, accepts quoted body plus --evidence.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-pack-green.log"
      },
      {
        "command": "node scripts/check-release-metadata.mjs 2.1.5",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Exit 0; product 2.1.5, kernel 2.1.0.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-metadata.log"
      },
      {
        "command": "uv run --with pytest --with jsonschema pytest .agents/scripts/ -q",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "passed",
        "reason": "112 passed; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-python.log"
      },
      {
        "command": "node /home/mmilanez/lead-protocol-46-hermes-fence-probe.mjs",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "passed",
        "reason": "Exit 0; both Hermes backtick/tilde reproductions pass.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-hermes-probe.log"
      },
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "failed",
        "reason": "Command invoked from wrong directory; retained as setup error, not regression evidence. Correct CLI-directory invocation above completed.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-root-command-error.log"
      },
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "failed",
        "reason": "Command invoked from wrong directory; retained as setup error, not regression evidence. Correct CLI-directory invocation above completed.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-root-green-command-error.log"
      },
      {
        "command": "node scripts/check-release-metadata.mjs 2.1.5",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "failed",
        "reason": "Command invoked from wrong directory; retained as setup error, not regression evidence. Correct CLI-directory invocation above completed.",
        "artifact": "/home/mmilanez/lead-protocol-46-fence-fix-metadata-command-error.log"
      },
      {
        "command": "Independent Opus exact-SHA re-review / hosted CI",
        "result": "not_run",
        "reason": "PENDING: Opus independently reviews next, then Hermes verifies and publishes; no external actions in this worker scope."
      }
    ],
    "unresolved": [
      "Independent Opus re-review PENDING; initial CHANGES REQUESTED checkpoint preserved byte-for-byte.",
      "GREEN ran on test commit 6f5d8c1 with only the scanner/package-description changes subsequently committed unchanged as c4b3ddca0bc7b72433580eeee3a2c19c71716675. Registry-only manual session state was dirty; no product changes after GREEN.",
      "Machine-local logs retained with hashes and durable summaries here; Hermes must publish accessible artifacts as appropriate.",
      "No push, PR, merge, release, tag, issue closure, hosted CI or browser execution. JOURNAL remains owner-deferred; no mission-progress writes."
    ]
  }
}
```

## Session-close verification

2026-09-12: `uv run --with jsonschema python .agents/scripts/validate_state.py .agents/local/mike/codex/handoff.md .agents/decisions.jsonl` passed (2 files). Dedicated TS parsers validated this canonical evidence and own receipt and asserted equality. Applicable own artifacts carry today’s date; own registry row is absent. Initial failed review, AGENTS_MAP, protocol, manifest and registry have zero net diff from remediation base `7c39296`. No new project-level lesson; own working-directory lesson appended. JOURNAL remains owner-deferred under the bounded no-wait mission.

Close-validation log SHA-256: `51ca70955c4817eff37fee1814eb4388e74276466941a30c804d1f0a62e97715` (`/home/mmilanez/lead-protocol-46-fence-fix-close-validation.log`).
