---
name: tool-orchestration
description: Choose and combine filesystem, shell, web, browser, vision, MCP.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Tools, Orchestration, Cursor]
    category: software-development
    related_skills: [agent-loop, shell-discipline, mcp-integrate, browser-automate, vision-analyze]
---

# Tool orchestration

Cursor-class agents win by **using the right tools**, not by monologuing. Pick tools deliberately; run independent calls in parallel.

## When to use

- Any non-trivial task
- When tempted to answer from memory about a repo/file/URL
- Don’t use as a substitute for reading skill procedures — it selects tools, not domain steps

## Tool decision table

| Need | First tool | Then |
| --- | --- | --- |
| What’s in the repo? | `search_files` / `rg` | `read_file` |
| Change code | `read_file` → `patch`/`write_file` | `test-verify` |
| Does it run? | `terminal` | read error → `debug-issue` |
| What’s on the web/docs? | `web_search` / Agent Reach | `web_extract` / Jina |
| Does the UI work? | `browser_navigate` | screenshot → `vision_analyze` |
| What’s in an image? | `vision_analyze` | map to code/CSS |
| External SaaS/data? | MCP tools (`mcp-integrate`) | CLI fallback |
| Large parallel research | `delegate_task` | merge findings |

## Procedure

1. Name the information gap in one sentence.
2. Choose the cheapest tool that closes the gap.
3. Batch independent reads/searches together.
4. After each batch, update the plan; don’t keep searching forever.
5. If a tool is missing, say so and use the next-best fallback.
6. Never invent tool results — quote or paraphrase real output.

## Pitfalls

- Narrating a plan for ten paragraphs without a tool call
- Using shell `cat`/`grep` when `read_file`/`search_files` exist
- Browser for static docs that `web_extract` already handles

## Verification

- Every factual claim about the system traces to a tool/CLI result
- Parallelism used where dependencies allow
