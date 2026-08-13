# Documentation

User-friendly guides for the Warframe Build Agent (Ordis).

## Start here

| Doc | Audience |
| --- | --- |
| **[Getting started](getting-started.md)** | Everyone — pick Hermes / Web / CLI |
| **[Import into Hermes Desktop](hermes-export.md)** | End users — precise step-by-step Hermes setup |
| [Web chat](web-chat.md) | Browser / phone UI + LLM / Ollama chip |
| [Web chat design reference](web-chat-design.md) | Colors, type, layout, Ordis, motion tokens for redesign |
| [Command list (`/list`)](commands.md) | Slash commands + CLI reference |

## Features & data

| Doc | Topic |
| --- | --- |
| [Offline knowledge pack](offline-knowledge.md) | Catalog, wiki, mechanics, arcanes, Overframe builds |
| [Overframe crawl / import](overframe-crawl.md) | Top builds when Cloudflare blocks Node |
| [Source policy](source-policy.md) | Local builds first; Online search toggle for live crawl |
| [Sources](sources.md) | How we prioritize Wiki / Market / Status / Overframe |
| [Warframe Status](warframe-status.md) | Live world-state fields |
| [Warframe.market](warframe-market.md) | Prices + daily 4pm Pacific scrape |
| [Patch notes](warframe-patch-notes.md) | Updates / hotfixes + daily scrape |
| [Desktop overlay](overlay.md) | External arsenal coaching window |

## Maintainers / contributors

| Doc | Topic |
| --- | --- |
| [Cleanup agent](cleanup-agent.md) | `/cleanup-simplify` verify gates |
| [../AGENTS.md](../AGENTS.md) | Repo contract for coding agents |
| [../hermes/README.md](../hermes/README.md) | Hermes profile package notes |
| [../hermes/LOCAL_LLM.md](../hermes/LOCAL_LLM.md) | Local Qwen / Ollama / LM Studio detail |

## GitHub Wiki

The repo Wiki flag is on, but GitHub only creates the `.wiki` git repo after you add the **first page** once in the UI:

1. Open https://github.com/henrywguan/Warframe-Build-Agent/wiki  
2. Click **Create the first page**  
3. Paste the contents of [`wiki-home.md`](wiki-home.md) as **Home**  
4. Optionally add pages that copy [`getting-started.md`](getting-started.md) and [`hermes-export.md`](hermes-export.md)

Until then, treat this `docs/` folder (and the root [`README.md`](../README.md)) as the public documentation.

Canonical (always up to date in-repo) copies live here under `docs/`.
