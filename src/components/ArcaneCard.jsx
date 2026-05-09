import { useState } from 'react';
import { getThumbUrl } from '../utils/api.js';
import { formatTradeCount } from '../utils/formatters.js';
import styles from './ArcaneCard.module.css';

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" fill="#1a2332"/>
      <text x="32" y="36" text-anchor="middle" fill="#5c6b7a" font-size="10" font-family="system-ui">?</text>
    </svg>`
  );

export function ArcaneCard({ rank, displayName, thumb, volume, price, maxVolume, skeleton }) {
  const [imgErr, setImgErr] = useState(false);

  if (skeleton) {
    return (
      <div className={`${styles.card} ${styles.skeleton}`} aria-hidden>
        <div className={styles.skelRank} />
        <div className={styles.skelThumb} />
        <div className={styles.skelBody}>
          <div className={styles.skelLineWide} />
          <div className={styles.skelLineNarrow} />
          <div className={styles.skelBar} />
        </div>
      </div>
    );
  }

  const src = imgErr || !thumb ? PLACEHOLDER : getThumbUrl(thumb);
  const pct = maxVolume > 0 ? Math.round((volume / maxVolume) * 100) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.rank}>{rank}</div>
      <img
        className={styles.thumb}
        src={src}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        onError={() => setImgErr(true)}
      />
      <div className={styles.body}>
        <div className={styles.name}>{displayName}</div>
        <div className={styles.volume}>{formatTradeCount(volume)}</div>
        <div className={styles.price}>{price}</div>
        <div className={styles.barTrack} title={`${pct}% of #1 volume`}>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
