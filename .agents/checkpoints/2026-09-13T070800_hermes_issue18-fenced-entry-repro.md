# Checkpoint — Hermes issue18 fenced-entry reproduction
> Timestamp: 2026-09-13 07:08 UTC
> Author: [Mike / Hermes]
> Reviewed product HEAD: 934c7cd865f219ea96d207057b1fff8035111592

## Finding: incomplete Markdown entry represented as complete
The shipped P-Access Python entry_page example finds Markdown entry boundaries with raw startswith('## ') lines. A level-two heading inside a fenced Markdown example is therefore mistaken for a new historical entry. This is an issue18-introduced recipe defect, independent of the earlier unrelated handoff parser work.

Hermes directly executed the extracted fenced Python code against this temporary JOURNAL fixture (no project source edits):

````markdown
## Actual entry
needle before fence
```markdown
## illustrative heading, not another entry
```
important final rationale
## Next entry
unrelated
````

`entry_page(file, 2)` returned text ending at the opening markdown fence, omitting the illustrative heading, closing fence and final rationale, with `next: null`. Expected: complete Actual entry until the true Next entry. Actual `complete: false`.

## Required resolution before publication
Add a failing regression for a relevant entry containing fenced headings, then either implement narrow fence-aware Markdown boundary handling or make the example safely refuse unsupported fenced input with explicit limitation. Do not silently signal complete retrieval while dropping the final rationale. Preferred minimal correction: recognize real unfenced level-two entry headings; test backtick and tilde fences, hits inside/after fence, adjacent entries, chunk continuation. No general Markdown library/crawler is required.

This finding is independent Hermes verification, not an Opus verdict. Opus's exact-SHA independent review was still running when this evidence was recorded. No product edits or publication performed by this probe.
