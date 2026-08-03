Pull or query the local offline Warframe knowledge pack (WFCD catalog, Warframe Wiki digests, Overframe top builds).

## Pull (full agent-usable pack)

```bash
npm run knowledge -- pull
```

If Overframe is Cloudflare-blocked from this network:

```bash
npm run knowledge -- pull --import-builds ./data/knowledge/examples/builds-import.sample.json
```

## Status / lookup

```bash
npm run knowledge -- status
npm run knowledge -- lookup "Coda Hema"
```

Prefer `lookup_local_knowledge` for **offline item facts**. For **builds**, use Overframe cache / YouTube / agent-calculated per `docs/source-policy.md`. Use live tools for worldstate, market, and patch hubs.

See `docs/offline-knowledge.md` and `docs/source-policy.md`.
