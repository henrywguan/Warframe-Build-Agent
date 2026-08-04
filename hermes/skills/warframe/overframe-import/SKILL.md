---
name: overframe-import
description: Import Overframe top builds via browser console, HTML parse, or Playwright CDP into the local knowledge pack.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Overframe, Maintainer, Offline]
    category: warframe
    related_skills: [offline-knowledge, recommend-build]
---

# Overframe import

## When to use

Maintainer or operator wants fresh community builds when Node crawl is Cloudflare-blocked.

Requires repo checkout (`terminal.cwd` → repo root). See `references/overframe-crawl.md`.

## Procedure

1. Check status: `npm run knowledge -- status` (`overframeStatus`).
2. Pick path — **no Cloudflare bypass**; human-passed browser required:
   - **Console:** paste `scripts/overframe-browser-extract.js` on item/build page
   - **HTML:** `npm run knowledge -- parse-overframe-html ./path --import`
   - **CDP:** Chrome `--remote-debugging-port=9222`, pass Cloudflare, then:
     ```bash
     npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --limit 5
     npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
     ```
   - **Live crawl** (often blocked): `npm run knowledge -- crawl-overframe`
3. Merge into `builds-export.json` before `--import-builds` when accumulating.
4. Verify: `npm run knowledge -- lookup "<item>"` shows builds with mods + arcanes.
5. Fall back to console/HTML if CDP re-triggers Cloudflare.

## Output shape

- Method used (console / HTML / CDP / crawl)
- Items imported + count
- manifest status after import
- Verify command + sample lookup
- Fallback if blocked
