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
  mods?: string[];
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
  extract: string;
  pageUrl: string;
}
