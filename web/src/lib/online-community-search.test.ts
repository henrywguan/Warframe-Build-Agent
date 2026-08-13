import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksWarframeRelated,
  parseDuckDuckGoHtml,
} from "./online-community-search.ts";
import { isCloudflareChallenge, parseOverframeTopBuilds } from "./overframe-online.ts";

describe("online community search parsers", () => {
  it("parses Overframe item HTML build links", () => {
    const html = `
      <a href="/build/111/excalibur-sp-umbra">SP Umbra Blade</a>
      <a href="https://overframe.gg/build/222/excalibur-budget">Budget Exalted</a>
      <a href="/build/333/excalibur-roam">Roaming Exalted</a>
    `;
    const builds = parseOverframeTopBuilds("Excalibur", html);
    assert.equal(builds.length, 3);
    assert.equal(builds[0]?.url, "https://overframe.gg/build/111/excalibur-sp-umbra");
    assert.match(builds[0]?.name ?? "", /SP Umbra/);
  });

  it("detects Cloudflare challenge pages", () => {
    assert.equal(isCloudflareChallenge(403, "forbidden"), true);
    assert.equal(isCloudflareChallenge(200, "<html>Just a moment...</html>"), true);
    assert.equal(isCloudflareChallenge(200, "<html>Excalibur builds</html>"), false);
  });

  it("parses DuckDuckGo HTML result anchors", () => {
    const html = `
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Foverframe.gg%2Fbuild%2F1%2Fx">
        Top Coda Hema build
      </a>
      <a class="result__a" href="https://wiki.warframe.com/w/Coda_Hema">Coda Hema wiki</a>
    `;
    const hits = parseDuckDuckGoHtml(html, 5);
    assert.equal(hits.length, 2);
    assert.equal(hits[0]?.url, "https://overframe.gg/build/1/x");
    assert.match(hits[0]?.title ?? "", /Coda Hema/);
    assert.equal(hits[1]?.url, "https://wiki.warframe.com/w/Coda_Hema");
  });

  it("detects Warframe-related queries without forcing general topics", () => {
    assert.equal(looksWarframeRelated("Coda Hema steel path build"), true);
    assert.equal(looksWarframeRelated("best pasta recipe"), false);
    assert.equal(looksWarframeRelated("Rust async tokio tutorial"), false);
    assert.equal(looksWarframeRelated("what is an arcane in warframe"), true);
  });
});
