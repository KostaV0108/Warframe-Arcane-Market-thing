import { useState, useEffect } from 'react';
import { getItemStatistics } from '../utils/api.js';
import { forEachWithSpacing, REQUEST_SPACING_MS } from '../utils/rateLimit.js';
import { getArcaneDisplayName } from '../utils/formatters.js';

function resolveBuyRank(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return 5;
  return entries.some((e) => Number(e.mod_rank) === 5) ? 5 : 3;
}

/** Volume-weighted aggregates for one mod_rank across 90d closed rows. */
function aggregateRankStats(entries, rank) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const rows = entries.filter((e) => Number(e.mod_rank) === rank);
  if (rows.length === 0) return null;

  let vol = 0;
  let sumAvg = 0;
  let sumMed = 0;
  let minP = Infinity;
  let maxP = -Infinity;

  for (const e of rows) {
    const v = Number(e.volume) || 0;
    const ap = Number(e.avg_price);
    const med = Number(e.median);
    const mn = Number(e.min_price);
    const mx = Number(e.max_price);
    vol += v;
    if (v > 0 && Number.isFinite(ap)) sumAvg += v * ap;
    if (v > 0 && Number.isFinite(med)) sumMed += v * med;
    if (Number.isFinite(mn)) minP = Math.min(minP, mn);
    if (Number.isFinite(mx)) maxP = Math.max(maxP, mx);
  }

  const round2 = (n) => Math.round(n * 100) / 100;
  return {
    volume: vol,
    avgPrice: vol > 0 ? round2(sumAvg / vol) : 0,
    medianPrice: vol > 0 ? round2(sumMed / vol) : 0,
    minPrice: minP === Infinity ? 0 : minP,
    maxPrice: maxP === -Infinity ? 0 : maxP,
  };
}

function buildBuyLeaderboard(totalsMap) {
  return [...totalsMap.values()]
    .filter((row) => row.buyVol > 0)
    .sort((a, b) => b.buyVol - a.buyVol)
    .slice(0, 20)
    .map((row, idx) => ({
      rank: idx + 1,
      url_name: row.url_name,
      displayName: row.displayName,
      thumb: row.thumb,
      volume: row.buyVol,
      price: row.pricesMax.avgPrice,
      pricesMax: row.pricesMax,
    }));
}

function buildSellLeaderboard(totalsMap) {
  return [...totalsMap.values()]
    .filter((row) => row.sellVol > 0)
    .sort((a, b) => b.sellVol - a.sellVol)
    .slice(0, 20)
    .map((row, idx) => ({
      rank: idx + 1,
      url_name: row.url_name,
      displayName: row.displayName,
      thumb: row.thumb,
      volume: row.sellVol,
      price: row.prices0.avgPrice,
      prices0: row.prices0,
    }));
}

const emptyPrices = { avgPrice: 0, medianPrice: 0, minPrice: 0, maxPrice: 0, volume: 0 };

export function useArcaneStats(arcanes) {
  const [buyRows, setBuyRows] = useState([]);
  const [sellRows, setSellRows] = useState([]);
  const [allMetrics, setAllMetrics] = useState([]);
  
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentLabel: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!arcanes?.length) {
      setBuyRows([]);
      setSellRows([]);
      setAllMetrics([]);
      setProgress({ current: 0, total: 0, currentLabel: '' });
      setLoading(false);
      setDone(true);
      return undefined;
    }

    let cancelled = false;
    const totals = new Map();

    async function run() {
      setLoading(true);
      setDone(false);
      setBuyRows([]);
      setSellRows([]);
      setAllMetrics([]);
      setProgress({ current: 0, total: arcanes.length, currentLabel: '' });
      await forEachWithSpacing(arcanes, REQUEST_SPACING_MS, async (item, i) => {
        if (cancelled) return false;

        const displayName = getArcaneDisplayName(item);

        setProgress({
          current: i + 1,
          total: arcanes.length,
          currentLabel: displayName,
        });

        try {
          const json = await getItemStatistics(item.url_name);
          if (cancelled) return false;
          const closed = json?.payload?.statistics_closed?.['90days'] ?? [];
          const buyRank = resolveBuyRank(closed);
          const pricesMax = aggregateRankStats(closed, buyRank) ?? { ...emptyPrices };
          const prices0 = aggregateRankStats(closed, 0) ?? { ...emptyPrices };
          const buyVol = pricesMax.volume;
          const sellVol = prices0.volume;

          const row = {
            url_name: item.url_name,
            displayName,
            thumb: item.thumb,
            buyRank,
            buyVol,
            sellVol,
            pricesMax: {
              avgPrice: pricesMax.avgPrice,
              medianPrice: pricesMax.medianPrice,
              minPrice: pricesMax.minPrice,
              maxPrice: pricesMax.maxPrice,
            },
            prices0: {
              avgPrice: prices0.avgPrice,
              medianPrice: prices0.medianPrice,
              minPrice: prices0.minPrice,
              maxPrice: prices0.maxPrice,
            },
          };

          totals.set(item.url_name, row);
        } catch (err) {
          console.warn(`[Arcane stats] skipped ${item.url_name}:`, err);
        }

        if (!cancelled) {
          setBuyRows(buildBuyLeaderboard(totals));
          setSellRows(buildSellLeaderboard(totals));
          setAllMetrics([...totals.values()]);
        }

        return !cancelled;
      });

      if (!cancelled) {
        setLoading(false);
        setDone(true);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [arcanes]);

  return {
    buyRows,
    sellRows,
    allMetrics,
    progress,
    loading,
    done,
  };
}
