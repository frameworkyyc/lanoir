/**
 * Builds and sends the Square-hosted checkout (Payment Links API) request.
 *
 * - Line items reference Square CATALOG VARIATION IDs only, so Square prices the order
 *   from its own catalogue and decrements inventory when payment completes.
 * - No prices, names or totals from the browser are ever sent to Square.
 * - Shipping: the customer enters an address on Square's page. Shipping rates and taxes
 *   come from the Square account; nothing is hardcoded here.
 * - Pickup: wired but disabled until FULFILLMENT_PICKUP_ENABLED=true.
 */
import { CommerceError } from '../types.ts';
import type { CartLineInput, FulfillmentMethod } from '../types.ts';
import { squareRequest, type FetchLike } from './client.ts';
import type { SquareConfig } from './config.ts';
import type { SquarePaymentLinkResponse } from './types.ts';

export interface PaymentLinkRequest {
  idempotency_key: string;
  order: {
    location_id: string;
    line_items: { catalog_object_id: string; quantity: string }[];
    pricing_options: { auto_apply_taxes: boolean };
  };
  checkout_options: {
    ask_for_shipping_address: boolean;
    redirect_url: string;
    allow_tipping: boolean;
  };
}

export function buildPaymentLinkRequest(args: {
  config: SquareConfig;
  lines: CartLineInput[];
  fulfillment?: FulfillmentMethod;
  origin: string;
  idempotencyKey: string;
}): PaymentLinkRequest {
  const { config, lines, origin, idempotencyKey } = args;
  const fulfillment = args.fulfillment ?? 'shipping';

  if (!config.fulfillment[fulfillment]) {
    throw new CommerceError('fulfillment_disabled', 'That delivery option is not available.', 400);
  }
  if (lines.length === 0) throw new CommerceError('invalid_request', 'Your cart is empty.', 400);

  return {
    idempotency_key: idempotencyKey,
    order: {
      location_id: config.locationId,
      line_items: lines.map((l) => ({ catalog_object_id: l.variantId, quantity: String(l.quantity) })),
      // Use the taxes configured in the Square account — never computed by the website.
      pricing_options: { auto_apply_taxes: true },
    },
    checkout_options: {
      // TODO(pickup): when pickup is enabled, set false and add the pickup fulfillment details
      // to `order`. Verify the exact Square fields in Sandbox first.
      ask_for_shipping_address: fulfillment === 'shipping',
      redirect_url: new URL('/order-complete', origin).toString(),
      allow_tipping: false,
    },
  };
}

const ALLOWED_CHECKOUT_HOSTS = /(^|\.)(squareup|squareupsandbox|square)\.(com|link)$/i;

export async function createPaymentLink(
  config: SquareConfig,
  body: PaymentLinkRequest,
  fetchImpl?: FetchLike,
): Promise<string> {
  const res = await squareRequest<SquarePaymentLinkResponse>(
    config,
    '/v2/online-checkout/payment-links',
    { method: 'POST', body, retry: true }, // safe to retry: same idempotency key
    fetchImpl,
  );
  const raw = res.payment_link?.url || res.payment_link?.long_url;
  let url: URL | undefined;
  try { url = raw ? new URL(raw) : undefined; } catch { /* invalid */ }
  // Only ever redirect the customer to Square-owned https hosts.
  if (!url || url.protocol !== 'https:' || !ALLOWED_CHECKOUT_HOSTS.test(url.hostname)) {
    throw new CommerceError('upstream_error', 'We could not start checkout. Please try again.', 502, { reason: 'unexpected checkout url' });
  }
  return url.toString();
}
