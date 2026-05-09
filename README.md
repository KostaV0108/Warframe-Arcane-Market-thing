# Arcane Market Tracker

React app that ranks Warframe **arcanes** by recent trading activity using the public [warframe.market](https://warframe.market) API (no API key).

## Setup

```bash
npm install
npm start
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

### CORS / API access

The warframe.market API is not exposed with browser CORS headers for cross-origin `fetch` (custom headers trigger a preflight that fails). This app calls **`/warframe-api/v2`** (item catalog) and **`/warframe-api/v1`** (per-item closed statistics — the v2 statistics route is unavailable) on the same origin; **Vite’s dev and preview servers** proxy those paths to `https://api.warframe.market`.

For production, reverse-proxy both path prefixes the same way, or set `VITE_WFM_API_V2_BASE` / `VITE_WFM_API_V1_BASE` at build time.

## Build

```bash
npm run build
```

## What it shows

- **Most Bought — Max Rank (R5):** total closed-trade volume over the last 90 days for max rank (uses R3 instead when no R5 data exists).
- **Most Sold — Unranked (R0):** total closed-trade volume for rank 0.

Requests are spaced by 350ms to respect the API’s recommended rate limit.

### AI Analysis (Free)

This feature uses the Google Gemini API (free tier) called directly from your browser. Your API key is stored in `localStorage` and is only ever sent to `googleapis.com`.

To get your free key:

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account
3. Click **Create API Key**
4. Paste it into the app

Free tier includes 15 requests per minute and 1M tokens per day — more than sufficient for personal use of this tool.

The app defaults to **`gemini-2.5-pro`** (override with `VITE_GEMINI_MODEL`, e.g. `gemini-2.5-flash`). Older IDs such as `gemini-1.5-flash` may return **404**.

Output length uses **`maxOutputTokens` 8192** by default so long analyses are not cut off mid-sentence (Pro used to hit a low limit quickly). Override with `VITE_GEMINI_MAX_OUTPUT_TOKENS` if needed. Restart the dev server after changing `.env`.
