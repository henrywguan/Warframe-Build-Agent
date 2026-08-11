---
name: helminth-picker
description: Recommend Helminth subsumed abilities by player goal, frame role, and content type.
version: 0.3.0
metadata:
  hermes:
    tags: [Warframe, Helminth, Builds, Subsume]
    category: warframe
---

# Helminth picker

## When to use

Operator asks what to subsume, which donor frame, or how Helminth improves a build.

## Procedure

1. Lock goal: survivability, energy, strip, buff, CC, speed, or mission type.
2. Offline pack:
   - `npm run knowledge -- lookup "Helminth"`
   - `npm run knowledge -- lookup "<ability or donor>"`
3. Donor availability (quest/MR) + resource costs from digest only.
4. Match subsume to host slot conflict; note augments.
5. Compare 2–3 options with tradeoffs.
6. `npm run knowledge -- builds "<host frame>"` for community subsume patterns when cached.
7. One-time unlock vs repeat resource farming.

## Output shape

- Host frame + goal
- Top subsume pick + why
- Alternatives
- Donor frame + acquisition
- Ability to replace
- Prerequisites
- Next step
