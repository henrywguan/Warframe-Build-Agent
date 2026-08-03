# Warframe sources

Use these in order when gathering evidence. Note disagreement reasons when sources conflict.

## Priority

For **web chat + overlay** source routing (offline facts vs build sources), see [`docs/source-policy.md`](source-policy.md). Summary: prefer the local knowledge pack for facts; for builds prefer Overframe → YouTube (cited) → agent-calculated.

1. **Repo docs** — `docs/warframe-status.md`, `docs/source-policy.md`, and this file for how to interpret live data and terminology.
2. **Local knowledge pack** — offline WFCD + Wiki digests (`data/knowledge/`, `npm run knowledge -- …`) for item/mechanic facts without live web browsing.
3. **Warframe Status API** — live worldstate, cycles, alerts, fissures, invasions, sorties, events. Docs: https://docs.warframestat.us/ — client: `npm run wf -- …`
4. **Official patch notes** — updates/hotfixes from https://www.warframe.com/en/patch-notes. Daily 4pm Pacific checks: `npm run patches -- …` and [`docs/warframe-patch-notes.md`](warframe-patch-notes.md).
5. **Official Warframe Wiki** — mechanics, drop tables, weapon/Warframe stats, quests, systems: https://wiki.warframe.com/ (also cached in the knowledge pack).
6. **Overframe** — community builds and popular setups: https://overframe.gg/ (popularity ≠ always optimal; check patch age). Prefer pack cache when present.
7. **YouTube creator builds** — when the player cites a creator/video, or as a named public approach; never invent fake URLs.
8. **Agent-calculated builds** — synthesize for the stated goal when Overframe/YouTube evidence is thin (overlay action cards are always this path).
9. **Warframe Market** — trade prices and availability via `https://api.warframe.market/v2/` and https://warframe.market/ (volatile; always caveat). Daily 4pm Pacific snapshots: `npm run market -- …` and [`docs/warframe-market.md`](warframe-market.md).
10. **Current public web** — recent guides and secondary writeups when wiki/API lag a patch (not the default for facts the pack already covers).

## How to reconcile differences

| Conflict type | Likely cause | What to tell the player |
| --- | --- | --- |
| Stat mismatch | Patch not reflected everywhere | Prefer wiki + latest `npm run patches -- latest` / hub notes; note uncertainty |
| Build disagreement | Role/budget/playstyle differ | State the goal each build serves |
| Price mismatch | Market moves fast; snapshots are listings not clears | Prefer latest `data/market/` snapshot + live `npm run market -- price <slug>`; give a range, not a hard quote |
| Timer / event mismatch | API cache or platform path | Prefer Status CLI; default `pc` (cross-play / mobile) |

## Default platform

- Use **`pc`** unless the user specifies otherwise.
- Warframe is cross-play; mobile and PC share the same practical worldstate for this agent.
- Status API non-PC platform prefixes currently redirect to PC; do not invent platform-specific live data.
