import type { APIRoute } from 'astro';
import { commerce } from '~/lib/commerce';
import { collectionUrl, productUrl } from '~/lib/routes';

export const prerender = false;

/**
 * Sitemap for the live-catalogue pages (shop, collections, products). The build-time sitemap
 * (sitemap-index.xml) only knows static routes; product pages come from Square on request.
 * Empty on failure rather than erroring, so a Square outage never poisons crawlers with a 500.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('https://lanoir.example.com');
  const abs = (path: string) => new URL(path, origin).href;
  const urls = new Set<string>([abs('/shop'), abs('/statement-wear'), abs('/accessories')]);
  try {
    for (const c of await commerce.getCollections()) urls.add(abs(collectionUrl(c)));
    for (const p of await commerce.getProducts()) urls.add(abs(productUrl(p.slug)));
  } catch {
    /* serve what we have */
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};
