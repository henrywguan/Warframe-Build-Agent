"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { splitAbCompare } from "../lib/compare-layout";
import pageStyles from "../app/page.module.css";
import styles from "./MessageBody.module.css";

const markdownComponents: Components = {
  a({ href, children }) {
    const safeHref = typeof href === "string" ? href : undefined;
    const external = Boolean(safeHref && /^https?:\/\//i.test(safeHref));
    return (
      <a
        href={safeHref}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
};

function Markdown({ text }: { text: string }) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={markdownComponents}
        skipHtml
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function MessageBody({
  content,
  toolsUsed,
}: {
  content: string;
  toolsUsed?: string[];
}) {
  const layout = splitAbCompare(content, toolsUsed);
  if (layout.kind === "plain") {
    return <Markdown text={layout.text} />;
  }

  return (
    <div className={pageStyles.compareBlock}>
      {layout.intro ? <Markdown text={layout.intro} /> : null}
      <div
        className={pageStyles.compareColumns}
        role="group"
        aria-label="Side-by-side comparison"
      >
        {[layout.a, layout.b].map((col) => (
          <section key={col.title} className={pageStyles.compareCol}>
            <h3 className={pageStyles.compareTitle}>{col.title}</h3>
            <div className={pageStyles.compareBody}>
              <Markdown text={col.body} />
            </div>
          </section>
        ))}
      </div>
      {layout.outro ? <Markdown text={layout.outro} /> : null}
    </div>
  );
}
