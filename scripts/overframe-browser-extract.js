/**
 * Cloudflare-safe Overframe extractor — run in a normal browser tab AFTER you
 * can already see the page (you passed Cloudflare as a human).
 *
 * How to use:
 *  1. Open https://overframe.gg in Chrome/Edge/Firefox and pass Cloudflare.
 *  2. Open an item page (e.g. /items/coda-hema/) or a build page (/build/…).
 *  3. Open DevTools → Console, paste this whole file, press Enter.
 *  4. A JSON download starts; the same payload is copied to the clipboard when allowed.
 *  5. Accumulate rows, then import:
 *       npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json
 *
 * This does NOT bypass Cloudflare. It only reads __NEXT_DATA__ / DOM already loaded
 * in your tab (same idea as a bookmarklet).
 */
(function overframeBrowserExtract() {
  const TOP_N = 3;

  function stripTags(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksLikeArcane(name) {
    return /^arcane\b/i.test(name) || /\b(primary|secondary|melee)\b.+/i.test(name);
  }

  function asString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  function asNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  function entryFromUnknown(value, kindHint) {
    if (typeof value === "string" && value.trim()) {
      const name = value.trim();
      return { name, kind: kindHint || (looksLikeArcane(name) ? "arcane" : "mod") };
    }
    if (!value || typeof value !== "object") return null;
    const row = value;
    const name =
      asString(row.name) ||
      asString(row.title) ||
      asString(row.label) ||
      asString(row.uniqueName);
    if (!name) return null;
    const kindRaw = asString(row.kind) || asString(row.type) || asString(row.category);
    const kind =
      kindHint ||
      (kindRaw && /arcane/i.test(kindRaw)
        ? "arcane"
        : looksLikeArcane(name)
          ? "arcane"
          : "mod");
    return { name, kind };
  }

  function collectModEntries(value, kindHint, out = [], depth = 0) {
    if (depth > 8 || out.length > 40) return out;
    if (Array.isArray(value)) {
      for (const entry of value) collectModEntries(entry, kindHint, out, depth + 1);
      return out;
    }
    if (!value || typeof value !== "object") {
      const one = entryFromUnknown(value, kindHint);
      if (one) out.push(one);
      return out;
    }
    const row = value;
    const keyed = [
      ["mods", "mod"],
      ["modList", "mod"],
      ["arcanes", "arcane"],
      ["arcaneList", "arcane"],
      ["items", undefined],
    ];
    let hit = false;
    for (const [key, hint] of keyed) {
      if (key in row) {
        hit = true;
        collectModEntries(row[key], hint, out, depth + 1);
      }
    }
    if (!hit) {
      const one = entryFromUnknown(row, kindHint);
      if (one) out.push(one);
      else {
        for (const nested of Object.values(row)) {
          if (out.length > 40) break;
          collectModEntries(nested, kindHint, out, depth + 1);
        }
      }
    }
    const seen = new Set();
    return out.filter((e) => {
      const k = `${e.kind}:${e.name.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function buildUrlFromRow(row) {
    if (typeof row.url === "string" && /overframe\.gg\/build\//i.test(row.url)) return row.url;
    if (typeof row.buildUrl === "string") return row.buildUrl;
    if (typeof row.slug === "string" && (typeof row.id === "number" || typeof row.id === "string")) {
      return `https://overframe.gg/build/${row.id}/${row.slug}`;
    }
    return undefined;
  }

  function collectBuildCards(value, out = []) {
    if (out.length >= TOP_N) return out;
    if (Array.isArray(value)) {
      for (const entry of value) collectBuildCards(entry, out);
      return out;
    }
    if (!value || typeof value !== "object") return out;
    const row = value;
    const url = buildUrlFromRow(row);
    const name = asString(row.name) || asString(row.title);
    const entries = collectModEntries(row);
    if (name && (url || entries.length)) {
      const mods = entries.filter((e) => e.kind === "mod").map((e) => e.name);
      const arcanes = entries.filter((e) => e.kind === "arcane").map((e) => e.name);
      out.push({
        rank: out.length + 1,
        name,
        url,
        forma: asNumber(row.forma) ?? asNumber(row.formas),
        mods: mods.length ? mods : undefined,
        arcanes: arcanes.length ? arcanes : undefined,
        summary: [name, mods.length ? `mods: ${mods.slice(0, 16).join(", ")}` : "", arcanes.length ? `arcanes: ${arcanes.slice(0, 6).join(", ")}` : ""]
          .filter(Boolean)
          .join(" — "),
      });
    }
    for (const nested of Object.values(row)) {
      if (out.length >= TOP_N) break;
      collectBuildCards(nested, out);
    }
    return out.slice(0, TOP_N);
  }

  function readNextData() {
    const el = document.getElementById("__NEXT_DATA__");
    if (!el || !el.textContent) return null;
    try {
      return JSON.parse(el.textContent);
    } catch {
      return null;
    }
  }

  function guessItemName(next) {
    const fromTitle = stripTags(document.title || "")
      .replace(/\s*[|\-–].*$/, "")
      .replace(/\s*builds?\s*$/i, "")
      .trim();
    const path = location.pathname || "";
    const itemMatch = path.match(/\/items\/([^/]+)/i);
    if (itemMatch) {
      return decodeURIComponent(itemMatch[1]).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    // Prefer a clear name from Next data when present.
    const stack = [next];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== "object") continue;
      if (Array.isArray(cur)) {
        for (const x of cur) stack.push(x);
        continue;
      }
      const row = cur;
      if (asString(row.itemName)) return asString(row.itemName);
      if (asString(row.weaponName)) return asString(row.weaponName);
      if (asString(row.warframeName)) return asString(row.warframeName);
      if (
        (asString(row.type) || asString(row.category) || "").match(/warframe|weapon|companion|primary|secondary|melee/i) &&
        asString(row.name)
      ) {
        return asString(row.name);
      }
      for (const v of Object.values(row)) stack.push(v);
    }
    return fromTitle || "Unknown Item";
  }

  function extractFromBuildPage(next) {
    const entries = collectModEntries(next);
    const mods = entries.filter((e) => e.kind === "mod").map((e) => e.name);
    const arcanes = entries.filter((e) => e.kind === "arcane").map((e) => e.name);
    const name =
      asString(next?.props?.pageProps?.build?.name) ||
      asString(next?.props?.pageProps?.name) ||
      stripTags(document.title || "").replace(/\s*[|\-–].*$/, "") ||
      "Imported build";
    return [
      {
        rank: 1,
        name,
        url: location.href.split("?")[0],
        mods: mods.length ? mods : undefined,
        arcanes: arcanes.length ? arcanes : undefined,
        summary: [name, mods.length ? `mods: ${mods.slice(0, 16).join(", ")}` : ""]
          .filter(Boolean)
          .join(" — "),
      },
    ];
  }

  function extractFromItemPage(next) {
    let builds = collectBuildCards(next);
    if (!builds.length) {
      const links = [...document.querySelectorAll('a[href*="/build/"]')];
      const seen = new Set();
      for (const a of links) {
        if (builds.length >= TOP_N) break;
        let href = a.getAttribute("href") || "";
        if (!/\/build\/\d+/i.test(href)) continue;
        if (href.startsWith("/")) href = `https://overframe.gg${href}`;
        if (seen.has(href)) continue;
        seen.add(href);
        builds.push({
          rank: builds.length + 1,
          name: stripTags(a.textContent || "").slice(0, 160) || `Build #${builds.length + 1}`,
          url: href,
          summary: stripTags(a.textContent || "") || "Top community build",
        });
      }
    }
    return builds;
  }

  const next = readNextData();
  if (!next && !/overframe\.gg/i.test(location.hostname)) {
    console.error("Open an overframe.gg page first (after Cloudflare), then re-run.");
    return;
  }
  if (!next) {
    console.error("No __NEXT_DATA__ on this page. Wait for the item/build page to finish loading.");
    return;
  }

  const isBuildPage = /\/build\/\d+/i.test(location.pathname);
  const itemName = guessItemName(next);
  const builds = isBuildPage ? extractFromBuildPage(next) : extractFromItemPage(next);

  if (!builds.length) {
    console.error("Could not find builds/mods on this page. Try the item page or a specific build page.");
    return;
  }

  const row = { itemName, builds };
  const payload = JSON.stringify([row], null, 2);
  const slug = itemName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `overframe-${slug || "item"}.json`;

  try {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("Download failed; use clipboard / console copy.", err);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(payload).then(
      () => console.log("Copied import JSON to clipboard."),
      () => console.log("Clipboard blocked — copy from the object below."),
    );
  }

  console.log("Overframe extract ready — merge into builds-export.json then:");
  console.log("  npm run knowledge -- crawl-overframe --import-builds ./data/knowledge/builds-export.json");
  console.log(row);
  return row;
})();
