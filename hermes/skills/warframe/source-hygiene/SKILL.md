---
name: source-hygiene
description: Enforce local knowledge pack first, online opt-in before community build crawl, and correct tool choice per surface.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Offline, Policy, Builds]
    category: warframe
---

# Source hygiene

## When to use

Any build, compare, or fact request — especially when local Overframe cache is missing or operator pasted a loadout.

## Procedure

1. Follow `../recommend-build/references/source-policy.md` and `docs/source-policy.md` — offline pack first, not live web browsing for facts.
2. **Facts:** `npm run knowledge -- lookup` — never live-browse when pack can answer.
3. **DPS:** `npm run knowledge -- dps|compare-dps` — do not invent numbers.
4. **Loadouts:** `npm run knowledge -- compare-loadout` after pasted mods (Hermes has no screenshot OCR — ask for paste; web UI Attach is fine).
5. **Builds:**
   - `LOCAL_BUILDS_AVAILABLE` → compare locally
   - Missing → Online opted in (WebUI Online search toggle, or Operator said “search online” in Hermes) = crawl; otherwise stay local (never ask yes/no)
6. Live tools only for worldstate (`npm run wf`), market (`npm run market`), patches (`npm run patches` / `patches -- detail`).
7. Name source in every build answer.
8. Without pack tools in shell, say so and do not claim an online crawl unless the Operator opted in.

## Output shape

- Evidence used (pack, local builds, CLI, live tool, Agent Reach)
- Online status (`n/a` | `local-only` | `opted-in-crawl`)
- Answer
- Caveat if pack stale or online blocked
- Next step
