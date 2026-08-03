# Command list (`/list`)

Type **`/list`** in the mobile web chat or in this Cursor Warframe agent chat to see available commands.

## Mobile web chat slash commands

| Command | What it does |
| --- | --- |
| `/list` | Show this command list |
| `/help` | Alias for `/list` |
| `/summary` | Live worldstate summary |
| `/fissures [sp\|steel] [tier]` | Live Void Fissures |
| `/cycles` | Open-world cycle timers |
| `/sortie` | Today's Sortie |
| `/invasions` | Active invasions + rewards |
| `/alerts` | Active alerts + rewards |
| `/market <slug>` | Live Warframe.market price |
| `/market-changes` | Daily 4pm Pacific market scrape changes |
| `/patches [n]` | Latest official updates/hotfixes |
| `/hotfix` | Alias for `/patches` |
| `/patch-changes` | Daily 4pm Pacific newly listed patch notes |

Offline **item facts** use `lookup_local_knowledge` (WFCD + Wiki). **Builds** prefer Overframe cache / YouTube / agent-calculated — see [`docs/source-policy.md`](source-policy.md).

| Cursor command | What it does |
| --- | --- |
| `/knowledge` | Pull or query the offline knowledge pack (see `.cursor/commands/knowledge.md`) |

Plain-language questions still work (builds, comparisons, mechanics).

## Cursor / agent chat (`/list`)

When the user types `/list` (or `/help`), reply with:

1. The mobile slash commands above
2. Useful local CLI commands:

```bash
npm run wf -- summary
npm run wf -- fissures --steel-path
npm run wf -- cycles
npm run market -- price mirage_prime_set
npm run market -- changes
npm run patches -- latest
npm run patches -- changes
npm run knowledge -- status
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- pull
npm run web:dev
```

3. Remind that market + patch scrapes refresh around **4pm Pacific**
