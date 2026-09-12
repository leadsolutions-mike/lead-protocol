# @leadsolutions/lead-protocol

CLI tooling for the [Lead Protocol](https://github.com/mmilanez/lead-protocol) — a multi-agent coordination framework.

## Quick Start

```bash
npx @leadsolutions/lead-protocol init
```

This copies `.agents/` into your project and generates `CLAUDE.md` and `AGENTS.md` with the boot procedure. Then edit `.agents/PROJECT_RULES.md` to set your project identity — same as the [manual setup](https://github.com/mmilanez/lead-protocol#quick-start), minus the copy-paste.

## Installation

No installation required — use `npx`:

```bash
npx @leadsolutions/lead-protocol <command>
```

Or install globally:

```bash
npm install -g @leadsolutions/lead-protocol
lead-protocol <command>
```

## Commands

### `session open`

Open a verifiable session, register it without disturbing peer rows, transition
the pair-local handoff to `IN_PROGRESS`, and write a SHA-256 boot receipt.

```bash
lead-protocol session open \
  --actor marco \
  --agent codex \
  --signature "[Codex / GPT-5]" \
  --topic "Implement issue #28" \
  --json
```

Actor resolution is `--actor`, `LEAD_PROTOCOL_ACTOR_ID`,
`.agents/local/WHOAMI.txt`, then `user@host`. Agent resolution is `--agent`,
`LEAD_PROTOCOL_AGENT_ID`, `--tool-signature` through `AGENTS_MAP.md`, then a
timestamped unknown-agent fallback. Receipts are stored under the gitignored
`.agents/local/<actor>/<agent>/receipts/` directory.

### `checkpoint`

Create a UTC-named shared checkpoint for the active pair and update only that
session's checkpoint pointer. The body comes from `--file` or stdin.

```bash
lead-protocol checkpoint --actor marco --agent codex \
  --title architecture-locked --file checkpoint-body.md --json
```

### `session close`

Validate state, remove only the current session row, write the terminal
handoff, and emit a close receipt. Closing is deliberately explicit:

```bash
lead-protocol session close \
  --actor marco --agent codex \
  --journal not-significant \
  --status stable \
  --last-action "Lifecycle verified." \
  --pending-step None \
  --confirm-checklist \
  --json
```

Use `--journal significant --journal-entry-confirmed` when the session produced
a structurally significant delivery and the JOURNAL entry already exists.
Close never reports success after validation, ownership, checklist, or
optimistic concurrency failure.

### Reproducible two-session resume

After the close example above, open the same pair again:

```bash
lead-protocol session open --actor marco --agent codex \
  --topic "Resume from prior handoff" --json
```

The new receipt contains the first session's terminal state under
`previousHandoff`, including `status`, `last_action`, `pending_step`, blockers,
and open threads. This is also exercised against the installed npm tarball by
`npm run test:pack`.

### `init`

Initialize Lead Protocol in the current directory.

```bash
lead-protocol init        # Asks for confirmation
lead-protocol init --yes  # Skip confirmation
```

What it does:
- Installs `.agents/` framework and project seeds (actor-local state is never seeded or written)
- Creates `CLAUDE.md` and `AGENTS.md` with `<lead-protocol>` tagged boot procedures
- Creates `.gitignore` with the protocol entries if none exists, or appends any missing ones if it already exists

Any existing `.agents` entry blocks init, including partial or malformed installations;
`--yes` only skips the confirmation prompt. Use `update` to preserve project state.
Explicit `init --force` overlays bundled framework and project seeds, preserving
`.agents/local/` and files absent from the bundle. It does not delete orphan files.
Use force only when deliberately resetting project seeds.

### `update`

```bash
lead-protocol update --dry-run  # Inspect without writes
lead-protocol update            # Confirm before applying
lead-protocol update --yes      # Apply without prompting
```

Updates the nearest installation to the framework bundled with this CLI:
`CORE_RULES.md`, `PROTOCOL_RULES.md`, `manifest.json`, `modules/`, `schemas/`,
and `scripts/`. Existing project state (including checkpoints, sessions and the
agent map) stays byte-identical; missing project seeds are created. Actor-local
state is never scanned, seeded or written. Framework orphans are reported and
never deleted. Partial pre-manifest installs can be repaired by update.

Both init and update refresh the first complete `<lead-protocol>` block in
`CLAUDE.md` / `AGENTS.md`, preserving every byte outside it; when no complete
block exists they append one without trimming user content. Missing protocol
`.gitignore` entries are appended. Repeated updates skip identical files.
Dry-run preflights these paths too and writes nothing; its per-file listing
covers `.agents`, with guideline blocks and `.gitignore` refreshed on apply.

All planned source/destination paths and existing ancestors are checked before
writes. Symbolic links on these paths, malformed file/directory types, and links
inside framework directories are refused without replacement or deletion.
A malformed nearest `.agents` entry fails instead of selecting a parent install.
Links inside actor-local state are left alone. This is static path validation,
not protection against concurrent filesystem replacement or hard-link aliases.
Multi-file writes are not transactional: permission changes, disk exhaustion or
other I/O failures during application can leave a partial update.

Based on Leonardo Buares's [PR #26](https://github.com/mmilanez/lead-protocol/pull/26),
with current-main integration and safety fixes for issues #25 and #40.

### `handoff`

Show the current handoff state for an (actor, agent) pair.

```bash
lead-protocol handoff                      # Auto-detect or select pair
lead-protocol handoff --pair user@pc/claude # Specific pair
lead-protocol handoff --raw                # Raw markdown
lead-protocol handoff --json               # JSON output
```

### `validate`

Validate protocol state files against their JSON schemas.

```bash
lead-protocol validate                         # Auto-discover all
lead-protocol validate .agents/decisions.jsonl  # Specific file (decisions.jsonl)
lead-protocol validate path/to/handoff.md        # Specific file (handoff.md)
```

Recognized files are matched by name: `decisions.jsonl` and `handoff.md`. Auto-discover checks `.agents/decisions.jsonl` plus every pair's `handoff.md`.

Exit codes: `0` = passed, `1` = validation errors, `2` = config errors.

### `status`

One-screen summary of the current protocol state. Product identity comes from
`.agents/manifest.json`; kernel identity is reported separately from
`PROTOCOL_RULES.md`. Legacy installations without a manifest report product
version `unknown` and never treat the `CORE_RULES.md` document revision as the
protocol version.

```bash
lead-protocol status         # Formatted output
lead-protocol status --json  # JSON output
```

JSON output exposes `productVersion` and `kernelVersion` as separate fields.
For compatibility with existing v2.1.x consumers, `protocolVersion` remains as
a deprecated alias of `kernelVersion`; it never reads the `CORE_RULES.md`
document revision.

## How `<lead-protocol>` Tags Work

The CLI manages `CLAUDE.md` and `AGENTS.md` using XML-style tags:

```markdown
<lead-protocol>
# CLAUDE.md — Pointer for Claude Code
...boot procedure...
</lead-protocol>
```

- **New file** → creates with the tagged block
- **Existing file, no tags** → appends the tagged block (your content is preserved)
- **Existing file, has tags** → replaces content between tags (idempotent)

## Requirements

- Node.js >= 18.0.0
- No dependency on git, Python, or any server
- Supported on Windows, macOS, and Linux

## License

Apache-2.0

