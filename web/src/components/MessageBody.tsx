"use client";

import { splitAbCompare } from "../lib/compare-layout";
import styles from "../app/page.module.css";

export function MessageBody({
  content,
  toolsUsed,
}: {
  content: string;
  toolsUsed?: string[];
}) {
  const layout = splitAbCompare(content, toolsUsed);
  if (layout.kind === "plain") {
    return <>{layout.text}</>;
  }

  return (
    <div className={styles.compareBlock}>
      {layout.intro ? <div>{layout.intro}</div> : null}
      <div className={styles.compareColumns} role="group" aria-label="Side-by-side comparison">
        {[layout.a, layout.b].map((col) => (
          <section key={col.title} className={styles.compareCol}>
            <h3 className={styles.compareTitle}>{col.title}</h3>
            <div className={styles.compareBody}>{col.body}</div>
          </section>
        ))}
      </div>
      {layout.outro ? <div>{layout.outro}</div> : null}
    </div>
  );
}
