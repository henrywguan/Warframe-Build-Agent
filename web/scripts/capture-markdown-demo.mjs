import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const OUT = "/opt/cursor/artifacts/webchat-demo";
const BASE = "http://127.0.0.1:3000";
const CHROME = "/usr/bin/google-chrome-stable";
fs.mkdirSync(OUT, { recursive: true });

const md = `## Coda Hema — quick take

Operator, here is a **Steel Path** oriented read:

- Prefer **Viral + Heat** for most factions
- Forma plan: 3–4, keep a \`V\` for serration-class damage
- Pair with [Overframe](https://overframe.gg) community rolls when unsure

| Slot | Mod |
| --- | --- |
| Exilus | \`Sprint Boost\` |
| 1 | Serration |
| 2 | Split Chamber |

\`\`\`text
/compare coda hema vs torid
\`\`\`

> Offline pack first; Online search only when the toggle is on.
`;

const memory = {
  version: 1,
  activeId: "demo-md",
  conversations: [
    {
      id: "demo-md",
      title: "Markdown reply demo",
      updatedAt: Date.now(),
      messages: [
        { id: "u1", role: "user", content: "Best Coda Hema build for Steel Path?", createdAt: Date.now() - 2000 },
        { id: "a1", role: "assistant", content: md, createdAt: Date.now() - 1000 },
      ],
    },
  ],
};

// restart server if needed
async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    for (const [prefix, width, height] of [
      ["desktop-markdown", 1280, 800],
      ["mobile-markdown", 390, 844],
    ]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
      await page.evaluate((payload) => {
        localStorage.setItem("wfba_chat_memory_v1", JSON.stringify(payload));
      }, memory);
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector('[aria-label="Chat"]', { timeout: 20000 });
      await new Promise((r) => setTimeout(r, 1200));
      // scroll messages to show formatted reply
      await page.evaluate(() => {
        const log = document.querySelector('[aria-label="Chat"] [class*="messages"]');
        if (log) log.scrollTop = log.scrollHeight;
      });
      const file = path.join(OUT, `${prefix}.png`);
      await page.screenshot({ path: file, type: "png" });
      console.log("wrote", file);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main();
