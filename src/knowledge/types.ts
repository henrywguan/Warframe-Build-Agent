/** Agent-usable offline knowledge pack (no images). */

export type KnowledgeItemKind = "warframe" | "weapon" | "archwing" | "other";

export interface KnowledgeManifest {
  version: 1;
  generatedAt: string;
  sources: {
    wfcd: string;
    wiki: string;
    overframe: string;
  };
  counts: {
    catalogItems: number;
    wikiDigests: number;
    buildEntries: number;
    modsIndexed: number;
  };
  notes: string[];
  overframeStatus: "ok" | "blocked" | "partial" | "skipped";
}

export interface CatalogItem {
  id: string;
  name: string;
  kind: KnowledgeItemKind;
  category: string;
  type?: string;
  isPrime?: boolean;
  masteryReq?: number;
  description?: string;
  wikiaUrl?: string;
  /** Compact combat/stats fields for agent recall */
  stats: Record<string, unknown>;
  abilities?: Array<{ name?: string; description?: string }>;
}

export interface WikiDigest {
  id: string;
  title: string;
  pageUrl: string;
  extract: string;
  /** Extra sections when available (abilities, patch notes truncated) */
  sections?: Record<string, string>;
  fetchedAt: string;
}

/** One mod/arcane row scanned from an Overframe build. */
export interface BuildModEntry {
  name: string;
  kind: "mod" | "arcane";
  rank?: number;
  slot?: string;
}

export interface OverframeBuild {
  rank: 1 | 2;
  name: string;
  url?: string;
  author?: string;
  rating?: number;
  forma?: number;
  updatedAt?: string;
  /** Human-readable mod list / loadout summary for the agent */
  summary: string;
  /** Flat mod names (compat + quick display) */
  mods?: string[];
  /** Flat arcane names */
  arcanes?: string[];
  /** Structured mod/arcane rows when the crawler could parse them */
  modEntries?: BuildModEntry[];
  notes?: string;
}

export interface ItemBuilds {
  id: string;
  itemName: string;
  source: "overframe" | "import" | "unavailable";
  fetchedAt: string;
  builds: OverframeBuild[];
  error?: string;
}

export interface ModDigest {
  name: string;
  kind: "mod" | "arcane";
  extract: string;
  pageUrl: string;
  /** Items whose crawled top builds referenced this mod/arcane */
  seenOnItems?: string[];
}
