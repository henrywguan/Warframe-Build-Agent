---
name: offline-knowledge
description: Look up the local offline Warframe knowledge pack (wiki digests + cached Overframe builds with mods/arcanes).
version: 0.2.0
metadata:
  hermes:
    tags: [Warframe, Wiki, Overframe, Offline]
    category: warframe
---

# Offline knowledge

## When to use

- Operator asks about frame/weapon facts, digests, or mechanics context the pack can answer
- Before inventing item stats from memory
- Before recommending builds (local Overframe cache first)

Requires a Warframe-Build-Agent checkout with `data/knowledge/` populated (`terminal.cwd` → repo root).

## Steps

1. Check pack: `npm run knowledge -- status`
2. Query: `npm run knowledge -- lookup "<item>"`
3. For builds, honor markers:
   - `LOCAL_BUILDS_AVAILABLE` → compare local Overframe mods/arcanes
   - `ONLINE_SEARCH_CONFIRMATION_REQUIRED` → ask yes/no before online search
4. To refresh:
   - `npm run knowledge -- pull` (catalog + wiki + Overframe when reachable)
   - `npm run knowledge -- crawl-overframe` (top 2 builds + mods/arcanes; residential network recommended)

## Notes

- The Hermes profile does **not** ship the full knowledge pack (too large; regenerable).
- Cloudflare often blocks Overframe from datacenter IPs — crawl on a residential network or use `--import-builds`.
