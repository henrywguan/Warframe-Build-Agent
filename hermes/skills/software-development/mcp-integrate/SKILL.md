---
name: mcp-integrate
description: Discover and use MCP servers/tools safely for external capabilities.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, MCP, Tools, Integrations]
    category: software-development
    related_skills: [tool-orchestration, security-hygiene, agent-loop]
---

# MCP integrate

MCP servers extend the agent (docs, issue trackers, databases, design tools). Discover schemas before calling.

## When to use

- Operator mentions an MCP-backed service
- Built-in tools can’t reach the needed system
- Don’t invent MCP tool names — list them first

## Procedure

1. List available MCP servers/tools from the host.
2. Read the tool schema (required args, side effects).
3. Prefer read/search tools before write/update tools.
4. Call with minimal args; handle auth errors by asking the Operator to reconnect — don’t fake data.
5. Summarize results with source (server + tool name).

## Safety

- Treat MCP writes as production actions.
- Never send secrets into chat; use configured auth.
- If a server is `needsAuth`, stop and tell the Operator.

## Pitfalls

- Guessing parameters not in the schema
- Using MCP when `gh`/local CLI already solves it faster

## Verification

- Tool name + args were schema-valid
- Result reflected in the answer
