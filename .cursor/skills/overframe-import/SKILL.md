---
name: overframe-import
description: Import Overframe top builds via browser console, HTML parse, or Playwright CDP into the local knowledge pack.
---

# Overframe import

## When to use

Maintainer or player wants fresh community builds in `data/knowledge/builds/by-item/` when Node crawl is Cloudflare-blocked.

## Steps

1. Read [`docs/overframe-crawl.md`](../../../docs/overframe-crawl.md) — **no Cloudflare bypass**; human-passed browser session required.
2. Check current status: `npm run knowledge -- status` (`overframeStatus` in manifest).
3. Pick import path:
   - **Option A — DevTools console:** paste `scripts/overframe-browser-extract.js` on item/build page → download JSON
   - **Option B — Save HTML:** `npm run knowledge -- parse-overframe-html ./path --import`
   - **Option C — Playwright CDP:** start Chrome with `--remote-debugging-port=9222`, pass Cloudflare, then:
     ```bash
     npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --limit 5
     npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
     ```
   - **Option D — live crawl** (often blocked): `npm run knowledge -- crawl-overframe`
4. Merge exports into `data/knowledge/builds-export.json` before `--import-builds` when accumulating.
5. Verify import: `npm run knowledge -- lookup "<item>"` shows `builds[]` with mods + arcanes.
6. If CDP re-triggers Cloudflare, fall back to Option A/B for that item.
7. Remind: imported builds enable `LOCAL_BUILDS_AVAILABLE` — no online search needed for those items.

## Output shape

- **Method used** (console / HTML / CDP / crawl)
- **Items imported** + count
- **manifest.json** status after import
- **Verify command** + sample lookup
- **Fallback** if blocked
