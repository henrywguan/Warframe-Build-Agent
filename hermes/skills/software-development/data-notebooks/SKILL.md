---
name: data-notebooks
description: Analyze CSV/JSON/notebook data with reproducible commands.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Data, CSV, JSON, Notebooks]
    category: software-development
    related_skills: [shell-discipline, reasoning-discipline, test-verify]
---

# Data & notebooks

Do lightweight data work with scripts the Operator can rerun — not opaque one-offs.

## When to use

- Inspect snapshots, logs, exports, rankings
- Jupyter/observable notebooks in the repo
- Don’t use for inventing statistics without the file

## Procedure

1. Locate the data file; note format and size.
2. Sample safely (`head`, `jq`, `python -c` with pandas/stdlib).
3. State the question; compute only needed aggregates.
4. Prefer a small script under `/tmp` or an existing analysis path over silent REPL magic.
5. Cite the file path + filter that produced the number.

## Quick reference

```bash
wc -l file.csv
head -n 5 file.csv
jq 'keys' file.json | head
python3 - <<'PY'
import json
from pathlib import Path
print(len(json.loads(Path("file.json").read_text())))
PY
```

## Pitfalls

- Loading multi‑GB files into memory blindly
- Editing source data instead of deriving views

## Verification

- Numbers tied to commands/paths
- Script or command is pasteable
