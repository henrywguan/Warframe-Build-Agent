---
name: browser-automate
description: Navigate and verify live web UIs with browser tools when available.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, Browser, UI, QA]
    category: software-development
    related_skills: [vision-analyze, http-api-debug, test-verify, shell-discipline]
---

# Browser automate

Use a real browser when UI state matters more than static HTML.

## When to use

- “Does the page work?” / toggle / form / routing bugs
- Post-fix visual verification
- Don’t use for raw API JSON — prefer `http-api-debug`

## Prerequisites

- Hermes browser toolset enabled (`browser_navigate`, click/type/screenshot as available)
- Target URL reachable from the Hermes host (localhost or public)

## Procedure

1. Start from a known URL (`browser_navigate`).
2. Perform the minimal UI path to the bug/feature.
3. Capture state (DOM text, screenshot → `vision-analyze`).
4. Correlate with network/console if tools allow; else `curl` the API.
5. Fix code if needed; re-navigate and confirm the new behavior.
6. Record exact steps so the Operator can replay.

## Fallbacks

- No browser tools → `web_extract` / Jina for public pages; for localhost, use `curl` + unit/component tests and say UI wasn’t visually verified.

## Pitfalls

- Automating logins without Operator credentials
- Fighting Cloudflare/CAPTCHA — stop and report
- Flaky sleeps instead of waiting for a selector/text

## Verification

- Before/after UI observation recorded
- Failure mode named if browser unavailable
