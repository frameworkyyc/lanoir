import type { APIRoute } from 'astro';

// Indexing is opt-in: only the production environment sets PUBLIC_ALLOW_INDEXING=true.
export const GET: APIRoute = ({ site }) => {
  const allow = import.meta.env.PUBLIC_ALLOW_INDEXING === 'true';
  const body = allow
    ? `User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /api/\nDisallow: /order-complete\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\nSitemap: ${new URL('/sitemap-catalog.xml', site).href}\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
