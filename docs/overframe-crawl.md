# Overframe crawl → local database

Process to crawl [overframe.gg](https://overframe.gg/) for **every Warframe and weapon**, take the **top 2 builds**, scan **mods + arcanes** on each build page, and save into the local knowledge pack (`data/knowledge/`).

## Output layout

| Path | Contents |
| --- | --- |
| `data/knowledge/catalog/items.json` | WFCD warframes + weapons |
| `data/knowledge/builds/by-item/<id>.json` | Top 2 builds with `mods[]`, `arcanes[]`, URLs |
| `data/knowledge/mods/index.json` | Unique mods/arcanes seen across crawled builds |
| `data/knowledge/manifest.json` | Counts + `overframeStatus` |

## Commands

```bash
# Full crawl (catalog items → item pages → build pages → mods/arcanes)
npm run knowledge -- crawl-overframe

# Dev sample
npm run knowledge -- crawl-overframe --limit 10

# Refresh WFCD catalog first
npm run knowledge -- crawl-overframe --refresh-catalog

# When Cloudflare blocks this network: import a JSON export instead
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json

# Also available inside a full pack pull
npm run knowledge -- pull
```

## Cloudflare note

`overframe.gg` often returns a Cloudflare challenge from datacenter/CI IPs (and sometimes from Node `fetch` even on home Wi‑Fi). The crawler detects that (`overframeStatus: "blocked"`) and exits without inventing builds.

### Option A — Playwright browser export (recommended on laptops)

When plain `npm run knowledge -- crawl-overframe` stays blocked, use a real browser session.

**If Cloudflare loops** in the automated window, attach to normal Chrome instead:

```powershell
# 1) Close all Chrome windows, then:
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\wf-overframe-chrome"

# 2) In that Chrome tab, open https://overframe.gg and pass Cloudflare once

# 3) In another terminal (repo root):
npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --limit 5
```

Default (persistent real Chrome profile, no `--connect`):

```bash
npm install
npx playwright install chromium

# Smoke test
npm run knowledge:export-overframe -- --limit 5

# Full catalog (resume-safe)
npm run knowledge:export-overframe -- --resume

# Import into the local knowledge pack
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
```

Useful flags: `--out <file>`, `--delay <ms>`, `--headless`, `--skip-build-pages`, `--resume`, `--connect <cdp-url>`.

The exporter **does not reload** after you solve Cloudflare (reload was re-triggering the loop).

### Option B — residential Node crawl / manual JSON

Run `crawl-overframe` on a network that is not challenged, or hand-write JSON for `--import-builds` (shape below).

## Import JSON shape

See `data/knowledge/examples/builds-import.sample.json`:

```json
[
  {
    "itemName": "Coda Hema",
    "builds": [
      {
        "rank": 1,
        "name": "Build title",
        "forma": 3,
        "url": "https://overframe.gg/build/…",
        "mods": ["Serration", "Galvanized Chamber"],
        "arcanes": ["Primary Merciless"]
      }
    ]
  }
]
```

## Agent use

After a successful crawl, build comparisons use local Overframe rows first (`lookup_local_knowledge`). If builds are still missing for an item, the agent asks yes/no before any online search — see [`docs/source-policy.md`](source-policy.md).
