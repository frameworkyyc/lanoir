import { assertCheckoutable, parseCartLines, quoteLines } from '../cart.ts';
import { CommerceError } from '../types.ts';
import type { CommerceProvider, Product, ProductQuery } from '../types.ts';
import { collections, products } from './data.ts';

const byPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price.amount));

/**
 * In-memory provider backed by ./data.ts. For local design work only
 * (COMMERCE_PROVIDER=mock). The cart works against it; checkout does not.
 */
export const mockProvider: CommerceProvider = {
  name: 'mock',

  async getCollections(kind) {
    return collections.filter((c) => !kind || c.kind === kind).sort((a, b) => a.order - b.order);
  },

  async getCollection(slug) {
    return collections.find((c) => c.slug === slug);
  },

  async getProducts(query: ProductQuery = {}) {
    let list = products.filter((p) => {
      if (query.collection && !p.collections.includes(query.collection)) return false;
      if (query.featured && !p.featured) return false;
      if (query.excludeSlug && p.slug === query.excludeSlug) return false;
      return true;
    });

    switch (query.sort) {
      case 'price-asc': list = [...list].sort((a, b) => byPrice(a) - byPrice(b)); break;
      case 'price-desc': list = [...list].sort((a, b) => byPrice(b) - byPrice(a)); break;
      case 'name': list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break; // 'featured' = source order
    }
    return query.limit ? list.slice(0, query.limit) : list;
  },

  async getProduct(slug) {
    return products.find((p) => p.slug === slug);
  },

  async quoteCart(lines) {
    return quoteLines(lines, products);
  },

  async createCheckout(request) {
    assertCheckoutable(quoteLines(parseCartLines(request.lines), products));
    throw new CommerceError('checkout_unavailable', 'Checkout is not available in this environment.', 503);
  },
};
