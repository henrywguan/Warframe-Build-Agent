---
name: offline-knowledge
description: Look up local offline Warframe knowledge pack (wiki, mechanics, arcanes, Overframe builds, DPS) for facts; use build-source policy for mod setups.
---

# Offline knowledge

## When to use

- Player asks about frame/weapon facts, digests, mechanics, or arcanes the pack can answer
- After `npm run knowledge -- pull` (or pull-mechanics / pull-arcanes) has populated `data/knowledge/`
- Before inventing item stats from memory

## Steps

1. Check pack exists: `npm run knowledge -- status`
2. Query: `npm run knowledge -- lookup "<item|mechanic|arcane>"`
3. In web chat, call tool `lookup_local_knowledge` with the item/topic
4. Loadout vs Overframe: `compare_loadout_to_overframe` (web) or `npm run knowledge -- compare-loadout …`
5. DPS: `estimate_modded_dps` (web) or `npm run knowledge -- dps|compare-dps …`
6. For **build** requests, follow [`docs/source-policy.md`](../../../docs/source-policy.md): Overframe cache → Online search toggle → agent-calculated.

## Source policy reminder

Default = offline facts (including mechanics + arcanes). Builds = Overframe / YouTube / agent-calculated. Live tools stay for worldstate, market, and patches.
