# Offline knowledge pack (agent-usable)

Local recall pack for builds and item facts — **text/structured data only** (no wiki images). A full wiki+catalog pack is typically only a few MB; Overframe top-build text stays small unless you import a large build dump.

## What’s inside (`data/knowledge/`)

| Path | Source | Purpose |
| --- | --- | --- |
| `catalog/items.json` | [WFCD / warframestat.us](https://api.warframestat.us) | Warframes + weapons (incl. primes), slim stats |
| `wiki/digests/*.json` | [Warframe Wiki API](https://wiki.warframe.com) | Plain-text digests per item |
| `builds/by-item/*.json` | [Overframe](https://overframe.gg) (when reachable) | Top 2 community builds per item |
| `mods/index.json` | Wiki extracts for mods referenced by builds | Mod blurb recall |
| `manifest.json` | Generator metadata | Counts + Overframe status |

## Pull

```bash
# Full catalog + wiki digests + Overframe top builds
npm run knowledge -- pull

# Dev sample
npm run knowledge -- pull --limit 25

# If Overframe is Cloudflare-blocked (common on datacenter IPs):
npm run knowledge -- pull --import-builds ./data/knowledge/examples/builds-import.sample.json

# Lookup
npm run knowledge -- lookup "Coda Hema"
npm run knowledge -- status
```

### Overframe note

`overframe.gg` often returns a Cloudflare challenge from cloud/CI networks. The puller detects that (`overframeStatus: "blocked"`) and still writes catalog + wiki digests. To fill builds:

1. Run `npm run knowledge -- pull` on a machine that can open Overframe in a browser, **or**
2. Provide `--import-builds` JSON (see `data/knowledge/examples/builds-import.sample.json`).

## Agent use

- Web chat tool: `lookup_local_knowledge`
- CLI: `npm run knowledge -- lookup …`
- Cursor skill: `.cursor/skills/offline-knowledge/SKILL.md`

Prefer local knowledge for **item/mechanic facts** (offline browsing). For **build** requests, use Overframe rows from the pack when present, then YouTube (cited) or agent-calculated advice — see [`docs/source-policy.md`](source-policy.md). Keep using live tools for fissures, market, and patch hubs.
