# Overframe crawl → local database

Process to collect [overframe.gg](https://overframe.gg/) **top 3 builds** (mods + arcanes) for Warframes/weapons into the local knowledge pack (`data/knowledge/`).

## Reality check (Cloudflare)

Overframe sits behind Cloudflare. There is **no public Overframe API**. Automated Node `fetch`, headless browsers, and many “scrapers” get a challenge page — even on home Wi‑Fi.

**Do not chase Cloudflare bypass tools.** The reliable approach is:

1. You open Overframe in a normal browser and pass the challenge as a human.
2. We extract the **text/JSON already in that tab** (`__NEXT_DATA__`), offline.
3. Import that JSON into the knowledge pack.

## Output layout

| Path | Contents |
| --- | --- |
| `data/knowledge/catalog/items.json` | WFCD warframes + weapons |
| `data/knowledge/builds/by-item/<id>.json` | Top 3 builds with `mods[]`, `arcanes[]`, URLs |
| `data/knowledge/mods/index.json` | Unique mods/arcanes seen across crawled builds |
| `data/knowledge/manifest.json` | Counts + `overframeStatus` |

---

## Recommended: browser extract (Cloudflare-safe)

### Option A — DevTools console snippet (best when automation fights you)

1. Open Chrome/Edge/Firefox, go to `https://overframe.gg`, pass Cloudflare.
2. Open an **item page** (shows top builds) or a **build page** (full mods).
3. DevTools → Console → paste the contents of [`scripts/overframe-browser-extract.js`](../scripts/overframe-browser-extract.js) → Enter.
4. A JSON file downloads (and is copied to the clipboard when allowed).
5. Merge / accumulate into `data/knowledge/builds-export.json`, then:

```bash
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
```

Tip: on an item page, if `__NEXT_DATA__` already embeds mod lists on the top cards, one paste can capture all three builds. If cards are links-only, open each top build and run the snippet again (the parse/import merge path will combine by item name).

### Option B — Save page as HTML, parse offline (text-only)

1. In your browser (after Cloudflare), open the item/build page.
2. Save page: **Ctrl+S** / **Cmd+S** → “Webpage, HTML only” into a folder, e.g. `data/knowledge/overframe-html/`.
3. Parse with no network:

```bash
npm run knowledge -- parse-overframe-html ./data/knowledge/overframe-html --import
# or write export only:
npm run knowledge -- parse-overframe-html ./page.html --out ./data/knowledge/builds-export.json
```

`--import` writes/merges `builds-export.json` and loads it into the pack.

### Option C — Playwright attached to your real Chrome (CDP)

Still uses a human-passed session; better for bulk once Option A works for a few items.

```powershell
# Close Chrome, then start with remote debugging:
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\wf-overframe-chrome"

# In that window: open overframe.gg, pass Cloudflare, leave it open.
npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --limit 5
npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --resume
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
```

If CDP navigations re-trigger Cloudflare, fall back to Option A/B for those items.

### Option D — live Node crawl (often blocked)

```bash
npm run knowledge -- crawl-overframe
npm run knowledge -- crawl-overframe --limit 10
```

When blocked, `overframeStatus` becomes `blocked` / `partial` and nothing is invented.

---

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

## What does *not* work (and why)

| Approach | Why it fails |
| --- | --- |
| Plain `curl` / Node `fetch` | Cloudflare challenge HTML, not the app |
| Headless Playwright/Puppeteer | Often challenged as a bot |
| “Cloudflare bypass” scrapers / captcha farms | Fragile, against site ToS, not something this repo supports |
| Imaginary Overframe public API | Does not exist |
| Third-party MCP “lookup_builds” tools | Still hit Overframe (same wall) unless they already cached data |

## Companions note

The WFCD catalog pull currently covers **warframes + weapons**. Companions need a catalog expansion before they appear in bulk export queues; you can still import companion rows manually via the JSON shape above (`itemName` matching).

## Agent use

After a successful import, build comparisons use local Overframe rows first (`lookup_local_knowledge` / `compare-loadout`). If builds are still missing for an item, the agent asks yes/no before any online search — see [`docs/source-policy.md`](source-policy.md).
