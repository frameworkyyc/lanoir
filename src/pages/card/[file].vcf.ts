import type { APIRoute } from 'astro';
import { card } from '~/config/card';
import { buildVCard, vcardFilename } from '~/lib/card/vcard.ts';
import { resolveCardPublicUrl } from '~/lib/card/url.ts';
import { runtimeEnv } from '~/lib/runtime-env';

export const prerender = false;

/**
 * The saved contact: /card/<fileBase>.vcf. A plain link (works without JavaScript).
 * Served as text/vcard so iOS Safari can offer its contact sheet; other browsers download it,
 * named after the person and business. The Digital-card URL is the configured permanent URL
 * (the Website field stays card.website).
 */
export const GET: APIRoute = ({ params }) => {
  const filename = vcardFilename(card.fileBase);
  if (`${params.file}.vcf` !== filename) return new Response(null, { status: 404 });

  const cardUrl = resolveCardPublicUrl(runtimeEnv().CARD_PUBLIC_URL, card.publicUrl, (bad) =>
    console.error(`[card] CARD_PUBLIC_URL is not a valid https URL ("${bad.slice(0, 80)}"); using the default`),
  );
  return new Response(buildVCard({ ...card, cardUrl }), {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-cache',
      'X-Robots-Tag': 'noindex',
    },
  });
};
