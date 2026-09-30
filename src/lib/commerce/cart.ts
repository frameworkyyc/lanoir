/**
 * Cart validation — provider-neutral and PURE. Every decision about price, stock and
 * whether a line may be bought is made here, on the server, from catalogue data.
 * The browser only ever supplies variant ids and quantities.
 */
import { CommerceError } from './types.ts';
import type { CartLineInput, CartQuote, CheckoutRequest, Money, Product, QuotedLine, Variant } from './types.ts';

export const CART_LIMITS = {
  maxLines: 30,
  /** Hard ceiling for any single line. TODO(client): confirm the per-item purchase limit. */
  maxQuantityPerLine: 10,
  /** Absolute parse limit so absurd numbers are rejected outright. */
  maxParsedQuantity: 99,
} as const;

// Square ids are alphanumeric (plus '#' for temporary ids, never valid here). Be strict.
const ID = /^[A-Za-z0-9_-]{6,64}$/;

/** Parses untrusted input into clean lines. Duplicate variant ids are merged. Throws invalid_request. */
export function parseCartLines(raw: unknown, opts: { allowEmpty?: boolean } = {}): CartLineInput[] {
  const bad = (msg: string) => new CommerceError('invalid_request', msg, 400);
  if (!Array.isArray(raw)) throw bad('Cart lines must be a list.');
  if (raw.length === 0 && !opts.allowEmpty) throw bad('Your cart is empty.');
  if (raw.length > CART_LIMITS.maxLines) throw bad('Too many items in the cart.');

  const merged = new Map<string, number>();
  for (const line of raw) {
    if (typeof line !== 'object' || line === null) throw bad('Invalid cart line.');
    const { variantId, quantity } = line as Record<string, unknown>;
    if (typeof variantId !== 'string' || !ID.test(variantId)) throw bad('Invalid item.');
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.maxParsedQuantity) {
      throw bad('Invalid quantity.');
    }
    merged.set(variantId, Math.min((merged.get(variantId) ?? 0) + quantity, CART_LIMITS.maxParsedQuantity));
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

const times = (m: Money, q: number): Money => ({ amount: m.amount * q, currency: m.currency });

export function quoteLines(lines: CartLineInput[], products: Product[]): CartQuote {
  const index = new Map<string, { product: Product; variant: Variant }>();
  for (const product of products) for (const variant of product.variants) index.set(variant.id, { product, variant });

  const currency = lines.map((l) => index.get(l.variantId)?.variant.price.currency).find(Boolean) ?? 'USD';
  const quoted: QuotedLine[] = lines.map((line) => {
    const hit = index.get(line.variantId);
    if (!hit) {
      const zero = { amount: 0, currency };
      return {
        variantId: line.variantId, productSlug: '', productName: 'Item no longer available', variantTitle: '', options: {},
        quantity: line.quantity, unitPrice: zero, lineTotal: zero, maxQuantity: 0, issue: { code: 'not-found' },
      };
    }
    const { product, variant } = hit;
    const stockCap = variant.inventory?.tracked ? (variant.inventory.quantity ?? 0) : Infinity;
    const maxQuantity = variant.available ? Math.min(CART_LIMITS.maxQuantityPerLine, stockCap) : 0;

    let issue: QuotedLine['issue'];
    if (variant.availability === 'sold-out') issue = { code: 'sold-out' };
    else if (variant.availability === 'unavailable' || variant.price.currency !== currency) issue = { code: 'unavailable' };
    else if (line.quantity > maxQuantity) issue = { code: 'insufficient-stock', available: maxQuantity };

    return {
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantTitle: variant.title,
      options: variant.options,
      image: product.images[0],
      quantity: line.quantity,
      unitPrice: variant.price,
      lineTotal: times(variant.price, line.quantity),
      maxQuantity,
      ...(issue ? { issue } : {}),
    };
  });

  const ok = quoted.filter((l) => !l.issue);
  const subtotal = ok.length ? { amount: ok.reduce((s, l) => s + l.lineTotal.amount, 0), currency } : null;
  return { lines: quoted, subtotal, canCheckout: quoted.length > 0 && ok.length === quoted.length };
}

/** Throws unless every line can be bought right now (and, optionally, the price is what the customer saw). */
export function assertCheckoutable(quote: CartQuote, expectedSubtotal?: number): void {
  if (!quote.canCheckout) {
    throw new CommerceError('cart_invalid', 'Some items in your cart are no longer available as shown.', 409, {
      issues: quote.lines.filter((l) => l.issue).map((l) => ({ variantId: l.variantId, issue: l.issue })),
    });
  }
  if (expectedSubtotal !== undefined && quote.subtotal && quote.subtotal.amount !== expectedSubtotal) {
    throw new CommerceError('price_changed', 'Prices in your cart have changed. Please review your cart.', 409);
  }
}

/** Parses an untrusted checkout body. Throws invalid_request. */
export function parseCheckoutRequest(raw: unknown): CheckoutRequest {
  const bad = (msg: string) => new CommerceError('invalid_request', msg, 400);
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw bad('Invalid request.');
  const { lines, fulfillment, expectedSubtotal } = raw as Record<string, unknown>;

  if (fulfillment !== undefined && fulfillment !== 'shipping' && fulfillment !== 'pickup') throw bad('Invalid delivery option.');
  if (expectedSubtotal !== undefined && (typeof expectedSubtotal !== 'number' || !Number.isInteger(expectedSubtotal) || expectedSubtotal < 0)) {
    throw bad('Invalid subtotal.');
  }
  return {
    lines: parseCartLines(lines),
    ...(fulfillment ? { fulfillment } : {}),
    ...(expectedSubtotal !== undefined ? { expectedSubtotal } : {}),
  };
}
