import type { Collection } from './commerce/types';

/** Where each collection lives. Categories get their own top-level routes. */
export function collectionUrl(c: Pick<Collection, 'slug' | 'kind'>): string {
  if (c.kind === 'category') return `/${c.slug}`;
  return `/collections/${c.slug}`;
}

export const productUrl = (slug: string) => `/products/${slug}`;
