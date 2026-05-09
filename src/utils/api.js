/**
 * In the browser, use same-origin `/warframe-api/v2` and `/warframe-api/v1` so Vite’s
 * proxy can reach api.warframe.market without CORS issues.
 *
 * Override with `VITE_WFM_API_V2_BASE` / `VITE_WFM_API_V1_BASE` if you terminate your own proxy.
 */
function getBaseV2() {
  const raw = import.meta.env.VITE_WFM_API_V2_BASE ?? '/warframe-api/v2';
  return String(raw).replace(/\/$/, '');
}

function getBaseV1() {
  const raw = import.meta.env.VITE_WFM_API_V1_BASE ?? '/warframe-api/v1';
  return String(raw).replace(/\/$/, '');
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Platform: 'pc',
  Language: 'en',
};

async function apiGet(base, path) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const url = path.startsWith('http') ? path : `${base}${suffix}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/** Full v2 /items JSON (see `parseItemsList`). */
export function getItems() {
  return apiGet(getBaseV2(), '/items');
}

/** Per-item closed statistics — only v1 exposes this for `slug` URLs today. */
export function getItemStatistics(urlName) {
  return apiGet(getBaseV1(), `/items/${encodeURIComponent(urlName)}/statistics`);
}

/**
 * Normalize catalog entries to `{ id, url_name, item_name, thumb }`.
 * v2: `data[]` with `slug` + `i18n.en`. Legacy v1: `payload.items` with `url_name`.
 */
export function parseItemsList(json) {
  if (Array.isArray(json?.data)) {
    return json.data.map((item) => {
      const en = item?.i18n?.en ?? {};
      const slug = item?.slug;
      return {
        id: item.id,
        url_name: slug ?? '',
        item_name: en.name || slug || '',
        thumb: en.thumb || '',
      };
    });
  }
  if (Array.isArray(json?.payload?.items)) {
    return json.payload.items;
  }
  return null;
}

export function getThumbUrl(thumb) {
  if (!thumb) return '';
  const path = thumb.startsWith('/') ? thumb.slice(1) : thumb;
  return `https://warframe.market/static/assets/${path}`;
}
