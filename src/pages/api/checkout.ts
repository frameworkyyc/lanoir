import type { APIRoute } from 'astro';
import { assertSameOrigin, errorResponse, json, readJsonBody } from '~/lib/api';
import { commerce } from '~/lib/commerce';
import { parseCheckoutRequest } from '~/lib/commerce/cart.ts';

export const prerender = false;

/**
 * POST { lines, fulfillment?, expectedSubtotal? }  →  { url }
 * Re-validates the cart with FRESH data, creates a Square-hosted checkout for the catalog
 * variation ids, and returns the Square URL to redirect to. Payment happens on Square.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    assertSameOrigin(request);
    const checkout = parseCheckoutRequest(await readJsonBody(request));
    const { url } = await commerce.createCheckout(checkout, { origin: new URL(request.url).origin });
    return json({ url });
  } catch (err) {
    return errorResponse(err);
  }
};

export const ALL: APIRoute = () => json({ error: { code: 'invalid_request', message: 'Method not allowed.' } }, 405);
