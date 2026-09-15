# JOURNAL.md — Project biography

> Version: 1.0 | Added: Lead Protocol v2.0.0
> Curated timeline of structurally significant deliveries on this project. Append at the bottom (oldest-first). Newest entries at the tail — read with `tail`, not `head`.

Each entry follows:

```
## YYYY-MM-DD | <actor> | <short title>

Two to five lines describing *what* was delivered and *why*. Never the *how*.
Refs: <commit/PR, or files touched> (optional)
```

Entries go here when a reader arriving in six months would still benefit from seeing them. Otherwise the event belongs in `local/<actor>/<agent>/activity.log`, not here.

Promotion is explicit — at session close, the agent asks whether the session produced a structurally significant delivery. No heuristic, no auto-detection.

When this file grows past ~500 lines, move the older entries into `archive/JOURNAL-<year>.md`.

---

*(No entries yet — this file accumulates as the project ships.)*

## 2026-09-13 | mike | Knowledge-map contribution delivered for maintainer review

Delivered the issue18 knowledge-map contribution through fork PR55: project-owned
INDEX discovery, same-session pointer maintenance and safe create-only seed adoption.
The change makes canonical project knowledge easier to locate without treating a
missing map as missing evidence. Independent review, local package verification and
all six hosted checks passed; integration and release remain with maintainers.
Refs: https://github.com/mmilanez/lead-protocol/pull/55; verified feature head efe284c7001f57d113b6b8cfd0e7ab8b5e30c3cc.
