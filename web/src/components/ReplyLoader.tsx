/**
 * Pending-reply bar loader adapted from Uiverse (aryamitra06 / silent-lion-21, MIT).
 * Palette remapped to arsenal cyan / plasma / gold with a faint glow.
 */
import styles from "./ReplyLoader.module.css";

export function ReplyLoader({ label = "Ordis is consulting…" }: { label?: string }) {
  return (
    <div className={styles.root} role="status" aria-live="polite" aria-label={label}>
      <div className={styles.loader} aria-hidden="true">
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
