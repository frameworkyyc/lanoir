/**
 * Resolves whether a Square item variation can be bought, and how many are left.
 * Pure: no network. Covers: sold-out, untracked inventory, per-location overrides,
 * variable pricing, and non-sellable variations.
 */
import type { Availability, Money, Variant } from '../types.ts';
import type { SquareCatalogObject, SquareLocationOverride, SquareMoney } from './types.ts';

/** variation id → units IN_STOCK at the configured location. Absent = no count recorded. */
export type InventoryCounts = Map<string, number>;

export const toMoney = (m: SquareMoney | undefined): Money | undefined => {
  if (!m || m.amount === undefined || !m.currency) return undefined;
  const amount = Number(m.amount);
  return Number.isFinite(amount) && amount >= 0 ? { amount, currency: m.currency } : undefined;
};

export const locationOverride = (v: SquareCatalogObject, locationId: string): SquareLocationOverride | undefined =>
  v.item_variation_data?.location_overrides?.find((o) => o.location_id === locationId);

/** Does this variation need an inventory count lookup? */
export function isTracked(v: SquareCatalogObject, locationId: string): boolean {
  const d = v.item_variation_data;
  if (!d) return false;
  return locationOverride(v, locationId)?.track_inventory ?? d.track_inventory ?? false;
}

export interface StockResult {
  price?: Money;
  availability: Availability;
  inventory?: Variant['inventory'];
}

export function resolveStock(
  v: SquareCatalogObject,
  locationId: string,
  counts: InventoryCounts,
  now: () => number = Date.now,
): StockResult {
  const d = v.item_variation_data;
  if (!d) return { availability: 'unavailable' };

  const override = locationOverride(v, locationId);
  const price = toMoney(override?.price_money) ?? toMoney(d.price_money);

  // No fixed price, or merchant says not sellable → cannot be ordered online by variation id.
  if (d.pricing_type === 'VARIABLE_PRICING' || !price || d.sellable === false) {
    return { price, availability: 'unavailable' };
  }

  const tracked = isTracked(v, locationId);

  // Merchant-set "sold out" (Square also sets this when tracked stock reaches zero).
  // Honour an expiry if Square provides one.
  const soldOutFlag =
    override?.sold_out === true &&
    (!override.sold_out_valid_until || Date.parse(override.sold_out_valid_until) > now());
  if (soldOutFlag) {
    return { price, availability: 'sold-out', inventory: tracked ? { tracked: true, quantity: 0 } : { tracked: false } };
  }

  if (tracked) {
    const quantity = Math.max(0, Math.floor(counts.get(v.id) ?? 0)); // tracked + no count = none on hand
    return {
      price,
      availability: quantity > 0 ? 'available' : 'sold-out',
      inventory: { tracked: true, quantity },
    };
  }

  return { price, availability: 'available', inventory: { tracked: false } };
}
