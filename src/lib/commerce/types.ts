/**
 * Provider-neutral commerce types.
 *
 * UI components import ONLY from these types and from `~/lib/commerce`.
 * A provider adapter (mock, Square) maps its own data into these shapes.
 * Never import provider-specific structures into components.
 *
 * NOTE: imported directly by node:test unit tests (Node type-stripping): keep it free of
 * Astro/Vite-only imports. Only `import type` from 'astro' is allowed (erased at runtime).
 */

import type { ImageMetadata } from 'astro';

/** Amount in MINOR units (cents) so no floating point maths is needed. */
export interface Money {
  amount: number;
  currency: string; // ISO 4217
}

export interface Media {
  /** Local ImageMetadata (imported asset) or a remote URL (e.g. Square CDN). Omit to render the neutral placeholder. */
  src?: ImageMetadata | string;
  alt: string;
  width?: number;
  height?: number;
  /** CSS object-position for deliberate crops, e.g. "50% 20%". */
  focal?: string;
}

/**
 * - available   can be added to cart and purchased
 * - sold-out    tracked inventory says none left (or the merchant marked it sold out)
 * - unavailable cannot be bought online (e.g. no fixed price, not sellable)
 */
export type Availability = 'available' | 'sold-out' | 'unavailable';

export interface Variant {
  /** Provider id of the purchasable unit. For Square this IS the catalog variation ID used on orders. */
  id: string;
  title: string;
  sku?: string;
  price: Money;
  availability: Availability;
  /** Convenience: `availability === 'available'`. */
  available: boolean;
  /** Only present when the provider tracks stock for this variant. `quantity` = units on hand. */
  inventory?: { tracked: boolean; quantity?: number };
  /** e.g. { Size: 'M', Colour: 'Black' }. Empty for products without variations. */
  options: Record<string, string>;
}

/** A selectable option (Size, Colour…) and its values, in merchant order. */
export interface OptionGroup {
  name: string;
  values: { value: string; /** CSS hex colour if the provider supplies one (Square colour options). */ swatch?: string }[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Free-form product type if the provider has one. Not used for navigation. */
  category?: string;
  /** Slugs of every collection this product belongs to. */
  collections: string[];
  summary?: string;
  description?: string;
  /** Free-form spec rows (materials, dimensions…). Optional per product. */
  details?: { label: string; value: string }[];
  /** Zero images is valid — the UI shows a neutral placeholder. */
  images: Media[];
  variants: Variant[];
  /** Ordered option groups derived from the variants. Empty when there are no options. */
  optionGroups: OptionGroup[];
  featured?: boolean;
}

export type CollectionKind = 'signature' | 'exclusive' | 'category';

export interface Collection {
  slug: string;
  name: string;
  kind: CollectionKind;
  /** Position within its kind, used for the 01/02/03 numbering. */
  order: number;
  tagline: string;
  description: string;
  image?: Media;
}

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'name';

export interface ProductQuery {
  collection?: string;
  featured?: boolean;
  limit?: number;
  sort?: ProductSort;
  /** Exclude a product (e.g. on "related products"). */
  excludeSlug?: string;
}

// ---- Cart + checkout (provider-neutral) --------------------------------------

/** What the browser is allowed to send: ids and quantities only — NEVER prices. */
export interface CartLineInput {
  variantId: string;
  quantity: number;
}

export type LineIssue =
  | { code: 'not-found' }
  | { code: 'sold-out' }
  | { code: 'unavailable' }
  | { code: 'insufficient-stock'; available: number };

/** A cart line as validated by the server against the catalogue. */
export interface QuotedLine {
  variantId: string;
  productSlug: string;
  productName: string;
  variantTitle: string;
  options: Record<string, string>;
  image?: Media;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  /** Max the customer may buy right now (stock-limited or the global per-line cap). */
  maxQuantity: number;
  issue?: LineIssue;
}

export interface CartQuote {
  lines: QuotedLine[];
  /** Sum of purchasable lines only. Shipping and tax are added by the checkout, not computed here. */
  subtotal: Money | null;
  /** True when every line is purchasable and the cart is non-empty. */
  canCheckout: boolean;
}

export type FulfillmentMethod = 'shipping' | 'pickup';

export interface CheckoutRequest {
  lines: CartLineInput[];
  /** Defaults to 'shipping'. 'pickup' is wired end-to-end but disabled until enabled in config. */
  fulfillment?: FulfillmentMethod;
  /** Optional: subtotal the customer saw (minor units). A mismatch returns PRICE_CHANGED instead of charging a different price silently. */
  expectedSubtotal?: number;
}

export interface CheckoutResult {
  /** Provider-hosted checkout URL to redirect the customer to. */
  url: string;
}

export type CommerceErrorCode =
  | 'not_configured' // credentials/config missing or invalid
  | 'upstream_error' // provider unreachable / returned an error
  | 'invalid_request' // malformed cart or checkout body
  | 'cart_invalid' // a line is unavailable / out of stock / unknown
  | 'price_changed'
  | 'fulfillment_disabled'
  | 'checkout_unavailable'; // provider doesn't support checkout (mock)

/** Safe to show to customers: `message` never contains provider details or secrets. */
export class CommerceError extends Error {
  readonly code: CommerceErrorCode;
  readonly status: number;
  readonly detail?: unknown;
  constructor(code: CommerceErrorCode, message: string, status = 500, detail?: unknown) {
    super(message);
    this.name = 'CommerceError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/**
 * The seam between the presentation layer and whichever commerce platform is in use.
 * All price / inventory / checkout validation happens behind this interface, server-side.
 */
export interface CommerceProvider {
  readonly name: string;
  getCollections(kind?: CollectionKind): Promise<Collection[]>;
  getCollection(slug: string): Promise<Collection | undefined>;
  getProducts(query?: ProductQuery): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | undefined>;
  /** Validates + prices cart lines with current data. Never throws for bad lines; flags them. */
  quoteCart(lines: CartLineInput[]): Promise<CartQuote>;
  /** Re-validates with FRESH data and returns the provider-hosted checkout URL. Throws CommerceError. */
  createCheckout(request: CheckoutRequest, context: { origin: string }): Promise<CheckoutResult>;
}
