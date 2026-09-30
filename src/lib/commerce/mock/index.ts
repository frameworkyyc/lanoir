import type { CommerceProvider, Product, ProductQuery } from '../types';
import { collections, products } from './data';

const byPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price.amount));

/** In-memory provider backed by ./data.ts. Phase 1 only. */
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
      if (query.category) {
        const cats = Array.isArray(query.category) ? query.category : [query.category];
        if (!cats.includes(p.category)) return false;
      }
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
};
