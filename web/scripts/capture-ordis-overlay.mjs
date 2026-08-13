import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const OUT = "/opt/cursor/artifacts/webchat-demo";
const BASE = "http://127.0.0.1:3000";
const CHROME = "/usr/bin/google-chrome-stable";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: "png" });
  console.log("wrote", file);
}

try {
  for (const [prefix, width, height] of [
    ["mobile", 390, 844],
    ["desktop", 1280, 800],
  ]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector('[aria-label="Ordis cephalon"]', { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1200));
    await shot(page, `${prefix}-ordis-caption.png`);

    // Trigger a reply so speaking overlay plays
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((el) =>
        (el.textContent || "").trim() === "/list",
      );
      btn?.click();
      return Boolean(btn);
    });
    if (clicked) {
      await page
        .waitForFunction(
          () =>
            !Array.from(document.querySelectorAll("article")).some((el) =>
              (el.textContent || "").includes("Checking the latest intel"),
            ),
          { timeout: 30000 },
        )
        .catch(() => {});
      // Capture mid-overlay (speaking window ~3.4s)
      await new Promise((r) => setTimeout(r, 450));
      await shot(page, `${prefix}-ordis-transmit.png`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
