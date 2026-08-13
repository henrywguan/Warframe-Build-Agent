---
name: http-api-debug
description: Debug HTTP APIs with curl, status codes, headers, and payloads.
version: 0.1.0
metadata:
  hermes:
    tags: [Agent, HTTP, API, Network, Debug]
    category: software-development
    related_skills: [debug-issue, browser-automate, test-verify]
---

# HTTP / API debug

Isolate API failures with explicit requests and responses.

## When to use

- 4xx/5xx, CORS, auth, wrong JSON shapes
- Chat/tool backends, webhooks, REST/GraphQL

## Quick reference

```bash
curl -sS -D- -o /tmp/body.txt "URL" | head
curl -sS -X POST "URL" -H "content-type: application/json" -d '{"k":"v"}'
curl -sS -w "\nhttp:%{http_code}\n" "URL" -o /tmp/body.txt
jq . </tmp/body.txt | head
```

## Procedure

1. Capture the failing URL/method/headers/body (redact secrets).
2. Reproduce with `curl` (or HTTP tool); record status + body snippet.
3. Bisect: auth? route? payload validation? upstream?
4. Trace server handler in code (`codebase-explore`).
5. Fix + add a regression test or a documented curl repro.

## Pitfalls

- Logging bearer tokens
- Assuming browser and curl see the same cookies
- “Fixing” CORS with insecure `*` in production without ask

## Verification

- Repro curl before/after
- Status/body evidence quoted
