/**
 * Editorial collection definitions — the brand's words, not the catalogue's.
 *
 * Product MEMBERSHIP comes from Square categories whose name matches `name`
 * case-insensitively. Square remains the source of truth for products; this file only
 * supplies the page copy and ordering Square cannot hold. We never create or rename
 * Square categories.
 *
 * TODO(client): approve collection copy and supply collection photography (`image`).
 */
import type { Collection } from '../lib/commerce/types.ts';

/** Square category whose products appear in the homepage "Start here" section. */
export const FEATURED_CATEGORY = 'Featured';

export const collections: Collection[] = [
  {
    slug: 'pretty-poison',
    name: 'Pretty Poison',
    kind: 'signature',
    order: 1,
    tagline: 'Bold. Dangerous. Playful.',
    description: 'The signature LaNoir collection. Unmistakably ours.',
    image: { alt: 'Pretty Poison collection' },
  },
  {
    slug: 'after-dark',
    name: 'After Dark',
    kind: 'signature',
    order: 2,
    tagline: 'Dark. Seductive. Confident. Powerful.',
    description: 'Sophisticated darkness, worn with control.',
    image: { alt: 'After Dark collection' },
  },
  {
    slug: 'mystic-minis',
    name: 'Mystic Minis',
    kind: 'signature',
    order: 3,
    tagline: 'Smaller treasures. Gifts. Accessible pieces.',
    description: 'Distinctive pieces at a more approachable scale.',
    image: { alt: 'Mystic Minis collection' },
  },
  {
    slug: 'pride-exclusive',
    name: 'Pride Exclusive',
    kind: 'exclusive',
    order: 1,
    tagline: 'LaNoir first. Pride energy.',
    description: 'Pride skull sets, shirts and themed accessories. Empowering, inclusive, unmistakably LaNoir.',
    image: { alt: 'Pride Exclusive collection' },
  },
  {
    slug: 'statement-wear',
    name: 'Statement Wear',
    kind: 'category',
    order: 1,
    tagline: 'Bold enough to stand out. Clean enough to wear.',
    description: 'Typography-first apparel. One strong idea per piece.',
    image: { alt: 'Statement Wear' },
  },
  {
    slug: 'accessories',
    name: 'Accessories / Jewelry',
    kind: 'category',
    order: 2,
    tagline: 'Supporting pieces, worn with intent.',
    description: 'Jewelry and supporting accessories.',
    image: { alt: 'Accessories and jewelry' },
  },
];
