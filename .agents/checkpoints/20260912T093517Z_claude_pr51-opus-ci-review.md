# Checkpoint — PR51 CI test-newline-portability — independent Opus bounded CI review

> Timestamp: 2026-09-12T09:35:17Z
> Agent: [Mike / Claude]
> Actor: mike
> Reviewer model (real): Claude Opus 4.8 (claude-opus-4-8)
> Frozen HEAD: 2d95885fd57f4615424e02f87c893a1fbcaf0957
> Base of prior published PR51: 7c01e85
> Delta audited (ONLY): 7c01e85..HEAD (be227c6 RED → 9eaa974 fix → 2d95885 docs)
> Scope: review-only, no product edits, product read-only. Independent of any unmerged PR.

## Verdict: APPROVED

The Windows/Node18 hosted CI failure (run 34685900906, `1c46c61` merge of `7c01e85` into `66995ea`;
`/home/mmilanez/lead-protocol-51-ci-failure.log`) was a **test-only** line-ending portability defect and
is correctly remediated. The bounded delta captures a deterministic RED first and then applies a minimal,
extraction-only fix; every original assertion is preserved and no product/parser/schema/kernel/version/
config/credential surface changes. All executable gates are green at the frozen HEAD. This records review,
not approval-to-ship; owner retains the merge/release gate.

## Root cause (from the hosted failure log)

On `windows-latest`, `PROTOCOL_RULES.md` was checked out with CRLF line endings. The docs-example test
extracted illustrative JSON fences with an LF-only regex (`/```json\n([\s\S]*?)\n```/g`), so on CRLF no
fence matched → `examples.length` was `0`, failing `assert.equal(..., 2)` with `expected 2 / actual 0`
(`execution-evidence.test.mjs:43`). 65/66 passed; only this subtest failed. This is a test portability
bug, not a parser/product bug — the runtime evidence parser is not on this LF-assuming path.

## What changed (delta 7c01e85..HEAD), verified by source inspection

`git diff --name-only 7c01e85..HEAD` → exactly three files, no product/parser/schema/kernel source:
- `cli/test/execution-evidence.test.mjs` (+17/-15) — the only code change, split across two commits:
  - **be227c6 (RED, "capture LF and CRLF docs-example regression")** — wraps the single illustrative
    test in a `[['LF','\n'],['CRLF','\r\n']]` loop and normalizes the file with
    `.replace(/\r?\n/g, newline)`, deterministically materializing both line endings regardless of the
    checkout. The extraction regex is deliberately left LF-only here, so the CRLF case fails — a genuine
    RED that reproduces the hosted Windows signature on any platform.
  - **9eaa974 (GREEN fix, "accept CRLF in illustrative example extraction")** — the single minimal
    change: relaxes the extraction regex to `/```json\r?\n([\s\S]*?)\r?\n```/g` (optional CR at both
    fence boundaries). Nothing else in the test body changes.
- `.agents/checkpoints/2026-09-12T093150_codex_pr51-ci-portability.md` (+126) — codex remediation record.
- `.agents/decisions.jsonl` (+1, `[Mike / Codex]`).

The two illustrative examples and every inner assertion are byte-identical to the pre-delta test — only
the surrounding loop and the two-boundary `\r?\n` were added:
`assert.equal(examples.length, 2)`, `validateEvidence`, the four-status
`Set(['passed','failed','not_run','blocked'])` deep-equal, `git.{branch,commit}`,
`environment.{runtime,cwd,ci_run,package_manager}`, `checks.some(c => c.artifact)`,
`browser_validation.evidence`, and both normative-text matches (`/optional globally/i`,
`/must not be marked complete solely because files were changed/i`).

## Independent execution — deterministic RED, then GREEN gates at frozen HEAD

RED reproduced independently: swapped in the `be227c6` version of the test file only, ran the focused
subtest, restored HEAD (working tree clean afterward, 0 pending changes).

| Check | Result |
|---|---|
| RED: focused illustrative test @ be227c6 test-file | **FAIL as expected** — `ok LF` / `not ok CRLF` `expected 2 actual 0`, exit 1 (matches hosted Windows) |
| `cli/ npm test` @ HEAD | PASS 67/67 (0 fail/skip/todo); illustrative `(LF)` + `(CRLF)` both `ok` |
| `cli/ npm run typecheck` | PASS (exit 0) |
| `cli/ npm run test:pack` | PASS — installed evidence roundtrip, invalid-input preservation, receipt+handoff refs |
| `node scripts/check-release-metadata.mjs 2.1.5` | PASS (package/lockfile/README/CHANGELOG/kernel/manifest/bundle agree on 2.1.5) |
| `git diff --check 7c01e85..HEAD` | clean |

Gates run serially from `cli/`. Logs: `/home/mmilanez/lead-protocol-51-opus-ci-{red,test,typecheck,testpack,metadata}.log`.

Python suite intentionally **not** re-run: the diff is test-only and touches no `.agents/scripts/` or
state-schema surface, so scope did not expand (per mission). No product behavior, versions, rules,
workflows, credentials, or configuration changed.

## Mission verification points

1. **Deterministic LF+CRLF RED before the fix** — CONFIRMED (reproduced on Linux/Node22: LF pass, CRLF
   fail `expected 2 actual 0`; commit order be227c6 RED precedes 9eaa974 fix).
2. **Exactly two illustrative examples** — CONFIRMED (`assert.equal(examples.length, 2)` unchanged and
   green for both line endings; PROTOCOL_RULES.md still carries exactly two `execution_evidence` fences).
3. **Unchanged schema/status/reference assertions** — CONFIRMED (inner assertion block byte-identical to
   pre-delta).
4. **Newline-safe extraction** — CONFIRMED (`\r?\n` at both boundaries; `.replace` insulates the test
   from checkout `autocrlf`).
5. **No product/parser/schema/kernel/version/config change** — CONFIRMED (test + two state files only;
   metadata 2.1.5 / kernel 2.1.0 unchanged and consistent).

## Execution Evidence

```json
{
  "execution_evidence": {
    "git": {
      "branch": "mike/issue46-execution-evidence",
      "commit": "2d95885fd57f4615424e02f87c893a1fbcaf0957"
    },
    "environment": {
      "runtime": "Node.js v22.22.0 on Linux",
      "package_manager": "npm 11.8.0",
      "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
      "ci_run": "local independent review; hosted failing run 34685900906 (Windows/Node18) not re-executed locally"
    },
    "checks": [
      {
        "command": "node --test --test-name-pattern='illustrative closeout' test/execution-evidence.test.mjs (be227c6 test file)",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "failed",
        "reason": "Deterministic RED reproduction: LF ok, CRLF not ok, expected 2 actual 0; exit 1. Working tree restored to HEAD afterward.",
        "artifact": "/home/mmilanez/lead-protocol-51-opus-ci-red.log"
      },
      {
        "command": "npm test",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "67/67 passed, 0 fail/skip/todo; illustrative (LF) and (CRLF) both ok; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-opus-ci-test.log"
      },
      {
        "command": "npm run typecheck",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "tsc --noEmit exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-opus-ci-typecheck.log"
      },
      {
        "command": "npm run test:pack",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Packed tarball installs and runs like production; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-opus-ci-testpack.log"
      },
      {
        "command": "node scripts/check-release-metadata.mjs 2.1.5",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46/cli",
        "result": "passed",
        "reason": "Release metadata 2.1.5 consistent across package/lockfile/README/CHANGELOG/kernel/manifest/bundle; exit 0.",
        "artifact": "/home/mmilanez/lead-protocol-51-opus-ci-metadata.log"
      },
      {
        "command": "root Python suite (uv pytest .agents/scripts/) + validate_state.py",
        "cwd": "/home/mmilanez/workspaces/lead-protocol-46",
        "result": "not_run",
        "reason": "Test-only diff; no .agents/scripts/ or schema surface touched, scope did not expand — Python rerun not required per mission.",
        "artifact": "n/a"
      }
    ],
    "browser_validation": {
      "evidence": "n/a — CLI/test-only change, no browser surface."
    },
    "unresolved": [
      "Hosted Windows/Node18 rerun not performed locally; portability verified via deterministic LF/CRLF reproduction on Linux/Node22.",
      "Owner retains merge/release gate; Hermes may verify/publish under owner authorization. No push/PR/merge/release/issue-closure by this reviewer.",
      "JOURNAL promotion owner-deferred per mission (no-wait scope)."
    ]
  }
}
```

## Prior review status

Prior FINAL product review APPROVED at b8c57ed (`20260912T092151Z_claude_issue46-opus-final-composition-rereview.md`)
**remains applicable** — this delta is CI-portability-only, does not touch the writer/parser/schema/kernel,
and does not alter any acceptance criterion. All prior review checkpoints stand byte-for-byte as the audit trail.

## Attribution

The two code/state commits (be227c6, 9eaa974) and the docs commit (2d95885) are git-authored by
`leadsolutions-mike` (env `actor=mike`) with generic `[Mike / Codex]` message prefixes; the
`decisions.jsonl` entry is signed `[Mike / Codex]`. Recorded accurately; no history rewrite required or performed.

## Exclusions

Review-only, no product edits. No push / PR / merge / release / tag / publish / issue-closure. Package 2.1.5
and kernel 2.1.0 unchanged. No profiles / config / credentials / `AGENTS_MAP` touched. JOURNAL promotion
owner-deferred. RED reproduction confined to a temporary in-place swap of the be227c6 test file, restored
immediately (working tree clean). Owner retains the merge gate.

— Claude Opus 4.8 as [Mike / Claude] — APPROVED — SHA 2d95885fd57f4615424e02f87c893a1fbcaf0957.
