// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO(client): set SITE_URL in Cloudflare (production) to the real domain.
// The fallback below is a placeholder and must never be indexed.
const site = process.env.SITE_URL || 'https://lanoir.example.com';

// Static output: deploys to Cloudflare Pages / Workers static assets with no adapter.
// Build command: `npm run build`   Output directory: `dist`
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  prefetch: { defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  // TODO(square): when Square catalogue images are used, allow their CDN host(s) here:
  // image: { domains: ['<square-cdn-host>'] },
});
