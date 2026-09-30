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
  const amounts = product.variants.map((v) => v.price.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const money = { amount: min, currency: product.variants[0].price.currency };
  return min === max ? formatMoney(money) : `From ${formatMoney(money)}`;
}

/** True when at least one variant can be bought. */
export const isAvailable = (product: Product) => product.variants.some((v) => v.available);
