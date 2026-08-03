# Overframe crawl → local database

Process to crawl [overframe.gg](https://overframe.gg/) for **every Warframe and weapon**, take the **top 2 builds**, scan **mods + arcanes** on each build page, and save into the local knowledge pack (`data/knowledge/`).

## Output layout

| Path | Contents |
| --- | --- |
| `data/knowledge/catalog/items.json` | WFCD warframes + weapons |
| `data/knowledge/builds/by-item/<id>.json` | Top 2 builds with `mods[]`, `arcanes[]`, URLs |
| `data/knowledge/mods/index.json` | Unique mods/arcanes seen across crawled builds |
| `data/knowledge/manifest.json` | Counts + `overframeStatus` |

## Commands

```bash
# Full crawl (catalog items → item pages → build pages → mods/arcanes)
npm run knowledge -- crawl-overframe

# Dev sample
npm run knowledge -- crawl-overframe --limit 10

# Refresh WFCD catalog first
npm run knowledge -- crawl-overframe --refresh-catalog

# When Cloudflare blocks this network: import a JSON export instead
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json

# Also available inside a full pack pull
npm run knowledge -- pull
```

## Cloudflare note

`overframe.gg` often returns a Cloudflare challenge from datacenter/CI IPs. The crawler detects that (`overframeStatus: "blocked"`) and exits without inventing builds.

Run `crawl-overframe` on a **residential network** (or browser-exported JSON via `--import-builds`) to populate the local database.

## Import JSON shape

See `data/knowledge/examples/builds-import.sample.json`:

```json
[
  {
    "itemName": "Coda Hema",
    "builds": [
      {
        "rank": 1,
        "name": "Build title",
        "forma": 3,
        "url": "https://overframe.gg/build/…",
        "mods": ["Serration", "Galvanized Chamber"],
        "arcanes": ["Primary Merciless"]
      }
    ]
  }
]
```

## Agent use

After a successful crawl, build comparisons use local Overframe rows first (`lookup_local_knowledge`). If builds are still missing for an item, the agent asks yes/no before any online search — see [`docs/source-policy.md`](source-policy.md).
