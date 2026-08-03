Cleanup and simplify touched code after a feature or bugfix. Supports full overlay + web integrity via `-all`.

## Default — `/cleanup-simplify`

1. Review `git diff` / changed files only.
2. Simplify without changing behavior (no API renames, no drive-by refactors).
3. Run:

```bash
./scripts/cleanup-verify.sh
# or
npm run cleanup:verify
```

## Full integrity — `/cleanup-simplify -all`

Do the default cleanup pass, then run the product integrity suite:

```bash
./scripts/cleanup-verify-all.sh
# or
npm run cleanup:verify:all
```

That suite covers:

1. Overlay recommendations for an Overframe-style fixture loadout + screenshot asset
2. Overlay UI buttons exist, enabled, and signal-wired (offscreen Qt)
3. Overlay chat mocked HTTPS replies
4. Web UI wiring (Ordis, chat panel, composer, chips, APIs)
5. Web chat turn resolution (slash + model)
6. Talking Ordis mood helpers + `data-mood="speaking"`
7. Functional suite: typecheck, tests, web lint/build, overlay `--verify-external`, no conflict markers

## Done when

- Diff is simpler or unchanged for good reason
- Default: `cleanup-verify.sh` exits 0
- `-all`: `cleanup-verify-all.sh` exits 0
- No unrelated files rewritten

Full write-up: [`docs/cleanup-agent.md`](../../docs/cleanup-agent.md)
