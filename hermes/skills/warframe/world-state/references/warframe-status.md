# Warframe Status — player-facing guide

API base: `https://api.warframestat.us`  
Docs: https://docs.warframestat.us/  
Default platform path: **`/pc`** (cross-play / mobile default in this project)

## Useful worldstate fields

| Field / CLI | Player meaning |
| --- | --- |
| `alerts` | Limited-time missions with rewards |
| `fissures` | Void Fissure missions; `isHard` ≈ Steel Path |
| `invasions` | Faction conflicts; farm for specific rewards |
| `sortie` | Daily 3-mission challenge with modifiers |
| `archonHunt` | Weekly Archon hunt rotation |
| `nightwave` | Seasonal challenges and standing |
| `voidTrader` / `voidTraders` | Baro Ki'Teer inventory/location when present |
| `steelPath` | Current Steel Path honor reward rotation |
| `cetusCycle` | Plains of Eidolon day/night |
| `vallisCycle` | Orb Vallis warm/cold |
| `cambionCycle` | Cambion Drift Fass/Vome |
| `duviriCycle` | Duviri spiral / mood cycle |
| `earthCycle` | Earth day/night |
| `zarimanCycle` | Zariman Grineer/Corpus flip |
| `events` | Limited events and community goals |
| `news` | Official news / update headlines |
| `arbitration` | Current Arbitration (when available) |
| `dailyDeals` | Darvo deals |
| `constructionProgress` | Fomorian / Razorback progress |

## CLI

```bash
npm run wf -- summary
npm run wf -- alerts
npm run wf -- fissures [--steel-path] [--tier Neo]
npm run wf -- invasions
npm run wf -- sortie
npm run wf -- archon-hunt
npm run wf -- nightwave
npm run wf -- void-trader
npm run wf -- steel-path
npm run wf -- cycles
npm run wf -- events
npm run wf -- arbitration
npm run wf -- darvo              # alias: daily-deals
npm run wf -- construction       # Fomorian / Razorback
npm run wf -- get <field>        # raw JSON for any worldstate child
```

Options shared by most commands:

- `--platform pc` (default; preferred for PC + mobile / cross-play)
- `--json` raw JSON instead of player-friendly text
- `--language en` (default)

## Timing caveats

- Expiry times are UTC ISO timestamps from the API; say “about X left” for players.
- Empty arrays (e.g. no alerts) are normal, not an error.
- Cache/CDN timing can lag a few minutes behind in-game UI.
- Always mention that live data can change while the player is reading the answer.
