---
name: source-hygiene
description: Enforce local knowledge pack first, explicit consent before online build search, and correct tool choice per surface.
---

# Source hygiene

## When to use

Any build, compare, or fact request — especially when local Overframe cache is missing or the player pasted a loadout.

## Steps

1. Read [`docs/source-policy.md`](../../../docs/source-policy.md) — default is **offline pack first**, not live web browsing.
2. For **facts** (stats, mechanics, arcanes): `npm run knowledge -- lookup` — never live-browse when the pack can answer.
3. For **DPS**: `npm run knowledge -- dps|compare-dps` — do not invent numbers.
4. For **loadouts**: `npm run knowledge -- compare-loadout` after OCR or pasted mods.
5. For **builds**:
   - If `LOCAL_BUILDS_AVAILABLE` (cached Overframe/import) → compare locally
   - If missing → **ask yes/no** before Overframe / YouTube / online search (unless WebUI Online search toggle is on)
   - Only after **yes** → live community search; never invent video URLs
   - If **no** → agent-calculated + local facts only
6. Reserve live tools for **worldstate** (`npm run wf`), **market** (`npm run market`), **patches** (`npm run patches`).
7. Name the **source** in every build answer (Overframe cache / online after consent / agent-calculated).
8. On Hermes/overlay without pack tools, say so and still ask before claiming an online search.

## Output shape

- **Evidence used** (pack lookup, local builds, CLI, live tool)
- **Consent status** (not needed / asked / granted / declined)
- **Answer** (build or compare)
- **Caveat** if pack is stale or online blocked
- **Next step** (refresh pack, import builds, enable toggle)
