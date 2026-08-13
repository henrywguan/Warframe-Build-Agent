import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksWarframeRelated,
  parseDuckDuckGoHtml,
  resolveWebSearchQuery,
} from "./online-community-search.ts";
import { isCloudflareChallenge, parseOverframeTopBuilds } from "./overframe-online.ts";

describe("online community search parsers", () => {
  it("does not treat smoothie/recipe asks as Warframe-related", () => {
    assert.equal(looksWarframeRelated("strawberry smoothie recipes"), false);
    assert.equal(looksWarframeRelated("how to make banana bread"), false);
    assert.equal(looksWarframeRelated("best Excalibur steel path build"), true);
    assert.equal(looksWarframeRelated("Coda Hema mods"), true);
  });

  it("general queries do not append warframe; forceWarframe does for augment", () => {
    const general = resolveWebSearchQuery("strawberry smoothie recipes");
    assert.equal(general.searchQuery, "strawberry smoothie recipes");
    assert.equal(general.includeWiki, false);
    assert.doesNotMatch(general.searchQuery, /warframe/i);

    const wf = resolveWebSearchQuery("Excalibur steel path");
    assert.equal(wf.searchQuery, "Excalibur steel path");
    assert.equal(wf.includeWiki, true);

    const forced = resolveWebSearchQuery("Enkaus", { forceWarframe: true });
    assert.match(forced.searchQuery, /warframe/i);
    assert.equal(forced.includeWiki, true);
  });

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
});
