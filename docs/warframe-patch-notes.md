# Warframe patch notes daily check

Source hub: **https://www.warframe.com/en/patch-notes**  
Scheduled target: **4:00 PM America/Los_Angeles** (PST/PDT)

## What it does

Each day the job:

1. Fetches the official patch-notes hub HTML
2. Parses PC **Update** and **Hotfix** entries (titles, URLs, Newest flag, versions)
3. Saves a Pacific-date snapshot under `data/patches/`
4. Diffs against the previous snapshot to list **newly appeared** notes

## CLI

```bash
npm run patches -- status
npm run patches -- latest
npm run patches -- pull --force          # run now
npm run patches -- changes
npm run patches -- check                 # live fetch + write snapshot
```

Options: `--data-dir`, `--limit`, `--json`, `--force`.

## Saved files

| File | Meaning |
| --- | --- |
| `data/patches/snapshot-YYYY-MM-DD.json` | That Pacific day's hub listing |
| `data/patches/changes-YYYY-MM-DD.json` | New entries vs prior snapshot |
| `data/patches/latest-snapshot.json` | Newest snapshot |
| `data/patches/latest-changes.json` | Newest diff |

## Automation

GitHub Action [`.github/workflows/patch-notes-daily.yml`](../.github/workflows/patch-notes-daily.yml):

- Cron near 4pm Pacific (`23:00` and `00:00` UTC cover PDT/PST)
- Script exits cleanly if the current Pacific hour is not 16
- Commits updated `data/patches/*` when the pull runs

## Mobile web chat

The on-the-go UI (`web/`) can call:

- `get_patch_notes_latest` — live hub scrape (no env required)
- `get_patch_notes_daily_changes` — saved day-over-day diff via `PATCH_CHANGES_URL` (or local `data/patches/latest-changes.json` in dev)

See [`docs/web-chat.md`](web-chat.md).

## Caveats

- This tracks **what the hub lists**, not every forum post word-for-word
- “New” means newly present vs yesterday’s snapshot (first run is baseline only)
- Always open the linked patch notes for full details
- Hub HTML structure can change; if parsing breaks, checks will fail loudly
