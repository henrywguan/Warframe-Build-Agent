---
name: world-state
description: Interpret live Warframe world-state — alerts, fissures, invasions, sorties, arbitration, Darvo, construction, events, and cycles.
version: 0.4.0
metadata:
  hermes:
    tags: [Warframe, Worldstate, Status]
    category: warframe
    related_skills: [market-prices, arbitration-guide]
---

# World-state interpretation

## When to use

Player asks what is up right now, what a Status field means, or needs timers/cycles/events.

## Procedure

1. Default platform **`pc`** (PC + mobile / cross-play) unless overridden.
2. Fetch live data when freshness matters. Prefer shell tools if the Warframe-Build-Agent repo is available:

```bash
npm run wf -- summary
npm run wf -- alerts
npm run wf -- fissures [--steel-path] [--tier Neo]
npm run wf -- invasions
npm run wf -- sortie
npm run wf -- archon-hunt
npm run wf -- nightwave
npm run wf -- void-trader   # Baro
npm run wf -- steel-path
npm run wf -- cycles
npm run wf -- events
npm run wf -- arbitration
npm run wf -- darvo         # alias: daily-deals
npm run wf -- construction  # Fomorian / Razorback
npm run wf -- get <field>   # raw JSON for any worldstate child
```

   Otherwise use Warframe Status HTTP: `https://api.warframestat.us/pc/...`
3. Explain what the data means for the player.
4. Cite source and note API timing can lag slightly.
5. Do not invent expired/missing events; empty lists are valid.

## References

- `skill_view("world-state", "references/warframe-status.md")`

## Output shape

- What’s live
- Why it matters / what to run
- Timers (humanized)
- Caveat: data can change
- Next step
