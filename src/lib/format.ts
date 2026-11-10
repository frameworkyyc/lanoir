import type { Money, Product } from './commerce/types';

export function formatMoney({ amount, currency }: Money, locale = 'en-CA'): string {
  const hasCents = amount % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

/** "$34" for a single price, "From $34" when variants differ. */
export function priceLabel(product: Product): string {
  // Variants whose price could not be read carry amount 0: never advertise those as "$0".
  const priced = product.variants.filter((v) => v.price.amount > 0);
  const amounts = (priced.length ? priced : product.variants).map((v) => v.price.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const money = { amount: min, currency: product.variants[0].price.currency };
  return min === max ? formatMoney(money) : `From ${formatMoney(money)}`;
}

/** True when at least one variant can be bought. */
export const isAvailable = (product: Product) => product.variants.some((v) => v.available);

/**
 * What a product card says under the name. A product is only "Sold out" when every variant that cannot be bought is
 * genuinely sold out; a missing price or image never reads as sold out (that is "Unavailable").
 */
export function cardStatus(product: Product): { text: string; state: 'available' | 'sold-out' | 'unavailable' } {
  if (isAvailable(product)) return { text: priceLabel(product), state: 'available' };
  const soldOut = product.variants.length > 0 && product.variants.every((v) => v.availability === 'sold-out');
  return soldOut ? { text: 'Sold out', state: 'sold-out' } : { text: 'Currently unavailable', state: 'unavailable' };
}
