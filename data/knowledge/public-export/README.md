# Public Export (stub)

This folder will hold synced **Public Export** game data when `pull-public-export` is wired to a live source.

## Intended flow

1. Download or generate a Public Export bundle (WFCD / official export tooling).
2. Run `npm run knowledge -- pull-public-export` to refresh `index.json` and derived digests.
3. Use **inventory-import** / **profile-set** for personal ownership — separate from catalog sync.

## Current status

Stub only — no network pull yet. See `docs/offline-knowledge.md` and the **public-export-sync** skill.
