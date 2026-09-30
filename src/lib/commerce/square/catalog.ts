/**
 * Loads the catalogue + inventory from Square and maps it to Products.
 * Server-side only. Square is the source of truth for products, prices, variations,
 * images and inventory; nothing here persists data.
 */
import type { Product } from '../types.ts';
import { cached } from './cache.ts';
import { squareRequest, type FetchLike } from './client.ts';
import type { SquareConfig } from './config.ts';
import type { InventoryCounts } from './inventory.ts';
import { mapCatalog, trackedVariationIds, type MapOptions } from './mapper.ts';
import type { SquareCatalogObject, SquareInventoryResponse, SquareListCatalogResponse } from './types.ts';

export async function fetchCatalogObjects(config: SquareConfig, fetchImpl?: FetchLike): Promise<SquareCatalogObject[]> {
  const objects: SquareCatalogObject[] = [];
  let cursor: string | undefined;
  let guard = 0;
  do {
    const page = await squareRequest<SquareListCatalogResponse>(
      config,
      '/v2/catalog/list',
      { query: { types: 'ITEM,CATEGORY,IMAGE,ITEM_OPTION,ITEM_OPTION_VAL', cursor }, retry: true },
      fetchImpl,
    );
    objects.push(...(page.objects ?? []));
    cursor = page.cursor || undefined;
  } while (cursor && ++guard < 50);
  return objects;
}

/** Units IN_STOCK at the configured location for the given variation ids. */
export async function fetchInventoryCounts(
  config: SquareConfig,
  variationIds: string[],
  fetchImpl?: FetchLike,
): Promise<InventoryCounts> {
  const counts: InventoryCounts = new Map();
  for (let i = 0; i < variationIds.length; i += 500) {
    const chunk = variationIds.slice(i, i + 500);
    let cursor: string | undefined;
    let guard = 0;
    do {
      const page = await squareRequest<SquareInventoryResponse>(
        config,
        '/v2/inventory/counts/batch-retrieve',
        {
          method: 'POST',
          body: { catalog_object_ids: chunk, location_ids: [config.locationId], states: ['IN_STOCK'], ...(cursor ? { cursor } : {}) },
          retry: true, // read-only despite POST
        },
        fetchImpl,
      );
      for (const c of page.counts ?? []) {
        if (c.catalog_object_id && c.state === 'IN_STOCK' && c.location_id === config.locationId) {
          counts.set(c.catalog_object_id, (counts.get(c.catalog_object_id) ?? 0) + Number(c.quantity ?? 0));
        }
      }
      cursor = page.cursor || undefined;
    } while (cursor && ++guard < 50);
  }
  return counts;
}

export interface LoadDeps {
  fetchImpl?: FetchLike;
  mapOptions: Omit<MapOptions, 'locationId'>;
  /** Bypass the cache (checkout uses this so a sale is never validated against stale stock). */
  fresh?: boolean;
  now?: () => number;
}

export async function loadProducts(config: SquareConfig, deps: LoadDeps): Promise<Product[]> {
  const key = `square:${config.environment}:${config.locationId}:products`;
  return cached(
    key,
    config.cacheSeconds,
    async () => {
      const objects = await fetchCatalogObjects(config, deps.fetchImpl);
      const tracked = trackedVariationIds(objects, config.locationId);
      const counts = tracked.length ? await fetchInventoryCounts(config, tracked, deps.fetchImpl) : new Map();
      return mapCatalog(objects, counts, { ...deps.mapOptions, locationId: config.locationId, now: deps.now });
    },
    { fresh: deps.fresh, now: deps.now },
  );
}
