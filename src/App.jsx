import { useState, useEffect, useMemo, useCallback } from 'react';
import { getItems, parseItemsList } from './utils/api.js';
import { useArcaneStats } from './hooks/useArcaneStats.js';
import { ProgressBar } from './components/ProgressBar.jsx';
import { Leaderboard } from './components/Leaderboard.jsx';
import { AIAnalysisPanel } from './components/AIAnalysisPanel.jsx';
import { formatDateTime } from './utils/formatters.js';
import styles from './App.module.css';

/** Stable reference so useArcaneStats’s [arcanes] effect does not re-run every render. */
const EMPTY_ARCANES = [];

export default function App() {
  const [items, setItems] = useState(null);
  const [itemsError, setItemsError] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsFetchKey, setItemsFetchKey] = useState(0);

  const arcanes = useMemo(() => {
    if (!items?.length) return [];
    return items.filter((it) => typeof it?.url_name === 'string' && it.url_name.startsWith('arcane_'));
  }, [items]);

  const { buyRows, sellRows, allMetrics, progress, loading: statsLoading, done: statsDone, pricesMaxAvgPrice, prices0AvgPrice } = useArcaneStats(
    itemsLoading || itemsError ? EMPTY_ARCANES : arcanes
  );

  const [lastUpdated, setLastUpdated] = useState(null);

  const retryItems = useCallback(() => {
    setItems(null);
    setItemsError(null);
    setItemsFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setItemsLoading(true);
      setItemsError(null);
      try {
        const json = await getItems();
        const list = parseItemsList(json);
        if (!list) throw new Error('Unexpected /items response shape');
        if (!cancelled) setItems(list);
      } catch (e) {
        console.error('[Items]', e);
        if (!cancelled) setItemsError(e instanceof Error ? e.message : 'Failed to load items');
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, [itemsFetchKey]);

  useEffect(() => {
    if (statsDone && !statsLoading && arcanes.length > 0) {
      setLastUpdated(new Date().toISOString());
    }
  }, [statsDone, statsLoading, arcanes.length]);

  const showStatsProgress = !itemsLoading && !itemsError && arcanes.length > 0 && statsLoading;

  const buySkeletonSlots =
    statsLoading && arcanes.length > 0 ? Math.max(0, Math.min(20, arcanes.length) - buyRows.length) : 0;
  const sellSkeletonSlots =
    statsLoading && arcanes.length > 0 ? Math.max(0, Math.min(20, arcanes.length) - sellRows.length) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.brand}>Arcane Market Tracker</h1>
          <p className={styles.meta}>
            {lastUpdated ? (
              <>
                Last updated: <time dateTime={lastUpdated}>{formatDateTime(lastUpdated)}</time>
              </>
            ) : itemsLoading ? (
              'Loading catalog…'
            ) : (
              '—'
            )}
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {itemsLoading && (
          <p className={styles.hint}>Fetching item catalog from warframe.market…</p>
        )}

        {itemsError && (
          <div className={styles.errorBox}>
            <p className={styles.errorText}>Could not load items: {itemsError}</p>
            <button type="button" className={styles.retry} onClick={retryItems}>
              Retry
            </button>
          </div>
        )}

        {!itemsLoading && !itemsError && arcanes.length === 0 && (
          <p className={styles.hint}>No arcane items found in the catalog.</p>
        )}

        {showStatsProgress && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
            label={progress.currentLabel}
          />
        )}

        {!itemsLoading && !itemsError && arcanes.length > 0 && (
          <div className={styles.grid}>
            <Leaderboard
              title=" Most Bought — Max Rank (R5)"
              rows={buyRows}
              price={pricesMaxAvgPrice}
              loading={statsLoading}
              skeletonSlots={buySkeletonSlots}
            />
            <Leaderboard
              title=" Most Sold — Unranked (R0)"
              rows={sellRows}
              price={prices0AvgPrice}
              loading={statsLoading}
              skeletonSlots={sellSkeletonSlots}
            />
          </div>
        )}

        {!itemsLoading && !itemsError && arcanes.length > 0 && (
          <AIAnalysisPanel
            buyRows={buyRows}
            sellRows={sellRows}
            allMetrics={allMetrics}
            statsReady={statsDone && !statsLoading}
          />
        )}

        {!itemsLoading && !itemsError && arcanes.length > 0 && statsDone && !statsLoading && (
          <p className={styles.footerNote}>
            Rankings use closed-order volume from the last 90 days (warframe.market statistics). Buy column
            uses rank 5 totals, or rank 3 when no rank 5 data exists.
          </p>
        )}
      </main>
    </div>
  );
}
