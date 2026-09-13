# Checkpoint — Issue18 bounded Windows CI remediation
> Author: [Mike / Codex]
> Session: 2026-09-13-0742-codex
> Timestamp: 2026-09-13 07:46 UTC
> Base: 87a622ac573d1d5cdad40cf093d0bb4587795a89
> Branch: feature-18-knowledge-map
> Fix SHA: the commit containing this checkpoint; exact SHA returned at close.

## Authorization and disposition
Executed the supplied bounded serial remediation brief under existing owner
implementation authorization. Previous worker exits are an orchestrator observation,
not a new human statement. J8 remains pristine; no modules inferred active.
No push, PR API write, merge, tag, release, dependency upgrade, skipped CI,
JOURNAL promotion or self-approval. No peer handoff, AGENTS_MAP or schema edits.
Historical Opus approval applies only to its recorded old SHA. Independent Opus
review of this fix and native Windows recheck are **PENDING** after this worker exits.

## Preserved native Windows RED
Hosted job: https://github.com/mmilanez/lead-protocol/actions/runs/34745706249/job/103693161992
Brief identifies Windows Server 2025, Node 18.20.8, PR head 87a622a merged with
base 66995ea. Read only the selected failing range (258–273) and summary (475–480)
of the supplied cached hosted log. Observed **55 tests, 54 passed, 1 failed,
0 skipped**. Durable failure excerpt:

```text
# Subtest: exclusive creation preserves racing regular files and rejects racing unsupported entries
not ok 15 - exclusive creation preserves racing regular files and rejects racing unsupported entries
  failureType: 'testCodeFailure'
  error: 'Missing expected exception.'
  code: 'ERR_ASSERTION'
  operator: 'throws'
  TestContext.<anonymous> (file:///D:/a/lead-protocol/lead-protocol/cli/test/init-index.test.mjs:152:17)
```

The original loop had no per-kind diagnostic. The log alone does NOT identify
which unsupported entry returned without throwing or prove a referent was created.
It is preserved as real native RED, separate from the deterministic model below.

## Root cause and confidence
The old helper attempted `writeFileSync(..., {flag: "wx"})` before inspecting the
current destination. Its only destination type check was behind `EEXIST`.
Unsupported entries arriving after the initial preflight therefore depended on OS
exclusive-create behavior to reach refusal.

Primary sources consulted:
- [Node 18.20.8 filesystem flags](https://nodejs.org/download/release/v18.20.8/docs/api/fs.html#file-system-flags): Windows maps O_EXCL|O_CREAT to CREATE_NEW; dangling-link rejection is explicitly described for POSIX.
- [Node 18.20.8 bundled libuv Windows fs.c](https://github.com/nodejs/node/blob/v18.20.8/deps/uv/src/win/fs.c#L474-L572): fs__open selects CREATE_NEW and calls CreateFileW without an OPEN_REPARSE_POINT flag for this path.
- [Microsoft CreateFileW symbolic link behavior](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#symbolic-link-behavior): without OPEN_REPARSE_POINT, opening an existing symbolic link returns a target handle. This is supporting context, not an explicit dangling CREATE_NEW reproduction.

High confidence in the missing install-time type check as the contract defect.
The dangling-link referent-create mechanism is the strongly supported diagnosis
from the native failure, case ordering and platform source/docs, but remains an
inference until a named native rerun/probe confirms it. No native Windows runtime
is available locally; Linux PowerShell would not supply that evidence.

## Minimal change and regression coverage
`cli/src/lib/index-seed.ts` reuses lstat-based isRegularOrMissing at install entry,
before the write. Existing regular maps return preserved without modification;
unsupported entries are refused. Missing destinations still use wx and retain the
EEXIST reinspection, preserving regular maps arriving at the write boundary.
The original pure initial preflight remains before any init mutation.

`cli/test/init-index.test.mjs` retains all four real-filesystem race cases as
separately named tests; unsupported cases still require an INDEX error. Snapshots
now include the race fixture's external referents, including their absence.
Initial source/destination preflight tests additionally assert the dangling
referent stays absent. A private filesystem adapter loads the actual transpiled
helper without global mocks or a production injection API. One deterministic
case models link-following exclusive create and requires refusal before any write;
one verifies real EEXIST preservation when a regular file arrives at the write.

No whole-init rollback or arbitrary hostile replacement races are solved. An entry
can still change between the new lstat and open; that existing scope exclusion is
explicit in the code. Product 2.1.5 and all shared rules/manifest versions unchanged.

## Observed local RED/GREEN and validation
Serial execution on Linux, Node v22.22.0, Python 3.11.15. Logs are local
`/tmp/issue18-windows-{red,green,npm,typecheck,pytest,pack,metadata,state}.log`.
Canonical results are retained here so the evidence does not depend on those logs.

Before any production edit, command:
`node --test --test-name-pattern='exclusive creation|link-following exclusive' cli/test/init-index.test.mjs`
returned exit 1, **4 passed, 1 failed, 0 skipped**. The deterministic case failed
with `unsupported entry must be refused before a write can create its referent`,
expected writes 0, actual 1. The four real Linux race cases passed. This is modeled
unit RED, not a claim to reproduce native Windows locally.
After the four-line production edit, the same command returned exit 0,
**5 passed, 0 failed/skipped**. The later EEXIST boundary test is included in the
full validation below.

| Gate | Command | Observed result |
|---|---|---|
| Node/build | `npm --prefix cli test` | 63 passed, 0 failed/skipped; exit 0 |
| Typecheck | `npm --prefix cli run typecheck` | exit 0 |
| Full Python | `uv run --with pytest --with jsonschema python -m pytest .agents/scripts/ -q` | 152 passed in 5.90s; exit 0 |
| Actual package | `npm --prefix cli run test:pack` | 23 passed, 0 failed/skipped (17 installed-runtime + 6 source-helper cases), plus installed legacy two-session lifecycle; exit 0 |
| Metadata | `node cli/scripts/check-release-metadata.mjs 2.1.5` | source/bundle metadata agree; exit 0 |
| Diff | `git diff --check` | exit 0 |
| Native Windows | named real-filesystem tests on hosted Node 18 Windows | PENDING; not run locally |

The full npm increase from 58 to 63 is three extra named cases replacing the old
aggregate, plus two new adapter tests. No test was removed or newly skipped.

## Close and review handoff
Own registry row removed, own handoff/activity updated, decisions appended.
No additional personal lesson separate from this regression evidence. The shared
lesson entry points here for the platform-specific finding. Existing generic root
INDEX has no affected helper/test anchor, and J6 already inventories checkpoints
and LESSONS; no navigation update is needed. No existing location or anchor changed.
JOURNAL promotion remains pending an explicit owner response; none was inferred.
Post-final-handoff state result is recorded below before commit. Review the exact
containing SHA, unchanged initial preflight ordering, named native cases, referent
preservation and remaining lstat/open race limitation.

Post-final-handoff full workspace state: `uv run --with pytest --with jsonschema python .agents/scripts/validate_state.py` returned exit 0, **4 files OK**. The pending JOURNAL checkbox is explicit; schema validation is not promotion consent. Final diff check passed.
