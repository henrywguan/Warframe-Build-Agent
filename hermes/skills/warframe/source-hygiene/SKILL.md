---
name: source-hygiene
description: Enforce local knowledge pack first, then always-on Hermes online crawl for missing community builds, and correct tool choice per surface.
version: 0.4.1
metadata:
  hermes:
    tags: [Warframe, Offline, Policy, Builds]
    category: warframe
---

# Source hygiene

## When to use

Any build, compare, or fact request — especially when local Overframe cache is missing or operator pasted a loadout.

## Procedure

1. Follow `../recommend-build/references/source-policy.md` — offline pack first for facts.
2. **Facts:** `npm run knowledge -- lookup` — fetch public pages only when the pack cannot answer.
3. **DPS:** `npm run knowledge -- dps|compare-dps` — do not invent numbers.
4. **Loadouts:** `npm run knowledge -- compare-loadout` after pasted mods (Hermes has no screenshot OCR — ask for paste; web UI Attach is fine).
5. **Builds:**
   - `LOCAL_BUILDS_AVAILABLE` → compare locally (widen online if Operator asks or cache looks thin)
   - Missing → **crawl immediately** (`community-search` / Agent Reach / Overframe paths). Never ask yes/no.
6. Live tools for worldstate (`npm run wf`), market (`npm run market`), patches (`npm run patches` / `patches -- detail`).
7. Name source in every build answer.
8. Without pack tools in shell, say so; still use Agent Reach / Jina for public pages when helpful.

## Output shape

- Evidence used (pack, local builds, CLI, live crawl, Agent Reach)
- Online status (`local-pack` | `live-crawl` | `crawl-failed-fallback`)
- Answer
- Caveat if pack stale or crawl blocked
- Next step
