---
name: companion-setup
description: Configure Kubrow, Kavat, Sentinel, or Helminth Charger for Steel Path priming, strip, or utility.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Companion, Steel Path, Mods]
    category: warframe
---

# Companion setup

## When to use

Operator asks for a companion build — armor strip, viral primer, healing, loot, or SP survivability.

## Procedure

1. Lock companion type and operator frame role.
2. Ground mechanics: `npm run knowledge -- lookup "<companion or mod>"`.
3. Assign job: primer (viral), strip, buff, sustain, loot.
4. List core mods: Vaccinated, Enhanced Vitality, Link mods, precept (Fetch, Sharpened Claws).
5. For SP, prioritize companion survival (Link Health/Armor, Guardian awareness).
6. Match beast weapon element to squad strategy.
7. Mention frame alternatives (Khora/Venari, Djinn) when sentinel isn't optimal.

## Output shape

- Companion + role
- Precept / ability
- Core mods (ordered)
- Weapon element + stance
- Synergy with frame/squad
- Budget swaps
- Next step
