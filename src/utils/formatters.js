export function formatTradeCount(n) {
  const num = Number(n) || 0;
  return `${num.toLocaleString('en-US')} trades`;
}

export function formatUrlNameToDisplay(urlName) {
  if (!urlName || typeof urlName !== 'string') return '';
  return urlName
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Prefer API `item_name`, else derive from url_name. */
export function getArcaneDisplayName(item) {
  if (item?.item_name && String(item.item_name).trim()) {
    return String(item.item_name).trim();
  }
  return formatUrlNameToDisplay(item?.url_name);
}

export function formatDateTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}
