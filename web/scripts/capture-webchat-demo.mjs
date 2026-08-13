/**
 * Capture mobile/desktop demos of the webchat revamp.
 * Usage: node scripts/capture-webchat-demo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const OUT = "/opt/cursor/artifacts/webchat-demo";
const BASE = process.env.WEBCHAT_URL || "http://127.0.0.1:3000";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false, type: "png" });
  console.log("wrote", file);
}

async function clickButtonByText(page, needle) {
  const chips = await page.$$("button");
  for (const chip of chips) {
    const text = (await page.evaluate((el) => el.textContent || "", chip)).trim();
    if (text === needle || text.includes(needle)) {
      await chip.click();
      return true;
    }
  }
  return false;
}

async function waitForUi(page) {
  await page.waitForSelector('[aria-label="Chat"]', { timeout: 20_000 });
  await page.waitForSelector('[aria-label="Ordis cephalon"]', { timeout: 10_000 });
  await new Promise((r) => setTimeout(r, 1600));
}

async function runViewport(browser, { width, height, prefix }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60_000 });
  await waitForUi(page);
  await shot(page, `${prefix}-idle.png`);

  await clickButtonByText(page, "/list");
  await new Promise((r) => setTimeout(r, 400));
  await shot(page, `${prefix}-thinking.png`);
  await page
    .waitForFunction(
      () =>
        !Array.from(document.querySelectorAll("article")).some((el) =>
          (el.textContent || "").includes("Checking the latest intel"),
        ),
      { timeout: 30_000 },
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, `${prefix}-reply.png`);

  // Desktop: sidebar is always visible; mobile: open via Chats.
  if (width < 861) {
    await clickButtonByText(page, "Chats");
    await new Promise((r) => setTimeout(r, 400));
  }
  await page.waitForSelector('[aria-label="Chat history"]', { timeout: 5_000 });
  await shot(page, `${prefix}-history.png`);
  if (width < 861) {
    await clickButtonByText(page, "Close");
    await new Promise((r) => setTimeout(r, 300));
  }

  await clickButtonByText(page, "LLM / Ollama");
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, `${prefix}-llm-panel.png`);

  await page.close();
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--use-gl=angle",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--window-size=1280,900",
  ],
  defaultViewport: null,
});

try {
  await runViewport(browser, { width: 390, height: 844, prefix: "mobile" });
  await runViewport(browser, { width: 1280, height: 800, prefix: "desktop" });
  // Short / narrow viewports — ensure composer + LLM panel stay reachable
  await runViewport(browser, { width: 390, height: 640, prefix: "mobile-short" });
  await runViewport(browser, { width: 900, height: 700, prefix: "tablet" });
  console.log("done", OUT);
} finally {
  await browser.close();
}
