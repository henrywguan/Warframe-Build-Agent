---
name: offline-knowledge
description: Look up local offline Warframe knowledge pack (wiki digests + cached Overframe builds) for facts; use build-source policy for mod setups.
---

# Offline knowledge

## When to use

- Player asks about frame/weapon facts, digests, or mechanics context that the pack can answer
- After `npm run knowledge -- pull` has populated `data/knowledge/`
- Before inventing item stats from memory

## Steps

1. Check pack exists: `npm run knowledge -- status`
2. Query: `npm run knowledge -- lookup "<item>"`
3. In web chat, call tool `lookup_local_knowledge` with the item/topic
4. For **build** requests, follow [`docs/source-policy.md`](../../../docs/source-policy.md): Overframe cache rows → cited YouTube → agent-calculated. If Overframe builds are missing, say so and do not treat the wiki digest alone as a full build.

## Source policy reminder

Default = offline facts. Builds = Overframe / YouTube / agent-calculated. Live tools stay for worldstate, market, and patches.
