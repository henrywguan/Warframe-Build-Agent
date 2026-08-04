#!/usr/bin/env node
import {
  compareLoadoutToTopBuilds,
  formatCompareResult,
} from "./compare.js";
import { runOverframeCrawl } from "./crawl-overframe.js";
import {
  compareWeaponsDps,
  estimateModdedDps,
  formatPresetHelp,
} from "./dps/compare.js";
import { loadCommonMods } from "./dps/mods.js";
import { parseOverframeHtmlPaths } from "./overframe-html.js";
import { lookupLocalKnowledge } from "./query.js";
import {
  formatFarmRoute,
  formatLocalBuildsOnly,
  formatPresetList,
  syncModsAsOf,
} from "./pack-shortcuts.js";
import { pullArcanesOnly, pullKnowledgePack, pullMechanicsOnly } from "./pull.js";
import { loadManifest } from "./store.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function usage(): never {
  console.log(`Warframe offline knowledge pack

Usage:
  npm run knowledge -- pull [options]
  npm run knowledge -- pull-mechanics [options]
  npm run knowledge -- pull-arcanes [options]
  npm run knowledge -- crawl-overframe [options]
  npm run knowledge -- parse-overframe-html <file|dir> [...] [options]
  npm run knowledge -- import-builds <file> [--merge]
  npm run knowledge -- lookup <query>
  npm run knowledge -- farm <item>
  npm run knowledge -- builds <item>
  npm run knowledge -- preset-list
  npm run knowledge -- sync-mods --asOf YYYY-MM-DD
  npm run knowledge -- dps <weapon> [--preset name|--mods a,b,c]
  npm run knowledge -- compare-dps <weaponA> <weaponB> [--preset name|--mods a,b,c]
  npm run knowledge -- compare-loadout <item> --mods a,b,c [--arcanes x,y]
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

compare-loadout options:
  Compare a pasted loadout to top local Overframe builds (Hermes / CLI)
  --mods <a,b,c>           Required comma-separated mod names
  --arcanes <x,y>          Optional comma-separated arcane names

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

parse-overframe-html options:
  Cloudflare-safe: parse HTML/__NEXT_DATA__ saved from a real browser tab
  (or JSON from scripts/overframe-browser-extract.js). No network calls.
  --out <file>             Write/merge import JSON (default data/knowledge/builds-export.json)
  --item <name>            Force item name for single-file parses
  --import                 Also run crawl-overframe --import-builds on --out
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

  if (command === "farm") {
    const query = rest.join(" ").trim();
    if (!query) {
      console.error('Usage: npm run knowledge -- farm "<item>"');
      process.exit(1);
    }
    console.log(await formatFarmRoute(query));
    return;
  }

  if (command === "builds" || command === "build") {
    const query = rest.join(" ").trim();
    if (!query) {
      console.error('Usage: npm run knowledge -- builds "<item>"');
      process.exit(1);
    }
    console.log(await formatLocalBuildsOnly(query));
    return;
  }

  if (command === "preset-list" || command === "presets") {
    console.log(await formatPresetList());
    return;
  }

  if (command === "sync-mods") {
    const asOf =
      getFlag(rest, "--asOf") ??
      getFlag(rest, "--as-of") ??
      new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      console.error("Usage: npm run knowledge -- sync-mods --asOf YYYY-MM-DD");
      process.exit(1);
    }
    console.log(await syncModsAsOf(asOf));
    return;
  }

  if (command === "import-builds") {
    const file =
      getFlag(rest, "--file") ??
      rest.find((arg, idx, arr) => {
        if (arg.startsWith("--") || arr[idx - 1] === "--file") return false;
        return true;
      });
    if (!file) {
      console.error(
        "Usage: npm run knowledge -- import-builds <file> [--merge]\nAlias of crawl-overframe --import-builds",
      );
      process.exit(1);
    }
    // --merge is accepted for docs/muscle-memory; import already merges by item id.
    if (rest.includes("--merge")) {
      console.log("Note: --merge accepted (import merges by item into by-item/).");
    }
    await runOverframeCrawl({ importBuildsPath: file });
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

  if (command === "compare-loadout") {
    const modsRaw = getFlag(rest, "--mods");
    const arcanesRaw = getFlag(rest, "--arcanes");
    const item = rest
      .filter((arg, idx, arr) => {
        if (arg.startsWith("--")) return false;
        const prev = arr[idx - 1];
        return !prev || !["--mods", "--arcanes"].includes(prev);
      })
      .join(" ")
      .trim();
    if (!item || !modsRaw) {
      console.error(
        'Usage: npm run knowledge -- compare-loadout "<item>" --mods "Mod A,Mod B" [--arcanes "Arcane X"]',
      );
      process.exit(1);
    }
    const result = await compareLoadoutToTopBuilds({
      itemName: item,
      mods: modsRaw.split(",").map((m) => m.trim()).filter(Boolean),
      arcanes: arcanesRaw
        ? arcanesRaw.split(",").map((m) => m.trim()).filter(Boolean)
        : [],
    });
    console.log(formatCompareResult(result));
    process.exit(result.ok ? 0 : 2);
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

  if (command === "parse-overframe-html") {
    const out =
      getFlag(rest, "--out") ??
      path.join(process.cwd(), "data/knowledge/builds-export.json");
    const itemName = getFlag(rest, "--item");
    const doImport = rest.includes("--import");
    const inputs = rest.filter((arg, idx, arr) => {
      if (arg.startsWith("--")) return false;
      const prev = arr[idx - 1];
      return !prev || !["--out", "--item"].includes(prev);
    });
    if (!inputs.length) {
      console.error(
        "Usage: npm run knowledge -- parse-overframe-html <file|dir> [...] [--out file] [--import]",
      );
      process.exit(1);
    }
    const { rows, skipped, errors } = await parseOverframeHtmlPaths(inputs, {
      itemName,
    });
    let merged = rows;
    try {
      const previous = JSON.parse(await readFile(out, "utf8")) as unknown;
      const prevRows = Array.isArray(previous)
        ? previous
        : previous && typeof previous === "object" && Array.isArray((previous as { builds?: unknown }).builds)
          ? (previous as { builds: unknown[] }).builds
          : [];
      const byName = new Map<string, (typeof rows)[number]>();
      for (const row of prevRows as typeof rows) {
        if (row?.itemName) byName.set(String(row.itemName).toLowerCase(), row);
      }
      for (const row of rows) byName.set(row.itemName.toLowerCase(), row);
      merged = [...byName.values()];
    } catch {
      // no previous export
    }
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log(
      `Wrote ${merged.length} item row(s) → ${out} (parsed ${rows.length}, skipped ${skipped.length}, errors ${errors.length})`,
    );
    if (skipped.length) {
      console.log(`  skipped: ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? "…" : ""}`);
    }
    if (errors.length) {
      console.log(`  errors: ${errors.slice(0, 5).join(" | ")}`);
    }
    if (doImport) {
      await runOverframeCrawl({ importBuildsPath: out });
    } else {
      console.log(
        `Import with: npm run knowledge -- crawl-overframe --import-builds "${out}"`,
      );
    }
    return;
  }

  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
