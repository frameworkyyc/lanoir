import { runtimeEnv } from '../runtime-env';
import { mockProvider } from './mock/index.ts';
import { resolveSquareConfig } from './square/config.ts';
import { createSquareProvider } from './square/index.ts';
import { CommerceError } from './types.ts';
import type { CommerceProvider } from './types.ts';

export * from './types.ts';

/**
 * Chooses the provider per request from the Worker environment.
 *  - default: Square (SQUARE_ENVIRONMENT decides sandbox vs production; never defaults)
 *  - COMMERCE_PROVIDER=mock: local design work. REFUSED when SQUARE_ENVIRONMENT=production,
 *    so a production site can never silently serve fake products.
 */
export function getCommerce(): CommerceProvider {
  const env = runtimeEnv();
  if ((env.COMMERCE_PROVIDER ?? 'square').toLowerCase() === 'mock') {
    if ((env.SQUARE_ENVIRONMENT ?? '').toLowerCase() === 'production') {
      throw new CommerceError('not_configured', 'The shop is temporarily unavailable.', 503, 'mock provider refused in production');
    }
    return mockProvider;
  }
  return createSquareProvider({ getConfig: () => resolveSquareConfig(runtimeEnv()) });
}

/**
 * Lazy facade so components keep `import { commerce } from '~/lib/commerce'`.
 * The provider (and therefore the environment) is resolved when a method is called,
 * not at import time.
 */
export const commerce: CommerceProvider = {
  get name() { return getCommerce().name; },
  getCollections: (kind) => getCommerce().getCollections(kind),
  getCollection: (slug) => getCommerce().getCollection(slug),
  getProducts: (query) => getCommerce().getProducts(query),
  getProduct: (slug) => getCommerce().getProduct(slug),
  quoteCart: (lines) => getCommerce().quoteCart(lines),
  createCheckout: (req, ctx) => getCommerce().createCheckout(req, ctx),
};
