/**
 * Provider-neutral commerce types.
 *
 * UI components import ONLY from these types and from `~/lib/commerce`.
 * A provider adapter (mock today, Square later) maps its own data into these
 * shapes. Never import provider-specific structures into components.
 */

import type { ImageMetadata } from 'astro';

/** Amount in MINOR units (cents) so no floating point maths is needed. */
export interface Money {
  amount: number;
  currency: string; // ISO 4217
}

export interface Media {
  /** Local ImageMetadata (imported asset) or a remote URL. Omit to render the neutral placeholder. */
  src?: ImageMetadata | string;
  alt: string;
  /** Required for remote URLs so layout doesn't shift. */
  width?: number;
  height?: number;
  /** CSS object-position for deliberate crops, e.g. "50% 20%". */
  focal?: string;
}

export type ProductCategory = 'box-set' | 'apparel' | 'jewelry' | 'accessory' | 'skull';

export interface Variant {
  id: string;
  title: string;
  price: Money;
  available: boolean;
  /** e.g. { Size: 'M' } */
  options: Record<string, string>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  /** Slugs of every collection this product belongs to. */
  collections: string[];
  /** Short line under the name. Only real, supplied copy — never invented claims. */
  summary?: string;
  description?: string;
  /** Free-form spec rows (materials, dimensions…). Optional per product. */
  details?: { label: string; value: string }[];
  images: Media[];
  variants: Variant[];
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
  category?: ProductCategory | ProductCategory[];
  featured?: boolean;
  limit?: number;
  sort?: ProductSort;
  /** Exclude a product (e.g. on "related products"). */
  excludeSlug?: string;
}

/**
 * The seam between the presentation layer and whichever commerce platform is
 * in use. Phase 3 adds cart + checkout hand-off methods.
 */
export interface CommerceProvider {
  readonly name: string;
  getCollections(kind?: CollectionKind): Promise<Collection[]>;
  getCollection(slug: string): Promise<Collection | undefined>;
  getProducts(query?: ProductQuery): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | undefined>;
}
