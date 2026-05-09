export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const REQUEST_SPACING_MS = 350;

/**
 * Sequentially invokes `iteratee` for each item, waiting `spacingMs` before each call after the first.
 * Use this to stay under ~3 requests/second for warframe.market.
 * If `iteratee` returns `false`, remaining items are skipped.
 */
export async function forEachWithSpacing(items, spacingMs, iteratee) {
  for (let i = 0; i < items.length; i += 1) {
    if (i > 0) await delay(spacingMs);
    const cont = await iteratee(items[i], i);
    if (cont === false) break;
  }
}
