---
name: world-state
description: Interpret Warframe live world-state data such as alerts, fissures, invasions, sorties, events, cycles, Baro, and Nightwave using Warframe Status.
---

# World-state interpretation

## When to use

Player asks what is up right now, what a Status field means, or needs timers/cycles/events for planning.

## Steps

1. Default platform **`pc`** (PC + mobile / cross-play) unless the user overrides.
2. Fetch via CLI when freshness matters:
   - `npm run wf -- summary`
   - or a specific command (`fissures`, `sortie`, `cycles`, …)
3. Explain what the data means for the player (reward value, Steel Path fissure, invasion side, etc.).
4. Cite source: Warframe Status (`api.warframestat.us`) and note API timing can lag slightly.
5. Do not invent expired or missing events; empty lists are valid.

## Field reference

See [docs/warframe-status.md](../../../docs/warframe-status.md).

## Output shape

- **What’s live** (bullets or short table)
- **Why it matters / what to run**
- **Timers** (humanized)
- **Caveat:** data can change; platform default `pc`
- **Next step** (related farm or build tip)
