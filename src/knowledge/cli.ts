#!/usr/bin/env node
import { runOverframeCrawl } from "./crawl-overframe.js";
import { lookupLocalKnowledge } from "./query.js";
import { pullKnowledgePack, pullMechanicsOnly } from "./pull.js";
import { loadManifest } from "./store.js";

function usage(): never {
  console.log(`Warframe offline knowledge pack

Usage:
  npm run knowledge -- pull [options]
  npm run knowledge -- pull-mechanics [options]
  npm run knowledge -- crawl-overframe [options]
  npm run knowledge -- lookup <query>
  npm run knowledge -- status

pull options:
  --limit <n>              Only first N catalog items (dev/sample)
  --include-archwing       Include Archwings in catalog
  --skip-wiki              Skip wiki digests
  --skip-overframe         Skip Overframe crawl
  --skip-official          Skip warframe.com official digests
  --skip-mechanics         Skip curated mechanics/resource digests
  --import-builds <file>   JSON import when Overframe is Cloudflare-blocked
  --concurrency <n>        Parallel workers (wiki default 4)

pull-mechanics options:
  Refresh Damage/Status/Armor/faction/resource digests only (fast)
  --concurrency <n>        Parallel workers (default 3)

crawl-overframe options:
  Crawl https://overframe.gg for every catalog warframe/weapon:
  top 3 builds → open each build page → scan mods + arcanes → data/knowledge/
  --limit <n>              Only first N catalog items
  --include-archwing       Include Archwings
  --refresh-catalog        Re-pull WFCD catalog first
  --concurrency <n>        Parallel item workers (default 2)
  --delay <ms>             Delay between requests (default 450)
  --skip-build-pages       Only collect build links (skip mod/arcane scan)
  --import-builds <file>   Import JSON instead of live crawl
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
      skipOfficial: rest.includes("--skip-official"),
      skipMechanics: rest.includes("--skip-mechanics"),
      importBuildsPath: getFlag(rest, "--import-builds"),
      concurrency: concurrencyRaw ? Number(concurrencyRaw) : undefined,
    });
    return;
  }

  if (command === "pull-mechanics") {
    const concurrencyRaw = getFlag(rest, "--concurrency");
    await pullMechanicsOnly({
      concurrency: concurrencyRaw ? Number(concurrencyRaw) : undefined,
    });
    return;
  }

  if (command === "crawl-overframe") {
    const limitRaw = getFlag(rest, "--limit");
    const concurrencyRaw = getFlag(rest, "--concurrency");
    const delayRaw = getFlag(rest, "--delay");
    await runOverframeCrawl({
      limit: limitRaw ? Number(limitRaw) : undefined,
      includeArchwing: rest.includes("--include-archwing"),
      refreshCatalog: rest.includes("--refresh-catalog"),
      concurrency: concurrencyRaw ? Number(concurrencyRaw) : undefined,
      delayMs: delayRaw ? Number(delayRaw) : undefined,
      skipBuildPages: rest.includes("--skip-build-pages"),
      importBuildsPath: getFlag(rest, "--import-builds"),
    });
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
