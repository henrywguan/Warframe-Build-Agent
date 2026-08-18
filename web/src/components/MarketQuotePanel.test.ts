import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const panel = readFileSync(join(here, "MarketQuotePanel.tsx"), "utf8");
const css = readFileSync(join(here, "MarketQuotePanel.module.css"), "utf8");

describe("MarketQuotePanel", () => {
  it("ships buy whisper action and window chrome", () => {
    assert.match(panel, /wfm-item-search/);
    assert.match(panel, /\/api\/market\/wfm/);
    assert.match(panel, /MARKET_QUOTE_LIMIT|5 cheapest/);
    assert.doesNotMatch(panel, /: "Copy"/);
    assert.match(panel, /Buy/);
    assert.match(panel, /navigator\.clipboard/);
    assert.match(panel, /Minimize market quotes/);
    assert.match(panel, /Close market quotes/);
    assert.match(panel, /wfba_market_quotes_ui_v1|MARKET_QUOTES_STORAGE_KEY/);
    assert.match(panel, /onPointerDown/);
    assert.match(panel, /nwse-resize|resize/);
    assert.ok(existsSync(join(here, "MarketQuotePanel.module.css")));
    assert.match(css, /z-index:\s*24/);
    assert.match(css, /position:\s*fixed/);
    assert.match(css, /\.searchInput/);
    assert.match(css, /prefers-reduced-motion/);
  });
});
