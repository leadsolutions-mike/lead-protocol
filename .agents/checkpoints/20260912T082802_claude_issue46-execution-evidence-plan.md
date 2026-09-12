# Checkpoint — issue46 execution_evidence: implementation plan (PLAN-READY)
> Session: 2026-09-12-0828-claude
> Timestamp: 2026-09-12 08:28
> Author: [Mike / Claude]
> Status: PLAN-READY
> Branch: mike/issue46-execution-evidence (base main @ 66995ea, v2.1.5)
> Scope: BLOCK2 of the PR26+issue46 mission. Block1 (PR26) delivered separately (PR50 c8fbad7); this branch is independent and must preserve the main baseline. No dependency on unmerged PR50.
> Cites Hermes layout correction `2026-09-12T082400_hermes_issue46-layout.md`: repository-root `.agents/` (mirrored by `cli/scripts/sync-templates.mjs`) IS the single distributable source — there is no separate `template/` tree; narrowly-scoped edits to root `.agents/PROTOCOL_RULES.md`, schemas and index references ARE authorized here, applying §P1 protocol-file versions + manifest kernel sync, keeping package/release at 2.1.5. This plan is consistent with that correction.

---

## Open question (what this plan answers)

How do we add a **standardized, optional, tool-neutral `execution_evidence`** contract to the Lead
Protocol **session-close / checkpoint** surfaces — with an *executable* validation path, statuses
`passed | failed | not_run | blocked` (reason required for the latter two), passing/failing/not_run/blocked
examples in **both** closeouts and checkpoints, and reproducible command/cwd/runtime/CI/artifact/
screenshot/branch/commit references — **without** breaking any existing workflow, without a product/release
bump, and without promising anything in docs that no code actually enforces?

---

## Decisive architectural finding (reshapes the naive design)

The obvious idea — add `execution_evidence` to `handoff.md` — is **ruled out** by an explicit, tested invariant:

- `PROTOCOL_RULES.md §P3` (Handoff schema, line 133): *"Schema is immutable — no agent may add sections,
  tables, or free paragraphs."*
- `.agents/schemas/README.md`: *"`additionalProperties: false` at every level — the handoff schema is
  immutable per §P3; no agent may add new sections or fields."*
- `handoff.schema.json` sets `additionalProperties: false` at root and every level; both parsers
  (`cli/src/lib/handoff-parser.ts`, `.agents/scripts/validate_state.py`) emit exactly the fixed 7 fields +
  8-item checklist; `test_checklist_contract.py` and `validate.test.mjs` lock this down.

Issue #46 itself scopes the feature to the **"session-close / checkpoint contract"** and its YAML sample is
*not* a handoff field. Therefore:

> **Decision:** `execution_evidence` is a **new, independent contract** attached to the **checkpoint** body
> and the **session-close receipt**, governed by a **new schema** and validated by the **CLI** (the only tool
> that will actually parse it). The immutable `handoff.md` schema and both handoff validators are **left
> untouched**. This is the minimal coherent solution with a genuine executable path and zero risk to the
> handoff invariant.

Why this satisfies the mission's guardrails:
- *"Narrowly extend both validators that actually parse it, not unrelated historical validator parity."*
  Evidence is **not** routed through `handoff.md`/`decisions.jsonl`, so the two handoff validators do not parse
  it and are not touched. The one component that parses evidence — the TS CLI — is the one extended. No forced
  Python parity (that is the "unrelated historical parity" the mission warns against; §P-Note below).
- *"Avoid docs promises unsupported by executable path."* Every documented example is validated against the
  new schema by an executable test that extracts the fenced examples from `PROTOCOL_RULES.md` and asserts they
  conform. The CLI validates any supplied evidence before it is written.
- *"Support omission without changed old behavior."* All new inputs are optional; omitting `--evidence`
  produces byte-identical checkpoint bodies and close receipts to today.

---

## The contract (portable, dependency-free encoding)

Conceptual shape (issue #46's YAML), encoded on disk as **JSON** (Python stdlib and Node both parse JSON with
zero new deps; YAML would need a new dependency in both runtimes and is avoided):

```json
{
  "git": { "branch": "feat/billing-retry", "commit": "abc1234", "files_changed": 8 },
  "environment": { "runtime": "node 22", "package_manager": "pnpm", "cwd": "/repo", "ci_run": "https://…/runs/123" },
  "checks": [
    { "command": "pnpm lint", "cwd": "/repo", "result": "passed" },
    { "command": "pnpm test", "result": "failed", "reason": "2 specs red in billing/retry", "artifact": "https://…/job/456" },
    { "command": "pnpm e2e", "result": "not_run", "reason": "requires external sandbox" },
    { "command": "pnpm deploy:staging", "result": "blocked", "reason": "awaiting owner release gate" }
  ],
  "browser_validation": { "performed": true, "flow": "Login → billing → retry", "result": "passed", "evidence": "screenshot-url" },
  "unresolved": ["E2E webhook test requires an external sandbox"]
}
```

Schema rules (all backward-compatible / additive):
- Whole object **optional**; every sub-section optional. An empty/absent evidence = today's behavior.
- `checks[].result` enum = `passed | failed | not_run | blocked`.
- **Conditional:** `reason` is **required** when `result ∈ {not_run, blocked}` (JSON-Schema `if/then`);
  recommended (not required) for `failed`; forbidden-noise-free for `passed`.
- Reproducible references live as first-class fields: `command`, `cwd`, `git.branch`, `git.commit`,
  `environment.runtime`, `environment.ci_run`, `checks[].artifact`, `browser_validation.evidence`.
- `browser_validation` optional; `performed:false` (or omission) = "not applicable" — keeps browser
  validation optional when inapplicable.
- `additionalProperties: false` on each object to keep the contract tight and catch typos.

---

## Normative rule (the "definition of done" the mission demands)

Add to `PROTOCOL_RULES.md §P3` (session-close ritual + checkpoint sections):

> **Execution-evidence rule.** An implementation task must **not** be marked complete solely because files
> were changed. Completion **records the validation that was executed** (commands + results, with reproducible
> references), **or explicitly states why validation could not be performed** (`not_run` / `blocked` with a
> `reason`). "Files edited" alone is never sufficient evidence of done.

Optionality is stated explicitly: `execution_evidence` is **optional globally** and **expected for
implementation/code/UI/infra tasks**; it is legitimately absent for read-only Q&A, docs-only, or pure-planning
sessions (this very planning session is an example — no evidence block required).

---

## Exact files & acceptance-criteria mapping

### Framework / kernel layer
1. **`.agents/schemas/execution-evidence.schema.json`** — NEW. Draft 2020-12 schema above.
   → AC-3 (status enum + reason for not_run/blocked), AC-4 (reproducible refs), AC-5 (all-optional ⇒ backward compat).
2. **`.agents/schemas/README.md`** — add table row + a "`execution-evidence.schema.json`" section (where it
   lives, that it is checkpoint/close-scoped, not a handoff field). → AC-1.
3. **`.agents/PROTOCOL_RULES.md`** — header bump `2.0.2 → 2.1.0`; add the normative rule + contract subsection
   under §P3 with **fenced JSON examples in BOTH the session-close ritual and the checkpoint section**, each
   covering `passed`, `failed`, `not_run`, `blocked`. Explicitly reaffirm the handoff schema stays immutable
   (evidence is a checkpoint/close artifact, not a 9th handoff field). → AC-1, AC-2, AC-4.
4. **`.agents/manifest.json`** — `kernel_version 2.0.2 → 2.1.0` via `npm run sync:manifest` (derives kernel
   from the PROTOCOL_RULES header). `product_version` stays **2.1.5**. → mission "protocol-file version bumps as
   required; no release bump."
5. **`.agents/CORE_RULES.md`** — OPTIONAL, light: one pointer line under "Session close must be verified"
   referencing the execution-evidence rule; bump CORE header `1.5.0 → 1.6.0` if edited. Recommended for
   discoverability; can be deferred without breaking anything.

### CLI / product layer (code)
6. **`cli/src/lib/execution-evidence.ts`** — NEW: `loadEvidence(file)`, `validateEvidence(data, schemasDir)`
   (reuses `ajv`, loads the new schema via `findSchemasDir`), `renderEvidenceMarkdown(data)` → a canonical
   `## Execution Evidence` section (human table + a fenced ```json block for machine re-parse). → executable path.
7. **`cli/src/lib/session-lifecycle.ts`** — extend `CheckpointOptions` and `CloseSessionOptions` with an
   optional `evidence?` (already-parsed object). In `createCheckpointUnlocked`: if evidence present, validate then
   append the rendered section to the body (checkpoint bodies are free-form → additive, safe; the flat-field and
   `- [ ]` regexes are not present in a JSON block, so nothing else is disturbed). In `closeSessionUnlocked`: add
   `execution_evidence` to the close-receipt JSON when present; type the close receipt (currently an inline
   literal) so the new optional field is explicit. → AC-2 (both surfaces), executable path.
8. **`cli/src/commands/checkpoint.ts`** — add `--evidence <path>`; read+`loadEvidence`+`validateEvidence`
   before calling `createCheckpoint`; on invalid evidence exit non-zero with a clear message. → executable path.
9. **`cli/src/commands/session.ts`** — add `--evidence <path>` to `session close`; same load+validate; pass to
   `closeSession`. → executable path + AC (close-with-evidence).

### Tests (authored FIRST — see RED/GREEN)
10. **`cli/test/execution-evidence.test.mjs`** — NEW: schema unit tests + the docs-examples test.
11. **`cli/test/session-lifecycle.test.mjs`** — EXTEND: checkpoint/close with and without evidence.
12. **`cli/package.json`** — add the new test file to the `test` script's node --test file list (no dep change).

### Metadata / packaging
13. **`CHANGELOG.md`** — populate the **existing** `## [Unreleased]` section (already present above `## [2.1.5]`)
    with the kernel-2.1.0 feature. Do **not** add a new dated release section ⇒ `check-release-metadata`'s
    "latest release = 2.1.5" stays green. Release is left to the owner. → mission "release left owner."
14. **`README.md`** — no version edit needed (`> Current version: **2.1.5**` unchanged; README does not hardcode
    the kernel number). OPTIONAL: one line advertising the evidence feature. `sync-templates` auto-bundles the new
    schema (it mirrors all of `.agents/`), so no packaging-script change is required.

Acceptance-criteria coverage summary:
- **AC-1** (docs define it + optionality) → files 2,3 (+5).
- **AC-2** (close + checkpoint examples: passing/failing/not-run, incl. blocked) → file 3 + tests 10.
- **AC-3** (passed/failed/not_run/blocked + reason for latter two) → file 1 + tests 10.
- **AC-4** (reproducible command/CI/artifact/screenshot/branch/commit refs) → files 1,3.
- **AC-5** (existing workflows backward-compatible) → all-optional; tests 11 assert byte-identical no-evidence output; handoff + Python validators untouched; full JS+Python suites stay green.

---

## Test-first plan (actual RED → GREEN)

Author tests before implementation and capture RED, then implement to GREEN.

**Schema/lib (`execution-evidence.test.mjs`)** — expected RED first (schema/lib absent):
- valid full evidence → passes.
- `result:"not_run"` **without** `reason` → **rejected**; with `reason` → accepted.
- `result:"blocked"` **without** `reason` → **rejected**; with `reason` → accepted.
- `result:"failed"` without `reason` → accepted (reason recommended, not required).
- invalid `result` enum → rejected.
- `additionalProperties` (typo key) → rejected.
- omitted `browser_validation` / minimal `{ "checks": [] }` / `{}` → accepted (backward compat).
- **docs-examples test:** extract every fenced ```json evidence block from `PROTOCOL_RULES.md` and assert each
  validates → binds docs to the executable schema (guards "no unsupported docs promise").

**Lifecycle (`session-lifecycle.test.mjs`)** — expected RED first (option unknown):
- `createCheckpoint({…, evidence})` → body contains `## Execution Evidence` and the fenced JSON; invalid
  evidence → `LifecycleError`.
- `closeSession({…, evidence})` → close receipt contains `execution_evidence`.
- **omission golden:** checkpoint body and close receipt with no evidence are **identical** to current output
  (locks backward compatibility).

**Full regression (must stay GREEN, unchanged):**
- `cli/`: `npm run typecheck && npm test` (build + session-lifecycle + status + validate + release-metadata).
- Python: `python -m pytest .agents/scripts/ -q` (currently 96 passing) — untouched, must stay 96.
- Pack: `npm run test:pack` (verifies the new schema ships in the tarball, live state stripped).
- Metadata: `node scripts/check-release-metadata.mjs 2.1.5 --source-only` must stay green after
  `npm run sync:manifest` (product 2.1.5 everywhere; kernel self-consistent at 2.1.0).

**Baseline captured this session (pre-change, green):**
- `npm test` → `# pass 40  # fail 0`.
- `pytest .agents/scripts/` → `96 passed`.
- `check-release-metadata 2.1.5 --source-only` → "package, lockfile, README, CHANGELOG, kernel, and source
  manifest agree on 2.1.5" (exit 0).
- `canonicalManifest` → `{product 2.1.5, kernel 2.0.2}`.
- Test fixtures hardcode their own versions (status.test 2.0.1, release-metadata.test 2.1.3, published-release
  v2.1.5) → a live kernel bump to 2.1.0 does **not** touch them.

---

## Implementation sequence (for Astra)

1. Author `execution-evidence.schema.json`.
2. Author tests 10–11 (+ wire 12); run → capture **RED**.
3. Implement lib 6, lifecycle 7, commands 8–9; `npm run build`; run tests → **GREEN**.
4. Docs: PROTOCOL_RULES §P3 rule + examples (file 3), schemas README (2), optional CORE pointer (5).
5. Version/metadata: bump PROTOCOL_RULES header 2.1.0 → `npm run sync:manifest` → manifest kernel 2.1.0;
   populate CHANGELOG `[Unreleased]` (13).
6. Full green gate: typecheck, `npm test`, `pytest .agents/scripts/`, `npm run test:pack`,
   `check-release-metadata 2.1.5 --source-only`.
7. Session-close artifacts on this branch **before** opening the PR (branch-ordering rule §P3).

---

## Risks & mitigations

- **R1 — Touching the immutable handoff schema.** Explicitly avoided; evidence lives only in checkpoint/close.
  Reviewers should reject any diff that adds a field to `handoff.schema.json` or the handoff parsers.
- **R2 — Checkpoint body corruption.** The rendered evidence section is pure markdown + a JSON fence; it contains
  no `**Label:**` or `- [ ]` lines, so `setField`/checklist regexes in the lifecycle never touch it. Test 11
  golden-locks this.
- **R3 — Version-bump semantics.** New rule/section ⇒ **minor** kernel bump per §P1 ("Minor (Y) for new
  sections/rules"): 2.0.2 → **2.1.0**. `product_version` (2.1.5, the npm release) is untouched, so no release
  bump. If a reviewer prefers a patch (2.0.3), metadata stays green either way as long as the PROTOCOL_RULES
  header and manifest agree; **2.1.0 is recommended** and this is a flagged judgment call for review.
- **R4 — Python parity pressure.** Deliberately **not** extending `validate_state.py` (it does not parse
  evidence). This is the "unrelated historical validator parity" the mission tells us to avoid; documented as an
  intentional, reviewable exclusion, not an oversight. A future PR may add a Python evidence validator if the
  pre-commit hook is later pointed at checkpoints.
- **R5 — YAML vs JSON encoding.** Chose JSON to avoid a new YAML dependency in both Node and Python; the issue's
  YAML is a "suggested" shape, honored structurally. Docs show the JSON encoding as canonical.
- **R6 — Backward compatibility.** Guaranteed by all-optional inputs + omission-golden tests + untouched handoff
  path + untouched Python suite.

---

## What specifically needs second-opinion (for Astra cross-review, then Opus review + Hermes verify)

1. Confirm the **checkpoint/close (not handoff)** placement is the right substrate given the immutable-handoff
   invariant. (Strong recommend: yes.)
2. Confirm **kernel 2.1.0** (minor) vs 2.0.3 (patch) — R3.
3. Confirm the **narrow CLI `--evidence` flag** is in-scope for BLOCK2 vs a docs+schema-only floor. (Recommend:
   include it — it is what makes the contract *validated/executable* rather than a prose promise.)
4. Confirm **not** extending `validate_state.py` is acceptable (R4).

**PLAN-READY.** Next: Astra cross-review + implementation on this branch; then independent Opus exact-diff review
(APPROVED/CHANGES REQUESTED); then Hermes reruns the full green gate and handles publication. JOURNAL promotion
deferred. Release gate remains the owner's.
