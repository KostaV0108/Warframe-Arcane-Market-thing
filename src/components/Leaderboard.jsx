import { ArcaneCard } from './ArcaneCard.jsx';
import styles from './Leaderboard.module.css';

export function Leaderboard({ title, rows, loading, skeletonSlots }) {
  const maxVolume = rows.length ? rows[0].volume : 0;
  const skeletonCount = loading ? Math.max(0, skeletonSlots) : 0;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.list}>
        {rows.map((row) => (
          <ArcaneCard
            key={row.url_name}
            rank={row.rank}
            displayName={row.displayName}
            volume={row.volume}
            price={row.price}
            thumb={row.thumb}
            maxVolume={maxVolume}

          />
        ))}
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ArcaneCard key={`skel-${i}`} skeleton />
        ))}
      </div>
    </section>
  );
}
