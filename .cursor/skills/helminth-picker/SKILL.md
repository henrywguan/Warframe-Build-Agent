---
name: helminth-picker
description: Recommend Helminth subsumed abilities by player goal, frame role, and content type.
---

# Helminth picker

## When to use

Player asks what ability to subsume, which frame to feed, or how Helminth improves a build for a specific role.

## Steps

1. Lock **goal**: survivability, energy, strip, buff, CC, speed, helminth-charge DPS, or mission type (SP, arbitration, Eidolon, open world).
2. Ground Helminth and ability facts in the offline pack:
   - `npm run knowledge -- lookup "Helminth"`
   - `npm run knowledge -- lookup "<ability or donor frame>"`
3. Identify **donor frame** availability (quest/MR) and **resource cost** ( bile, etc.) from digest — do not invent costs.
4. Match subsume to **slot conflict**: replace weakest ability on the host frame; note augments that stay relevant.
5. Compare **2–3 options** with tradeoffs (e.g. Roar vs Eclipse vs Perspicacity vs Energized Dash).
6. Cross-check cached builds: `npm run knowledge -- builds "<host frame>"` for common community subsume choices when present.
7. Note **one-time unlock** vs repeat resource farming for rank-up.

## Output shape

- **Host frame + goal**
- **Top subsume pick** (with why)
- **Alternatives** (budget / niche)
- **Donor frame** + acquisition note
- **Ability to replace** on host
- **Resource / MR prerequisites**
- **Next step** (farm bile, test in simulacrum, check builds cache)
