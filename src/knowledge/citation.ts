/** Source citation block for agent answers. */

export type CitationSource = {
  kind: "pack" | "status" | "market" | "patches" | "wiki" | "community" | "agent";
  label: string;
  asOf?: string;
};

const KIND_LABEL: Record<CitationSource["kind"], string> = {
  pack: "Offline pack",
  status: "Warframe Status",
  market: "Warframe.market",
  patches: "Patch notes",
  wiki: "Warframe Wiki",
  community: "Community build",
  agent: "Agent estimate",
};

export function formatCitationBlock(sources: CitationSource[]): string {
  const lines = ["Sources:"];
  if (!sources.length) {
    lines.push("- (none listed)");
  } else {
    for (const src of sources) {
      const kind = KIND_LABEL[src.kind] ?? src.kind;
      const asOf = src.asOf ? ` · as of ${src.asOf}` : "";
      lines.push(`- [${kind}] ${src.label}${asOf}`);
    }
  }
  lines.push(
    "",
    "Patch-sensitive: rankings, prices, and live timers change with hotfixes — verify before trading or forma spending.",
  );
  return lines.join("\n");
}
