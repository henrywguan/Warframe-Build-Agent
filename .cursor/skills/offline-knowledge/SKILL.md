---
name: offline-knowledge
description: Look up local offline Warframe knowledge pack (wiki digests + Overframe top builds) before inventing builds.
---

# Offline knowledge

## When to use

- User asks for builds, frame/weapon facts, mod context
- Live browsing is unnecessary or unavailable
- After `npm run knowledge -- pull` has populated `data/knowledge/`

## Steps

1. Check pack exists: `npm run knowledge -- status`
2. Query: `npm run knowledge -- lookup "<item>"`
3. In web chat, call tool `lookup_local_knowledge` with the item/topic
4. If Overframe builds are missing (`overframeStatus: blocked`), say so and use wiki/catalog stats + general advice; suggest re-pulling builds on a network that can reach overframe.gg or importing builds JSON

## Do not

- Invent precise Overframe rankings when the local pack has no builds for that item
- Treat local pack prices/timers as live (use Status/Market tools for those)
