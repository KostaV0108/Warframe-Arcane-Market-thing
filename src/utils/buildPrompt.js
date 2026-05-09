export const SYSTEM_PROMPT = `You are a Warframe market analyst expert. You analyze trading data from warframe.market
to identify profitable opportunities. You understand the following facts:

- ONE max rank (R5) arcane breaks down into exactly 21 rank 0 (R0) arcanes
- Strategy: BUY 1 R5 arcane at or below its minimum listed price → break down → SELL 21 R0 arcanes at median price
- Use MINIMUM R5 price as acquisition cost (realistic lowball buy)
- Use MEDIAN R0 price as sell target (realistic, not optimistic)
- Profit formula: (R0_median × 21) - R5_min_price
- Only recommend if R0 volume is high enough to sell all 21 units over a reasonable timeframe
- If no arcane is profitable at median prices, say so clearly and instead recommend the CLOSEST to profitable and what price you would need to acquire the R5 at to break even

Be in depth and detailed. Only respond with the analysis, no other text. Respond in markdown format.`;

const GEMINI_KEY_STORAGE = 'wfm_gemini_key';

export function getStoredGeminiKey() {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredGeminiKey(key) {
  try {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } catch {
    /* ignore */
  }
}

export function clearStoredGeminiKey() {
  try {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

/**
 * @param {object} params
 * @param {Array} params.buyRows — top buy leaderboard rows (with volume + prices)
 * @param {Array} params.sellRows — top sell leaderboard rows
 * @param {Array} params.allMetrics — full per-arcane metrics (for arbitrage)
 */
export function buildGeminiPayload({ buyRows, sellRows, allMetrics }) {
  const topBuyByVolume = (buyRows || []).slice(0, 20).map((a) => ({
    name: a.displayName,
    totalVolume90d: a.volume,
    price: a.price,
  }));

  const topSellByVolume = (sellRows || []).slice(0, 20).map((a) => ({
    name: a.displayName,
    totalVolume90d: a.volume,
    price: a.price,
  }));

  const arcanesThatAppearInBoth = (allMetrics || []).filter((m) => m.buyVol > 0 && m.sellVol > 0);

  const arbitrageOpportunities = arcanesThatAppearInBoth.map((a) => {
    const avgBuyPrice = a.pricesMax.avgPrice;
    const avgSellPrice = a.prices0.avgPrice;
    return {
      name: a.displayName,
      buyVolumeRank0: a.buyVol,
      sellVolumeMaxRank: a.sellVol,
      avgPriceRank0: avgSellPrice,
      avgPriceMaxRank: avgBuyPrice,
      impliedFlipMargin: Math.round((avgBuyPrice - avgSellPrice) * 100) / 100,
    };
  });

  return {
    topBuyByVolume,
    topSellByVolume,
    arbitrageOpportunities,
  };
}

export function buildUserMessage(payload) {
  return `Here is live 90-day trading data from warframe.market. Analyze it and tell me:

** Best breakdown flip opportunity**
Which arcane gives the best profit when you:
- BUY 1 copy at max rank (rank 5)
- BREAK IT DOWN into 21 rank 0 copies
- SELL each rank 0 copy individually

Calculate explicitly for your top pick:
- Cost: rank 5 avg price (what you pay)
- Revenue: rank 0 avg price × 21 (what you collect)
- Net profit: Revenue - Cost

Only recommend arcanes where rank 0 sell volume is high enough to realistically 
move all 21 units without crashing the price.

**4. Red flags**
Any arcanes in the top 20 with suspicious price/volume patterns, extreme spreads 
with low volume, or signs of price manipulation.

Market data:
${JSON.stringify(payload, null, 2)}`;
}
