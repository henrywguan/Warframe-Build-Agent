---
name: inventory-import
description: Parse pasted owned gear and mod lists to personalize recommendations and progression advice.
---

# Inventory import

## When to use

Player pastes an inventory export, owned-mods list, or bullet list of frames/weapons/mods and wants advice scoped to what they own.

## Steps

1. **Parse input** — accept common formats:
   - Bullet or comma-separated names
   - In-game **Public Export** JSON/text (when provided)
   - OCR/loadout paste from screenshot flow (see screenshot-qa skill)
2. Normalize names (Prime vs normal, rank, vaulted shorthand) — fuzzy-match against catalog:
   - `npm run knowledge -- lookup "<item>"` to confirm spelling and existence
3. Build an **owned / missing** matrix for the stated goal (frame build, weapon upgrade, mod farm list).
4. Feed results into:
   - **progression-profile** — what to do next
   - **recommend-build** — only suggest mods they lack or cheaper swaps they own
   - **farm-vs-buy** — skip owned tradable parts
5. Do not store secrets; treat paste as session context only unless the repo adds persistent inventory files.
6. Flag **unrecognized lines** and ask for clarification rather than guessing.

## Output shape

- **Parsed summary** (counts: frames, weapons, key mods)
- **Recognized vs unknown** items
- **Owned for this goal** / **still need**
- **Personalized recommendation** (build or progression)
- **Farm or buy list** (missing only)
- **Next step** (re-paste export, run lookup on unknowns)
