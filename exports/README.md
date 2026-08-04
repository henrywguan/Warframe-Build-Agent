# Hermes / knowledge exports

## Hermes profile

```bash
./scripts/pack-hermes-profile.sh
# optional: also pack data/knowledge/
./scripts/pack-hermes-profile.sh --with-knowledge
```

Import:

```bash
hermes profile import ./exports/warframe-build-agent-hermes-profile.tar.gz --name warframe-build-agent
```

Local LLM (Qwen/Ollama): see [`../hermes/LOCAL_LLM.md`](../hermes/LOCAL_LLM.md).

## Knowledge sidecar

```bash
./scripts/pack-knowledge-sidecar.sh
# → exports/warframe-build-agent-knowledge.tar.gz
tar -xzf ./exports/warframe-build-agent-knowledge.tar.gz -C /path/to/Warframe-Build-Agent/data
```
