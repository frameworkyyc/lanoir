/* ============================================================================
 * !!!  MOCK DATA — PHASE 1 ONLY  !!!
 * ----------------------------------------------------------------------------
 * Every product, price, name and image slot in this file is a TEMPORARY
 * PLACEHOLDER so the storefront can be designed and reviewed. NONE of it is
 * real LaNoir catalogue data. It is replaced wholesale when the Square adapter
 * is connected (see ./README.md and ../square/README.md).
 *
 * What IS real (from the Brand System):
 *   - collection names + the three signature collection personalities
 *   - the "NOT STRAIGHT / NOT SORRY" Pride shirt name
 *   - the core apparel statements (I DON'T CHASE / I CONJURE, UNAPOLOGETIC /
 *     UNBOTHERED, NOT FOR EVERYONE)
 *
 * What is NOT real:
 *   - every price, every variant, every product other than the above,
 *     product types beyond those the Brand System mentions, all images.
 *
 * TODO(client): supply real names, prices, variants, materials and photography.
 * ========================================================================== */

import type { Media, OptionGroup, Product } from '../types.ts';

/** TODO(client): confirm currency. CAD assumed for the prototype only. */
const CURRENCY = 'CAD';

/** MOCK: no photography supplied yet. `src` is intentionally omitted so the
 *  neutral visual placeholder renders. Replace with imported images or CDN URLs. */
const photo = (alt: string, focal?: string): Media => ({ alt, focal });

const variant = (id: string, price: number, options: Record<string, string> = {}, title = 'Default') => ({
  id,
  title,
  price: { amount: price, currency: CURRENCY },
  availability: 'available' as const,
  available: true,
  options,
});

const SIZES = ['S', 'M', 'L', 'XL'];
const sized = (id: string, price: number) =>
  SIZES.map((s) => variant(`${id}-${s.toLowerCase()}`, price, { Size: s }, s));

/* ---- Collections: see src/config/collections.ts (shared with the Square provider) ---- */
export { collections } from '../../../config/collections.ts';

/* ---- Products (ALL MOCK) ---------------------------------------------------- */

type RawProduct = Omit<Product, 'optionGroups'>;

const rawProducts: RawProduct[] = [
  // ---- Pretty Poison
  {
    id: 'mock-pp-box',
    slug: 'pretty-poison-box-set',
    name: 'Pretty Poison Box Set',
    collections: ['pretty-poison'],
    images: [photo('Pretty Poison Box Set (mock)', '50% 40%'), photo('Pretty Poison Box Set detail (mock)')],
    variants: [variant('mock-pp-box-1', 6500)],
    featured: true,
  },
  {
    id: 'mock-pp-skull',
    slug: 'pretty-poison-skull-set',
    name: 'Pretty Poison Skull Set',
    collections: ['pretty-poison'],
    images: [photo('Pretty Poison Skull Set (mock)')],
    variants: [variant('mock-pp-skull-1', 4800)],
  },
  // ---- After Dark
  {
    id: 'mock-ad-box',
    slug: 'after-dark-box-set',
    name: 'After Dark Box Set',
    collections: ['after-dark'],
    images: [photo('After Dark Box Set (mock)', '50% 35%'), photo('After Dark Box Set detail (mock)')],
    variants: [variant('mock-ad-box-1', 7200)],
    featured: true,
  },
  {
    id: 'mock-ad-candle',
    slug: 'after-dark-skull-candle',
    name: 'After Dark Skull Candle',
    collections: ['after-dark'],
    images: [photo('After Dark Skull Candle (mock)')],
    variants: [variant('mock-ad-candle-1', 3800)],
  },
  // ---- Mystic Minis
  {
    id: 'mock-mm-set',
    slug: 'mystic-minis-gift-set',
    name: 'Mystic Minis Gift Set',
    collections: ['mystic-minis'],
    images: [photo('Mystic Minis Gift Set (mock)')],
    variants: [variant('mock-mm-set-1', 2800)],
    featured: true,
  },
  {
    id: 'mock-mm-earrings',
    slug: 'astrology-earrings',
    name: 'Astrology Earrings',
    collections: ['mystic-minis', 'accessories'],
    images: [photo('Astrology Earrings (mock)')],
    variants: [variant('mock-mm-earrings-1', 1800)],
  },
  {
    id: 'mock-mm-charm',
    slug: 'mini-skull-charm',
    name: 'Mini Skull Charm',
    collections: ['mystic-minis', 'accessories'],
    images: [photo('Mini Skull Charm (mock)')],
    variants: [variant('mock-mm-charm-1', 1400)],
  },
  {
    id: 'mock-mm-studs',
    slug: 'moon-studs',
    name: 'Moon Studs',
    collections: ['mystic-minis', 'accessories'],
    images: [photo('Moon Studs (mock)')],
    variants: [variant('mock-mm-studs-1', 1600)],
  },
  // ---- Statement Wear (statements come from the Brand System)
  {
    id: 'mock-tee-conjure',
    slug: 'i-dont-chase-i-conjure-tee',
    name: "I Don't Chase, I Conjure Tee",
    collections: ['statement-wear'],
    images: [photo("I Don't Chase, I Conjure Tee (mock)", '50% 30%')],
    variants: sized('mock-tee-conjure', 3400),
    featured: true,
  },
  {
    id: 'mock-tee-unbothered',
    slug: 'unapologetic-unbothered-tee',
    name: 'Unapologetic Unbothered Tee',
    collections: ['statement-wear'],
    images: [photo('Unapologetic Unbothered Tee (mock)', '50% 30%')],
    variants: sized('mock-tee-unbothered', 3400),
  },
  {
    id: 'mock-tee-everyone',
    slug: 'not-for-everyone-tee',
    name: 'Not For Everyone Tee',
    collections: ['statement-wear'],
    images: [photo('Not For Everyone Tee (mock)', '50% 30%')],
    variants: sized('mock-tee-everyone', 3400),
  },
  // ---- Pride Exclusive
  {
    id: 'mock-pride-tee',
    slug: 'not-straight-not-sorry-tee',
    name: 'Not Straight / Not Sorry Tee',
    collections: ['pride-exclusive', 'statement-wear'],
    images: [photo('Not Straight / Not Sorry Tee (mock)', '50% 30%')],
    variants: sized('mock-pride-tee', 3400),
    featured: true,
  },
  {
    id: 'mock-pride-skull',
    slug: 'pride-skull-set',
    name: 'Pride Skull Set',
    collections: ['pride-exclusive'],
    images: [photo('Pride Skull Set (mock)')],
    variants: [variant('mock-pride-skull-1', 4800)],
  },
];

/** Derive option groups (Size…) from variant options, like the Square mapper does. */
const groupsOf = (p: RawProduct): OptionGroup[] => {
  const map = new Map<string, string[]>();
  for (const v of p.variants) for (const [k, val] of Object.entries(v.options)) {
    const list = map.get(k) ?? [];
    if (!list.includes(val)) list.push(val);
    map.set(k, list);
  }
  return [...map].map(([name, values]) => ({ name, values: values.map((value) => ({ value })) }));
};

export const products: Product[] = rawProducts.map((p) => ({ ...p, optionGroups: groupsOf(p) }));
