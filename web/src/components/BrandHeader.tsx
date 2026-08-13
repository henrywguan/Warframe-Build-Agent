"use client";

import styles from "../app/page.module.css";

export function BrandHeader({ tagline }: { tagline: string }) {
  return (
    <header className={styles.brand}>
      <h1 className={styles.brandMark}>
        Warframe <span>Build Agent</span>
      </h1>
      <hr className={styles.brandRule} />
      <p className={styles.tagline}>{tagline}</p>
    </header>
  );
}
