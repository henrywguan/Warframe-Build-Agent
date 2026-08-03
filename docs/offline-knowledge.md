# Offline knowledge pack (agent-usable)

Local recall pack for builds and item facts — **text/structured data only** (no wiki images). A full wiki+catalog pack is typically only a few MB; Overframe top-build text stays small unless you import a large build dump.

## What’s inside (`data/knowledge/`)

| Path | Source | Purpose |
| --- | --- | --- |
| `catalog/items.json` | [WFCD / warframestat.us](https://api.warframestat.us) | Warframes + weapons (incl. primes), slim stats |
| `wiki/digests/*.json` | [Warframe Wiki API](https://wiki.warframe.com) | Plain-text digests per item |
| `builds/by-item/*.json` | [Overframe](https://overframe.gg) crawl | Top 2 community builds per item (**mods + arcanes**) |
| `mods/index.json` | Aggregated from crawled builds | Unique mods/arcanes seen on top builds |
| `manifest.json` | Generator metadata | Counts + Overframe status |

## Pull

```bash
# Full catalog + wiki digests + Overframe top builds (mods + arcanes)
npm run knowledge -- pull

# Dedicated Overframe crawl (top 2 builds → scan mods/arcanes → local DB)
npm run knowledge -- crawl-overframe
npm run knowledge -- crawl-overframe --limit 10

# Dev sample
npm run knowledge -- pull --limit 25

# If Overframe is Cloudflare-blocked (common on datacenter IPs / Node fetch):
npm run knowledge:export-overframe -- --limit 5
npm run knowledge:export-overframe -- --resume
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
# Or import a hand-written / sample JSON:
npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/examples/builds-import.sample.json

# Lookup
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- status
```

### Overframe note

`overframe.gg` often returns a Cloudflare challenge from cloud/CI networks. The crawler detects that (`overframeStatus: "blocked"`) and still allows wiki/catalog pulls. To fill builds with mods/arcanes:

1. Run `npm run knowledge -- crawl-overframe` on a machine that can open Overframe in a browser, **or**
2. Provide `--import-builds` JSON (see `data/knowledge/examples/builds-import.sample.json`).

Full crawl process: [`docs/overframe-crawl.md`](overframe-crawl.md).

## Agent use

- Web chat tool: `lookup_local_knowledge`
- CLI: `npm run knowledge -- lookup …`
- Cursor skill: `.cursor/skills/offline-knowledge/SKILL.md`

Prefer local knowledge for **item/mechanic facts** and **build comparisons** first. If Overframe builds are missing from the pack, ask the player for confirmation before searching Overframe / YouTube / online sources — see [`docs/source-policy.md`](source-policy.md). Keep using live tools for fissures, market, and patch hubs.
