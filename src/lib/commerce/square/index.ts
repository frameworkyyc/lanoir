/**
 * Square implementation of CommerceProvider. Server-side only.
 * Config is resolved lazily so prerendering static pages (which never call Square)
 * works without credentials.
 */
import { collections as editorialCollections, FEATURED_CATEGORY } from '../../../config/collections.ts';
import { assertCheckoutable, parseCartLines, quoteLines } from '../cart.ts';
import type { CommerceProvider, Product, ProductQuery } from '../types.ts';
import { loadProducts } from './catalog.ts';
import { buildPaymentLinkRequest, createPaymentLink } from './checkout.ts';
import type { FetchLike } from './client.ts';
import type { SquareConfig } from './config.ts';

export interface SquareProviderDeps {
  getConfig: () => SquareConfig;
  fetchImpl?: FetchLike;
  newIdempotencyKey?: () => string;
  now?: () => number;
}

const price = (p: Product) => Math.min(...p.variants.map((v) => v.price.amount));

export function createSquareProvider(deps: SquareProviderDeps): CommerceProvider {
  const mapOptions = { collections: editorialCollections, featuredCategory: FEATURED_CATEGORY };
  const products = (fresh = false) =>
    loadProducts(deps.getConfig(), { fetchImpl: deps.fetchImpl, mapOptions, fresh, now: deps.now });

  return {
    name: 'square',

    // Editorial: no Square call, so collection pages/prerendering never need credentials.
    async getCollections(kind) {
      return editorialCollections.filter((c) => !kind || c.kind === kind).sort((a, b) => a.order - b.order);
    },
    async getCollection(slug) {
      return editorialCollections.find((c) => c.slug === slug);
    },

    async getProducts(query: ProductQuery = {}) {
      let list = (await products()).filter((p) => {
        if (query.collection && !p.collections.includes(query.collection)) return false;
        if (query.featured && !p.featured) return false;
        if (query.excludeSlug && p.slug === query.excludeSlug) return false;
        return true;
      });
      switch (query.sort) {
        case 'price-asc': list = [...list].sort((a, b) => price(a) - price(b)); break;
        case 'price-desc': list = [...list].sort((a, b) => price(b) - price(a)); break;
        case 'name': list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
        default: break;
      }
      return query.limit ? list.slice(0, query.limit) : list;
    },

    async getProduct(slug) {
      return (await products()).find((p) => p.slug === slug);
    },

    async quoteCart(lines) {
      return quoteLines(lines, await products());
    },

    async createCheckout(request, { origin }) {
      const config = deps.getConfig();
      const lines = parseCartLines(request.lines);
      // Re-validate against FRESH catalogue + inventory; never trust what the browser displayed.
      const quote = quoteLines(lines, await products(true));
      assertCheckoutable(quote, request.expectedSubtotal);

      const body = buildPaymentLinkRequest({
        config,
        lines,
        fulfillment: request.fulfillment,
        origin,
        idempotencyKey: (deps.newIdempotencyKey ?? (() => crypto.randomUUID()))(),
      });
      return { url: await createPaymentLink(config, body, deps.fetchImpl) };
    },
  };
}
