import type { OrdisMood } from "../lib/ordis";
import styles from "./OrdisStage.module.css";

export type { OrdisMood };

interface OrdisStageProps {
  mood: OrdisMood;
  caption: string;
  /** Larger cephalon for the transmit overlay “wow” moment. */
  size?: "stage" | "hero";
  className?: string;
}

export function OrdisStage({
  mood,
  caption,
  size = "stage",
  className,
}: OrdisStageProps) {
  return (
    <section
      className={[styles.stage, styles[mood], size === "hero" ? styles.hero : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="Ordis cephalon"
      data-mood={mood}
    >
      <div className={styles.field} aria-hidden="true">
        <span className={`${styles.ring} ${styles.ring1}`} />
        <span className={`${styles.ring} ${styles.ring2}`} />
        <span className={`${styles.ring} ${styles.ring3}`} />
        <span className={`${styles.wave} ${styles.wave1}`} />
        <span className={`${styles.wave} ${styles.wave2}`} />
        <span className={`${styles.wave} ${styles.wave3}`} />
        <span className={`${styles.wave} ${styles.wave4}`} />

        <svg
          className={styles.cephalon}
          viewBox="0 0 200 200"
          role="img"
          aria-label="Animated Ordis-inspired cephalon"
        >
          <defs>
            <radialGradient id="ordisCore" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#b8fbff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#4fd6e0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0a3a42" stopOpacity="0.2" />
            </radialGradient>
            <linearGradient id="ordisFacet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d7b56d" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#7fe7ef" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3a2f18" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="ordisEdge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3efe4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#7a6534" stopOpacity="0.7" />
            </linearGradient>
            <filter id="ordisGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="100" cy="100" r="72" fill="url(#ordisCore)" opacity="0.35" />

          <g className={styles.cube} filter="url(#ordisGlow)">
            <polygon
              points="100,34 158,68 158,132 100,166 42,132 42,68"
              fill="rgba(8,14,22,0.88)"
              stroke="url(#ordisFacet)"
              strokeWidth="2.2"
            />
            <polygon
              points="100,34 158,68 100,100 42,68"
              fill="rgba(127,231,239,0.08)"
              stroke="url(#ordisEdge)"
              strokeWidth="1.4"
            />
            <polygon
              points="158,68 158,132 100,100"
              fill="rgba(215,181,109,0.1)"
              stroke="rgba(215,181,109,0.55)"
              strokeWidth="1.2"
            />
            <polygon
              points="42,68 100,100 42,132"
              fill="rgba(0,196,204,0.08)"
              stroke="rgba(127,231,239,0.45)"
              strokeWidth="1.2"
            />
            <polygon
              points="42,132 100,166 158,132 100,100"
              fill="rgba(4,8,14,0.55)"
              stroke="rgba(122,101,52,0.65)"
              strokeWidth="1.2"
            />

            <polygon
              className={styles.core}
              points="100,62 128,90 100,118 72,90"
              fill="url(#ordisCore)"
              stroke="#7fe7ef"
              strokeWidth="1.4"
            />
            <circle className={styles.pupil} cx="100" cy="90" r="7.5" fill="#e8fbff" />

            <g className={styles.cracks} stroke="#7fe7ef" strokeWidth="1.15" fill="none">
              <path d="M86 58 L94 78 L82 96" opacity="0.85" />
              <path d="M118 70 L108 88 L124 108" opacity="0.7" />
              <path d="M70 118 L92 126 L104 148" opacity="0.65" />
              <path d="M130 120 L112 132 L120 150" opacity="0.55" />
            </g>
          </g>

          <g className={styles.radio} fill="none" stroke="#7fe7ef">
            <path
              className={styles.arc}
              d="M48 78 C36 100, 36 100, 48 122"
              strokeWidth="1.6"
              opacity="0.55"
            />
            <path
              className={styles.arc}
              d="M152 78 C164 100, 164 100, 152 122"
              strokeWidth="1.6"
              opacity="0.55"
            />
            <path
              className={styles.arcLate}
              d="M34 70 C16 100, 16 100, 34 130"
              strokeWidth="1.3"
              opacity="0.4"
            />
            <path
              className={styles.arcLate}
              d="M166 70 C184 100, 184 100, 166 130"
              strokeWidth="1.3"
              opacity="0.4"
            />
          </g>
        </svg>
      </div>

      <p className={styles.caption}>{caption}</p>
    </section>
  );
}
