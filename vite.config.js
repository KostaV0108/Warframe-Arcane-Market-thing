import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Catalog: v2. Closed-order statistics: v1 (v2 item statistics route is not available).
 * Browser stays same-origin; Vite forwards to api.warframe.market.
 */
const wfmProxy = {
  '/warframe-api/v2': {
    target: 'https://api.warframe.market',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/warframe-api\/v2/, '/v2'),
  },
  '/warframe-api/v1': {
    target: 'https://api.warframe.market',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/warframe-api\/v1/, '/v1'),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: wfmProxy,
  },
  preview: {
    proxy: wfmProxy,
  },
});
