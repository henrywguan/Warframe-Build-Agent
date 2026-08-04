---
name: source-hygiene
description: Enforce local knowledge pack first, explicit consent before online build search, and correct tool choice per surface.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Offline, Policy, Builds]
    category: warframe
---

# Source hygiene

## When to use

Any build, compare, or fact request — especially when local Overframe cache is missing or operator pasted a loadout.

## Procedure

1. Follow `references/source-policy.md` — offline pack first, not live web browsing for facts.
2. **Facts:** `npm run knowledge -- lookup` — never live-browse when pack can answer.
3. **DPS:** `npm run knowledge -- dps|compare-dps` — do not invent numbers.
4. **Loadouts:** `npm run knowledge -- compare-loadout` after OCR or pasted mods.
5. **Builds:**
   - `LOCAL_BUILDS_AVAILABLE` → compare locally
   - Missing → ask yes/no before Overframe / YouTube / online search
   - After **yes** → community search; never invent video URLs
   - **No** → agent-calculated + local facts only
6. Live tools only for worldstate (`npm run wf`), market (`npm run market`), patches (`npm run patches`).
7. Name source in every build answer.
8. Without pack tools in shell, say so and still ask before claiming online search.

## Output shape

- Evidence used (pack, local builds, CLI, live tool)
- Consent status (not needed / asked / granted / declined)
- Answer
- Caveat if pack stale or online blocked
- Next step
