# Hermes / knowledge exports

Packed files for sharing the Hermes profile (and optionally the knowledge pack).

## Hermes profile archive

**End-user import guide (recommended):** [`../docs/hermes-export.md`](../docs/hermes-export.md)

From the repo root:

```bash
./scripts/pack-hermes-profile.sh
# optional: also pack data/knowledge/
./scripts/pack-hermes-profile.sh --with-knowledge
```

Creates:

`exports/warframe-build-agent-hermes-profile.tar.gz`

Import in Hermes Desktop (**Profiles → Import**) or:

```bash
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

Local LLM (Ollama / Qwen): [`../hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md).

## Knowledge sidecar

```bash
./scripts/pack-knowledge-sidecar.sh
# → exports/warframe-build-agent-knowledge.tar.gz
tar -xzf ./exports/warframe-build-agent-knowledge.tar.gz -C /path/to/Warframe-Build-Agent/data
```

Most people should just keep a normal checkout of this repo instead of juggling sidecars.
