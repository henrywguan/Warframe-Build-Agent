# Warframe sources

Use these in order when gathering evidence. Note disagreement reasons when sources conflict.

For build vs fact routing detail, see `../recommend-build/references/source-policy.md`.

## Priority

1. **Repo docs / source policy** — how to interpret live data; Hermes always-online community search (never yes/no).
2. **Local knowledge pack** — offline WFCD + Wiki digests + cached Overframe builds (`npm run knowledge -- …`).
3. **Warframe Status API** — live worldstate, cycles, alerts, fissures, invasions, sorties, events. Docs: https://docs.warframestat.us/ — client: `npm run wf -- …`
4. **Official patch notes** — https://www.warframe.com/en/patch-notes — client: `npm run patches -- …`
5. **Official Warframe Wiki** — mechanics, drop tables, weapon/Warframe stats: https://wiki.warframe.com/ (also cached in the knowledge pack).
6. **Overframe** — community builds: https://overframe.gg/ — prefer local cache; crawl when missing (Hermes always online).
7. **YouTube creator builds** — when cited or fetched live; never invent fake URLs.
8. **Agent-calculated builds** — synthesize for the stated goal when cache/online evidence is thin.
9. **Warframe Market** — `https://api.warframe.market/v2/` — volatile listings; daily 4pm Pacific snapshots via `npm run market -- …`
10. **Current public web** — secondary writeups when wiki/API lag a patch (not the default for facts the pack covers).

## How to reconcile differences

| Conflict type | Likely cause | What to tell the Operator |
| --- | --- | --- |
| Stat mismatch | Patch not reflected everywhere | Prefer wiki + `npm run patches -- latest`; note uncertainty |
| Build disagreement | Role/budget/playstyle differ | State the goal each build serves; name the source |
| Price mismatch | Market moves fast | Prefer latest snapshot + live `npm run market -- price <slug>` |
| Timer / event mismatch | API cache or platform path | Prefer Status CLI; default `pc` |

## Default platform

- Use **`pc`** unless the Operator specifies otherwise.
- Warframe is cross-play; mobile and PC share the same practical worldstate for this agent.
