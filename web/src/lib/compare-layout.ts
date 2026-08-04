/**
 * Detect A/B item sections in assistant text (typically two `## Name` blocks
 * from DPS compare or dual knowledge lookups) for side-by-side layout.
 */

export type CompareColumn = { title: string; body: string };

export type CompareLayout =
  | { kind: "plain"; text: string }
  | {
      kind: "ab";
      intro: string;
      a: CompareColumn;
      b: CompareColumn;
      outro: string;
    };

const HEADING_SPLIT = /(?=^##\s+)/m;

function sectionFromChunk(chunk: string): CompareColumn | null {
  const trimmed = chunk.trim();
  if (!trimmed.startsWith("## ")) return null;
  const nl = trimmed.indexOf("\n");
  const titleLine = (nl === -1 ? trimmed : trimmed.slice(0, nl)).replace(/^##\s+/, "").trim();
  const body = nl === -1 ? "" : trimmed.slice(nl + 1).trim();
  if (!titleLine) return null;
  return { title: titleLine, body };
}

function headingLines(content: string): string[] {
  return content.match(/^##\s+.+$/gm) ?? [];
}

/** True when the message looks like a two-item comparison worth column layout. */
export function looksLikeAbCompare(content: string, toolsUsed?: string[]): boolean {
  const headings = headingLines(content);
  if (toolsUsed?.some((t) => /dps|compare/i.test(t)) && headings.length >= 2) return true;
  if (/modded dps compare/i.test(content) && /^##\s+/m.test(content)) return true;
  if (/\bvs\.?\b/i.test(content) && headings.length >= 2) return true;
  return headings.length === 2;
}

export function splitAbCompare(content: string, toolsUsed?: string[]): CompareLayout {
  if (!looksLikeAbCompare(content, toolsUsed)) {
    return { kind: "plain", text: content };
  }

  const introParts: string[] = [];
  const sections: CompareColumn[] = [];

  for (const chunk of content.split(HEADING_SPLIT)) {
    if (!chunk.trim()) continue;
    const section = sectionFromChunk(chunk);
    if (section) sections.push(section);
    else introParts.push(chunk.trim());
  }

  if (sections.length < 2) {
    return { kind: "plain", text: content };
  }

  const [a, b, ...rest] = sections;
  const peeled = peelTrailingOutro(b!.body);
  const restText = rest
    .map((s) => `## ${s.title}${s.body ? `\n${s.body}` : ""}`)
    .join("\n\n")
    .trim();

  return {
    kind: "ab",
    intro: introParts.join("\n\n").trim(),
    a: a!,
    b: { title: b!.title, body: peeled.body },
    outro: [peeled.outro, restText].filter(Boolean).join("\n\n").trim(),
  };
}

/** Move shared footer lines (Caveats / closing notes) out of column B. */
function peelTrailingOutro(body: string): { body: string; outro: string } {
  const match = body.match(/\n\n((?:Caveats:|Notes:)[\s\S]*)$/i);
  if (!match || match.index == null) return { body, outro: "" };
  return {
    body: body.slice(0, match.index).trim(),
    outro: match[1]!.trim(),
  };
}
