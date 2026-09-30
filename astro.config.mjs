// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// TODO(client): set SITE_URL in Cloudflare (production) to the real domain.
// The fallback below is a placeholder and must never be indexed.
const site = process.env.SITE_URL || 'https://lanoir.example.com';

// Hybrid rendering on a Cloudflare Worker:
//  - output 'static' = pages are prerendered by default (about, contact, policies, cart shell…)
//  - pages that need live Square data opt out with `export const prerender = false`
//  - /api/* endpoints run on the Worker (server-side only; the Square token never reaches the browser)
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  adapter: cloudflare({
    // Square product images are served straight from Square's CDN (no Cloudflare Image
    // Transformations yet), and the logo uses pre-generated static WebP files (npm run brand-images).
    // To add transformations later, change this and the single helper in src/lib/images.ts.
    imageService: 'passthrough',
    // No Cloudflare Images binding: we don't use it, and it would be auto-provisioned on deploy.
    // @ts-expect-error — the adapter treats `false` as "do not add a binding"
    imagesBindingName: false,
  }),
  // Sessions are unused; `false` stops the adapter auto-provisioning a KV namespace.
  session: false,
  integrations: [sitemap()],
  prefetch: { defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
