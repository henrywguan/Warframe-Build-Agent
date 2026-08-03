#!/usr/bin/env node
import { lookupLocalKnowledge } from "./query.js";
import { pullKnowledgePack } from "./pull.js";
import { loadManifest } from "./store.js";

function usage(): never {
  console.log(`Warframe offline knowledge pack

Usage:
  npm run knowledge -- pull [options]
  npm run knowledge -- lookup <query>
  npm run knowledge -- status

Options for pull:
  --limit <n>              Only first N catalog items (dev/sample)
  --include-archwing       Include Archwings in catalog
  --skip-wiki              Skip wiki digests
  --skip-overframe         Skip Overframe build fetch
  --import-builds <file>   JSON import of top builds when Overframe is blocked
  --concurrency <n>        Parallel wiki fetch workers (default 4)
`);
  process.exit(1);
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function main() {
  const [, , command, ...rest] = process.argv;
  if (!command || command === "-h" || command === "--help") usage();

  if (command === "status") {
    const manifest = await loadManifest();
    if (!manifest) {
      console.log("No knowledge pack yet. Run: npm run knowledge -- pull");
      process.exit(2);
    }
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  if (command === "lookup") {
    const query = rest.join(" ").trim();
    if (!query) usage();
    console.log(await lookupLocalKnowledge(query));
    return;
  }

  if (command === "pull") {
    const limitRaw = getFlag(rest, "--limit");
    const concurrencyRaw = getFlag(rest, "--concurrency");
    await pullKnowledgePack({
      limit: limitRaw ? Number(limitRaw) : undefined,
      includeArchwing: rest.includes("--include-archwing"),
      skipWiki: rest.includes("--skip-wiki"),
      skipOverframe: rest.includes("--skip-overframe"),
      importBuildsPath: getFlag(rest, "--import-builds"),
      concurrency: concurrencyRaw ? Number(concurrencyRaw) : undefined,
    });
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
