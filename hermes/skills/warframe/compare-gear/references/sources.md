# Warframe sources

Use these in order when gathering evidence. Note disagreement reasons when sources conflict.

## Priority

1. **Repo docs** — `docs/warframe-status.md` and this file for how to interpret live data and terminology.
2. **Warframe Status API** — live worldstate, cycles, alerts, fissures, invasions, sorties, events. Docs: https://docs.warframestat.us/ — client: `npm run wf -- …`
3. **Official Warframe Wiki** — mechanics, drop tables, weapon/Warframe stats, quests, systems: https://wiki.warframe.com/
4. **Overframe** — community builds and popular setups: https://overframe.gg/ (popularity ≠ always optimal; check patch age).
5. **Warframe Market** — trade prices and availability via `https://api.warframe.market/v2/` and https://warframe.market/ (volatile; always caveat). Daily 4pm Pacific snapshots: `npm run market -- …` and [`docs/warframe-market.md`](warframe-market.md).
6. **Current public web** — patch notes, recent guides, when wiki/API lag a patch.

## How to reconcile differences

| Conflict type | Likely cause | What to tell the player |
| --- | --- | --- |
| Stat mismatch | Patch not reflected everywhere | Prefer wiki + recent patch notes; note uncertainty |
| Build disagreement | Role/budget/playstyle differ | State the goal each build serves |
| Price mismatch | Market moves fast; snapshots are listings not clears | Prefer latest `data/market/` snapshot + live `npm run market -- price <slug>`; give a range, not a hard quote |
| Timer / event mismatch | API cache or platform path | Prefer Status CLI; default `pc` (cross-play / mobile) |

## Default platform

- Use **`pc`** unless the user specifies otherwise.
- Warframe is cross-play; mobile and PC share the same practical worldstate for this agent.
- Status API non-PC platform prefixes currently redirect to PC; do not invent platform-specific live data.
