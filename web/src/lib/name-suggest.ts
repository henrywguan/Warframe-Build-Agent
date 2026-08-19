/** Rank offline pack names for arsenal / /wfm autocomplete. */

export type SuggestMode = "single" | "list";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function scoreSuggestName(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (q.startsWith(n) && n.length >= 4) return 70;
  const idx = n.indexOf(q);
  if (idx === 0) return 88;
  if (idx > 0) return 65 - Math.min(20, idx);
  const qTokens = q.split(" ").filter(Boolean);
  const nTokens = n.split(" ").filter(Boolean);
  if (!qTokens.length) return 0;
  const hits = qTokens.filter((t) => nTokens.some((nt) => nt.startsWith(t) || nt.includes(t)));
  if (!hits.length) return 0;
  return Math.round((hits.length / qTokens.length) * 50);
}

export function suggestNames(
  query: string,
  dictionary: readonly string[],
  options?: { limit?: number; exclude?: readonly string[] },
): string[] {
  const limit = options?.limit ?? 8;
  const exclude = new Set((options?.exclude ?? []).map((n) => n.toLowerCase()));
  const q = query.trim();
  if (!q) return [];
  return dictionary
    .filter((name) => name.trim() && !exclude.has(name.toLowerCase()))
    .map((name) => ({ name, score: scoreSuggestName(q, name) }))
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row) => row.name);
}

/** Split a comma/semicolon/newline list so autocomplete edits the last fragment. */
export function splitSuggestList(value: string): { prefix: string; token: string } {
  const idx = Math.max(
    value.lastIndexOf(","),
    value.lastIndexOf(";"),
    value.lastIndexOf("\n"),
  );
  if (idx < 0) return { prefix: "", token: value };
  return {
    prefix: value.slice(0, idx + 1),
    token: value.slice(idx + 1).replace(/^\s+/, ""),
  };
}

export function applySuggestPick(
  current: string,
  pick: string,
  mode: SuggestMode,
): string {
  if (mode === "single") return pick;
  const { prefix, token } = splitSuggestList(current);
  const existing = prefix
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const already = existing.some((name) => name.toLowerCase() === pick.toLowerCase());
  const names = already && !token.trim() ? existing : [...existing, pick];
  return names.length ? `${names.join(", ")}, ` : `${pick}, `;
}

export type OfflineSuggestPack = {
  generatedAt?: string;
  source?: string;
  mods: string[];
  arcanes: string[];
  items: {
    warframe: string[];
    primary: string[];
    secondary: string[];
    melee: string[];
    companion: string[];
  };
};

export const EMPTY_SUGGEST_PACK: OfflineSuggestPack = {
  mods: [],
  arcanes: [],
  items: {
    warframe: [],
    primary: [],
    secondary: [],
    melee: [],
    companion: [],
  },
};

export function allItemNames(pack: OfflineSuggestPack): string[] {
  return [
    ...pack.items.warframe,
    ...pack.items.primary,
    ...pack.items.secondary,
    ...pack.items.melee,
    ...pack.items.companion,
  ];
}

export function wfmSuggestDictionary(pack: OfflineSuggestPack): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...pack.mods, ...pack.arcanes, ...allItemNames(pack)]) {
    const key = name.toLowerCase();
    if (!name.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
