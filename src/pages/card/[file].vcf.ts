import type { APIRoute } from 'astro';
import { card } from '~/config/card';
import { buildVCard, vcardFilename } from '~/lib/card/vcard.ts';
import { resolveCardUrl } from '~/lib/card/url.ts';

export const prerender = false;

/**
 * The saved contact: /card/<fileBase>.vcf. A plain link (works without JavaScript).
 * Served as text/vcard so iOS Safari can offer its contact sheet; other browsers download it,
 * named after the person and business. The embedded card URL matches the environment.
 */
export const GET: APIRoute = ({ params, request }) => {
  const filename = vcardFilename(card.fileBase);
  if (`${params.file}.vcf` !== filename) return new Response(null, { status: 404 });

  const cardUrl = resolveCardUrl({
    requestUrl: request.url,
    isProduction: import.meta.env.PUBLIC_ALLOW_INDEXING === 'true',
    productionUrl: card.productionUrl,
  });
  return new Response(buildVCard({ ...card, cardUrl }), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-cache',
      'X-Robots-Tag': 'noindex',
    },
  });
};
