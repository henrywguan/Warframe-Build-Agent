"use client";

import { SPEAKING_MS } from "../lib/ordis";
import { OrdisStage } from "./OrdisStage";
import styles from "./OrdisTransmitOverlay.module.css";

/**
 * Holographic glitch materialize when Ordis starts transmitting.
 * Tuned from a Warframe cephalon GIF reference (cyan diamond, white core,
 * scanline slices, brief magenta flashes) — original SVG/CSS, not game assets.
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
      <div className={styles.aura} />
      <div className={styles.dust} />
      <div className={styles.scan} />
      <div className={styles.glitchA} />
      <div className={styles.glitchB} />
      <div className={styles.figure}>
        <div className={styles.coreBloom} />
        <div className={styles.eyeRings} />
        <OrdisStage mood="speaking" size="hero" caption="" />
      </div>
      <p className={styles.caption}>Ordis is transmitting…</p>
    </div>
  );
}
