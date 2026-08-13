"use client";

import { SPEAKING_MS } from "../lib/ordis";
import { OrdisStage } from "./OrdisStage";
import styles from "./OrdisTransmitOverlay.module.css";

/**
 * Holographic fade/pop when Ordis starts transmitting — inspired by
 * Warframe’s cephalon materialize (reference clip; we can’t decode the
 * YouTube frames here, so this is an original approximation).
 */
export function OrdisTransmitOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      className={styles.root}
      style={{ ["--speak-ms" as string]: `${SPEAKING_MS}ms` }}
      aria-hidden="true"
    >
      <div className={styles.veil} />
      <div className={styles.scan} />
      <div className={styles.burst} />
      <div className={styles.figure}>
        <OrdisStage mood="speaking" size="hero" caption="Ordis is transmitting…" />
      </div>
    </div>
  );
}
