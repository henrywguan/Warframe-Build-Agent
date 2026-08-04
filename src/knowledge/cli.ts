#!/usr/bin/env node
import { runOverframeCrawl } from "./crawl-overframe.js";
import {
  compareWeaponsDps,
  estimateModdedDps,
  formatPresetHelp,
} from "./dps/compare.js";
import { loadCommonMods } from "./dps/mods.js";
import { lookupLocalKnowledge } from "./query.js";
import { pullArcanesOnly, pullKnowledgePack, pullMechanicsOnly } from "./pull.js";
import { loadManifest } from "./store.js";

function usage(): never {
  console.log(`Warframe offline knowledge pack

Usage:
  npm run knowledge -- pull [options]
  npm run knowledge -- pull-mechanics [options]
  npm run knowledge -- pull-arcanes [options]
  npm run knowledge -- crawl-overframe [options]
  npm run knowledge -- lookup <query>
  npm run knowledge -- dps <weapon> [--preset name|--mods a,b,c]
  npm run knowledge -- compare-dps <weaponA> <weaponB> [--preset name|--mods a,b,c]
  npm run knowledge -- status

pull options:
  --limit <n>              Only first N catalog items (dev/sample)
  --include-archwing       Include Archwings in catalog
  --skip-wiki              Skip wiki digests
  --skip-overframe         Skip Overframe crawl
  --skip-official          Skip warframe.com official digests
  --skip-mechanics         Skip curated mechanics/resource digests
  --skip-arcanes           Skip Arcane Enhancement digests
  --import-builds <file>   JSON import when Overframe is Cloudflare-blocked
  --concurrency <n>        Parallel workers (wiki default 4)

pull-mechanics options:
  Refresh Damage/Status/Armor/faction/resource digests only (fast)
  --concurrency <n>        Parallel workers (default 3)

pull-arcanes options:
  Refresh Arcane Enhancement digests from Warframe Wiki
  --limit <n>              Only first N titles (dev/sample)
  --concurrency <n>        Parallel workers (default 3)

dps / compare-dps options:
  Offline arsenal-style modded DPS estimate (not a full simulator)
  --preset <name>          e.g. rifle-viral-heat, rifle-corrosive-heat, typical
  --mods <a,b,c>           Explicit max-rank mod list
  --faction <name>         Optional note only (use primed bane mods for multiplier)
  --viral-amp <n>          Override Viral health amp (default ~2.5 when viral mods present)

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

  if (command === "dps") {
    const preset = getFlag(rest, "--preset");
    const modsRaw = getFlag(rest, "--mods");
    const faction = getFlag(rest, "--faction");
    const viralAmpRaw = getFlag(rest, "--viral-amp");
    const weapon = rest
      .filter((arg, idx, arr) => {
        if (arg.startsWith("--")) return false;
        const prev = arr[idx - 1];
        return !prev || !["--preset", "--mods", "--faction", "--viral-amp"].includes(prev);
      })
      .join(" ")
      .trim();
    if (!weapon) {
      const common = await loadCommonMods();
      console.log(formatPresetHelp(common.presets));
      process.exit(1);
    }
    const result = await estimateModdedDps(weapon, {
      preset: preset ?? (modsRaw ? undefined : "typical"),
      mods: modsRaw ? modsRaw.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
      faction,
      viralAmp: viralAmpRaw ? Number(viralAmpRaw) : undefined,
    });
    if (!result.ok) {
      console.error(result.message);
      process.exit(2);
    }
    console.log(result.text);
    return;
  }

  if (command === "compare-dps") {
    const preset = getFlag(rest, "--preset");
    const modsRaw = getFlag(rest, "--mods");
    const faction = getFlag(rest, "--faction");
    const viralAmpRaw = getFlag(rest, "--viral-amp");
    const positional = [];
    for (let i = 0; i < rest.length; i += 1) {
      const arg = rest[i]!;
      if (arg.startsWith("--")) {
        if (["--preset", "--mods", "--faction", "--viral-amp"].includes(arg)) i += 1;
        continue;
      }
      positional.push(arg);
    }
    // Support: compare-dps Torid "Ignis Wraith" OR compare-dps Torid vs Ignis Wraith
    const cleaned = positional.filter((p) => !/^vs$/i.test(p));
    const weaponA = cleaned[0];
    const weaponB = cleaned.slice(1).join(" ").trim() || cleaned[1];
    if (!weaponA || !weaponB) {
      console.error(
        'Usage: npm run knowledge -- compare-dps <weaponA> <weaponB> [--preset typical|--mods ...]',
      );
      process.exit(1);
    }
    const result = await compareWeaponsDps(weaponA, weaponB, {
      preset: preset ?? (modsRaw ? undefined : "typical"),
      mods: modsRaw ? modsRaw.split(",").map((m) => m.trim()).filter(Boolean) : undefined,
      faction,
      viralAmp: viralAmpRaw ? Number(viralAmpRaw) : undefined,
    });
    if (!result.ok) {
      console.error(result.message);
      process.exit(2);
    }
    console.log(result.text);
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
      skipArcanes: rest.includes("--skip-arcanes"),
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

  if (command === "pull-arcanes") {
    const limitRaw = getFlag(rest, "--limit");
    const concurrencyRaw = getFlag(rest, "--concurrency");
    await pullArcanesOnly({
      limit: limitRaw ? Number(limitRaw) : undefined,
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
