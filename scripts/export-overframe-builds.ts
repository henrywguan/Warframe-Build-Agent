/**
 * Local Playwright exporter for Overframe top-3 builds.
 * Use when Node fetch is Cloudflare-blocked but a real browser can open overframe.gg.
 *
 *   npm run knowledge:export-overframe -- --limit 5
 *   npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --limit 5
 *   npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { OVERFRAME_TOP_BUILDS, type OverframeBuildRank } from "../src/knowledge/constants.js";
import {
  isCloudflareChallenge,
  parseBuildPageMods,
  parseTopBuildLinks,
  summarizeBuild,
} from "../src/knowledge/overframe-parse.js";
import type { CatalogItem, OverframeBuild } from "../src/knowledge/types.js";

type ExportRow = {
  itemName: string;
  builds: Array<Omit<OverframeBuild, "rank"> & { rank: OverframeBuildRank }>;
};

type Args = {
  limit?: number;
  out: string;
  delayMs: number;
  headed: boolean;
  resume: boolean;
  skipBuildPages: boolean;
  /** Attach to Chrome started with --remote-debugging-port (best vs Cloudflare). */
  connect?: string;
  profileDir: string;
};

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function getFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function parseArgs(argv: string[]): Args {
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(`Export Overframe top-3 builds via Playwright.

Usage:
  npm run knowledge:export-overframe -- [options]

If Cloudflare loops in the automated window, attach to a debugging browser:

  1. Close other Chromium/Chrome windows using that profile
  2. Start Playwright Chromium with remote debugging (PowerShell, one line):
       & "$env:USERPROFILE\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\wf-overframe-chrome"
     (If chrome.exe path differs: Get-ChildItem "$env:USERPROFILE\\AppData\\Local\\ms-playwright" -Recurse -Filter chrome.exe)
  3. In that window, open https://overframe.gg and pass Cloudflare once (leave that tab open)
  4. Run:
       npm run knowledge:export-overframe -- --connect http://127.0.0.1:9222 --limit 5
     The exporter reuses your open Overframe tab and avoids CDP navigations that Cloudflare blocks.

  Google Chrome works the same way if installed:
       & "$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\\wf-overframe-chrome"

Options:
  --limit <n>           Only first N catalog items (recommended for first try)
  --out <file>          Output JSON (default: data/knowledge/builds-export.json)
  --delay <ms>          Delay between navigations (default: 800)
  --resume              Skip items already present in --out
  --skip-build-pages    Only collect build links (no mod/arcane scan)
  --connect <url>       Attach to Chrome CDP (e.g. http://127.0.0.1:9222)
  --profile <dir>       Persistent profile dir when not using --connect
  --headless            Run without a visible window (usually fails Cloudflare)
  -h, --help            Show this help

Then import:
  npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
`);
    process.exit(0);
  }

  const root = repoRoot();
  const limitRaw = getFlag(argv, "--limit");
  return {
    limit: limitRaw ? Number(limitRaw) : undefined,
    out: path.resolve(
      root,
      getFlag(argv, "--out") ?? "data/knowledge/builds-export.json",
    ),
    delayMs: Number(getFlag(argv, "--delay") ?? "800") || 800,
    headed: !argv.includes("--headless"),
    resume: argv.includes("--resume"),
    skipBuildPages: argv.includes("--skip-build-pages"),
    connect: getFlag(argv, "--connect"),
    profileDir: path.resolve(
      root,
      getFlag(argv, "--profile") ?? "data/knowledge/.cache/overframe-browser",
    ),
  };
}

function itemGuessUrl(itemName: string): string {
  const slug = itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://overframe.gg/items/${slug}/`;
}

function searchUrl(itemName: string): string {
  return `https://overframe.gg/search/?q=${encodeURIComponent(itemName)}`;
}

async function loadCatalog(root: string): Promise<CatalogItem[]> {
  const file = path.join(root, "data/knowledge/catalog/items.json");
  return JSON.parse(await readFile(file, "utf8")) as CatalogItem[];
}

async function loadExisting(outPath: string): Promise<ExportRow[]> {
  try {
    const raw = JSON.parse(await readFile(outPath, "utf8")) as ExportRow[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function saveExport(outPath: string, rows: ExportRow[]): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function challenged(status: number, html: string): boolean {
  return isCloudflareChallenge(status, html);
}

async function readPage(page: Page, statusHint = 200): Promise<{ status: number; html: string }> {
  const html = await page.content();
  return { status: challenged(statusHint, html) ? 403 : statusHint, html };
}

/** Prefer in-tab navigation when CDP `page.goto` is blocked (ERR_BLOCKED_BY_RESPONSE). */
async function gotoHtml(
  page: Page,
  url: string,
  options?: { preferInPage?: boolean },
): Promise<{ status: number; html: string }> {
  const preferInPage = options?.preferInPage ?? false;

  const viaInPage = async () => {
    await page.evaluate((next) => {
      window.location.assign(next);
    }, url);
    await page.waitForLoadState("domcontentloaded", { timeout: 60_000 });
    await sleep(500);
    return readPage(page);
  };

  if (preferInPage) {
    try {
      return await viaInPage();
    } catch {
      /* fall through to page.goto */
    }
  }

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await sleep(500);
    return readPage(page, response?.status() ?? 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/ERR_BLOCKED_BY_RESPONSE|net::ERR_/i.test(message)) {
      console.warn(`  page.goto blocked (${message.split("\n")[0]}); retrying in-tab navigation…`);
      return viaInPage();
    }
    throw err;
  }
}

/** Wait until the *current* page leaves Cloudflare — do not reload (reload re-triggers CF). */
async function waitUntilClear(page: Page, label: string, timeoutMs = 180_000): Promise<void> {
  const started = Date.now();
  console.log(`${label} Solve Cloudflare in the browser if needed — waiting (no reload)…`);
  while (Date.now() - started < timeoutMs) {
    const { status, html } = await readPage(page);
    if (!challenged(status, html)) {
      console.log("Cloudflare cleared.");
      return;
    }
    await sleep(1500);
  }
  throw new Error(
    "Still on Cloudflare after waiting. Keep the debugging Chromium window focused, pass the check, and retry.",
  );
}

async function ensureOverframeAccess(
  page: Page,
  options: { headed: boolean; connect: boolean; context?: BrowserContext },
): Promise<Page> {
  const currentPage = async (): Promise<Page> => {
    if (options.context) return pickPage(options.context);
    return page;
  };

  let active = await currentPage();
  const onOverframe = /overframe\.gg/i.test(active.url());
  if (onOverframe) {
    const current = await readPage(active);
    if (!challenged(current.status, current.html)) {
      console.log(`Using existing tab: ${active.url()}`);
      return active;
    }
    await waitUntilClear(active, "Cloudflare on current Overframe tab.");
    return active;
  }

  if (options.connect) {
    console.log(
      "No Overframe tab yet. In the debugging Chromium window, open https://overframe.gg and pass Cloudflare.",
    );
    console.log("Waiting for an Overframe page that is past Cloudflare…");
    const started = Date.now();
    while (Date.now() - started < 180_000) {
      active = await currentPage();
      if (/overframe\.gg/i.test(active.url())) {
        const current = await readPage(active);
        if (!challenged(current.status, current.html)) {
          console.log(`Using tab: ${active.url()}`);
          return active;
        }
      }
      // Soft navigate once if the tab is still blank/new.
      if (!active.url() || active.url() === "about:blank" || active.url().startsWith("chrome://")) {
        try {
          await gotoHtml(active, "https://overframe.gg/", { preferInPage: true });
        } catch {
          /* user can open manually */
        }
      }
      await sleep(1500);
    }
    throw new Error(
      "Timed out waiting for Overframe. Open https://overframe.gg in the debugging Chromium window, pass Cloudflare, then re-run.",
    );
  }

  const probe = await gotoHtml(active, "https://overframe.gg/");
  if (!challenged(probe.status, probe.html)) return active;

  if (!options.headed) {
    throw new Error(
      "Cloudflare challenge in headless mode. Use headed mode or --connect (see --help).",
    );
  }
  await waitUntilClear(active, "Cloudflare challenge on homepage.");
  return active;
}

async function enrichBuild(
  page: Page,
  build: OverframeBuild,
  options: { delayMs: number; preferInPage: boolean },
): Promise<OverframeBuild> {
  if (!build.url) return build;
  await sleep(options.delayMs);
  let { status, html } = await gotoHtml(page, build.url, {
    preferInPage: options.preferInPage,
  });
  if (challenged(status, html)) {
    try {
      await waitUntilClear(page, `Cloudflare on build page (${build.name}).`, 90_000);
      ({ status, html } = await readPage(page));
    } catch {
      return { ...build, notes: "Cloudflare challenge on build page" };
    }
  }
  const parsed = parseBuildPageMods(html);
  const mods = parsed.mods.length ? parsed.mods : build.mods ?? [];
  const arcanes = parsed.arcanes.length ? parsed.arcanes : build.arcanes ?? [];
  return {
    ...build,
    name: parsed.name || build.name,
    author: parsed.author || build.author,
    forma: parsed.forma ?? build.forma,
    mods: mods.length ? mods : undefined,
    arcanes: arcanes.length ? arcanes : undefined,
    modEntries: parsed.modEntries.length ? parsed.modEntries : build.modEntries,
    summary: summarizeBuild(parsed.name || build.name, mods, arcanes),
  };
}

async function exportItem(
  page: Page,
  item: CatalogItem,
  options: { delayMs: number; skipBuildPages: boolean; preferInPage: boolean },
): Promise<ExportRow | null> {
  const urls = [itemGuessUrl(item.name), searchUrl(item.name)];
  let builds: OverframeBuild[] = [];

  for (const url of urls) {
    await sleep(options.delayMs);
    let { status, html } = await gotoHtml(page, url, {
      preferInPage: options.preferInPage,
    });
    if (challenged(status, html)) {
      try {
        await waitUntilClear(page, `Cloudflare on ${url}`, 90_000);
        ({ status, html } = await readPage(page));
      } catch {
        console.warn(`  Cloudflare stuck on ${url}`);
        return null;
      }
    }
    builds = parseTopBuildLinks(item.name, html);
    if (builds.length) break;
  }

  if (!builds.length) return null;

  if (!options.skipBuildPages) {
    const enriched: OverframeBuild[] = [];
    for (const build of builds.slice(0, OVERFRAME_TOP_BUILDS)) {
      try {
        enriched.push(
          await enrichBuild(page, build, {
            delayMs: options.delayMs,
            preferInPage: options.preferInPage,
          }),
        );
      } catch (err) {
        enriched.push({
          ...build,
          notes: err instanceof Error ? err.message : String(err),
        });
      }
    }
    builds = enriched;
  }

  return {
    itemName: item.name,
    builds: builds.slice(0, OVERFRAME_TOP_BUILDS).map((build, index) => ({
      ...build,
      rank: (index + 1) as OverframeBuildRank,
    })),
  };
}

async function pickPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages();
  const overframe = pages.find((p) => /overframe\.gg/i.test(p.url()));
  if (overframe) return overframe;
  if (pages[0]) return pages[0];
  return context.newPage();
}

async function openBrowser(args: Args): Promise<{
  page: Page;
  context: BrowserContext;
  browser: Browser | null;
  close: () => Promise<void>;
}> {
  if (args.connect) {
    console.log(`Connecting to Chrome at ${args.connect}…`);
    const browser = await chromium.connectOverCDP(args.connect);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await pickPage(context);
    return {
      page,
      context,
      browser,
      close: async () => {
        // Do not close the user's Chrome — only detach.
        await browser.close();
      },
    };
  }

  await mkdir(args.profileDir, { recursive: true });
  console.log(`Launching persistent Chrome profile: ${args.profileDir}`);
  try {
    const context = await chromium.launchPersistentContext(args.profileDir, {
      channel: "chrome",
      headless: !args.headed,
      viewport: { width: 1280, height: 800 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    return {
      page,
      context,
      browser: null,
      close: async () => context.close(),
    };
  } catch (err) {
    console.warn(
      `Could not launch channel=chrome (${err instanceof Error ? err.message : err}). Falling back to Chromium.`,
    );
    const context = await chromium.launchPersistentContext(args.profileDir, {
      headless: !args.headed,
      viewport: { width: 1280, height: 800 },
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const page = context.pages()[0] ?? (await context.newPage());
    return {
      page,
      context,
      browser: null,
      close: async () => context.close(),
    };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  let catalog = await loadCatalog(root);
  if (args.limit && args.limit > 0) catalog = catalog.slice(0, args.limit);

  const existing = args.resume ? await loadExisting(args.out) : [];
  const done = new Set(existing.map((row) => row.itemName.toLowerCase()));
  const rows = [...existing];

  console.log(
    `Exporting Overframe top-3 builds for ${catalog.length} catalog items → ${args.out}`,
  );
  console.log(
    `Mode: ${args.connect ? `connect ${args.connect}` : args.headed ? "headed Chrome" : "headless"} · delay ${args.delayMs}ms${args.resume ? " · resume" : ""}`,
  );

  const session = await openBrowser(args);

  try {
    const page = await ensureOverframeAccess(session.page, {
      headed: args.headed || Boolean(args.connect),
      connect: Boolean(args.connect),
      context: session.context,
    });

    let exported = 0;
    let skipped = 0;
    let missed = 0;
    const preferInPage = Boolean(args.connect);

    for (let i = 0; i < catalog.length; i++) {
      const item = catalog[i]!;
      const key = item.name.toLowerCase();
      if (done.has(key)) {
        skipped += 1;
        continue;
      }

      process.stdout.write(`[${i + 1}/${catalog.length}] ${item.name}… `);
      const row = await exportItem(page, item, {
        delayMs: args.delayMs,
        skipBuildPages: args.skipBuildPages,
        preferInPage,
      });

      if (!row) {
        missed += 1;
        console.log("no builds");
        continue;
      }

      rows.push(row);
      done.add(key);
      exported += 1;
      const modCount = row.builds.reduce(
        (n, b) => n + (b.mods?.length ?? 0) + (b.arcanes?.length ?? 0),
        0,
      );
      console.log(`ok (${row.builds.length} builds, ${modCount} mods/arcanes)`);

      if (exported % 5 === 0) {
        await saveExport(args.out, rows);
        console.log(`  checkpoint: ${rows.length} items saved`);
      }
    }

    await saveExport(args.out, rows);
    console.log("");
    console.log(
      `Done. Saved ${rows.length} item(s) (${exported} new, ${skipped} resumed, ${missed} missed).`,
    );
    console.log("Import with:");
    console.log(
      `  npm run knowledge -- crawl-overframe --import-builds ${path.relative(root, args.out) || args.out}`,
    );
  } finally {
    await session.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
