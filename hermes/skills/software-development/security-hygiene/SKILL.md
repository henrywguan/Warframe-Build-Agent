---
name: security-hygiene
description: Keep secrets safe and treat destructive or networked ops carefully.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Security, Secrets, Safety]
    category: software-development
    related_skills: [shell-discipline, git-workflow, mcp-integrate, project-rules]
---

# Security hygiene

Powerful agents are dangerous without brakes. Default to least privilege.

## When to use

- Always, as a standing filter on tool use
- Especially before commits, installs, curls-to-bash, MCP writes

## Hard rules

1. Never commit `.env`, cookies, tokens, private keys, or Agent Reach creds.
2. Redact secrets in chat transcripts.
3. Don’t run untrusted `curl | bash` without Operator approval.
4. Don’t disable TLS/auth “to make it work” unless explicitly requested and warned.
5. Don’t force-push, `reset --hard`, or drop databases unless explicitly requested.
6. For Warframe overlay: never add memory-reading / injection / anti-cheat–risky code.
7. Ask before `agent-reach install --system` or other system package installs.

## Procedure

1. Scan staged files for secret-looking values before commit.
2. Prefer env vars / secret managers over hardcoded credentials.
3. When a command needs a token, use the existing configured channel.
4. If you suspect a secret leaked into git history, stop and warn immediately.

## Verification

- `git status` / diff show no secret files
- Destructive ops either skipped or explicitly approved
