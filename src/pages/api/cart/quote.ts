import type { APIRoute } from 'astro';
import { assertSameOrigin, errorResponse, json, readJsonBody } from '~/lib/api';
import { commerce } from '~/lib/commerce';
import { parseCartLines } from '~/lib/commerce/cart.ts';

export const prerender = false;

/**
 * POST { lines: [{ variantId, quantity }] }  →  { quote }
 * Prices/validates cart lines from current catalogue + inventory. The browser supplies ids and
 * quantities only; every price, name and availability in the response comes from the server.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    assertSameOrigin(request);
    const body = (await readJsonBody(request)) as { lines?: unknown } | null;
    const lines = parseCartLines(body?.lines, { allowEmpty: true });
    if (lines.length === 0) return json({ quote: { lines: [], subtotal: null, canCheckout: false } });
    return json({ quote: await commerce.quoteCart(lines) });
  } catch (err) {
    return errorResponse(err);
  }
};

export const ALL: APIRoute = () => json({ error: { code: 'invalid_request', message: 'Method not allowed.' } }, 405);
