import styles from './ProgressBar.module.css';

export function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.row}>
        <span className={styles.caption}>
          Loading {current} / {total} arcanes
        </span>
        <span className={styles.pct}>{pct}%</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {label ? <div className={styles.label}>Fetching: {label}</div> : null}
    </div>
  );
}
