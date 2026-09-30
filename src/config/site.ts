/**
 * Site-wide configuration. Anything the client hasn't supplied is `null` or an
 * empty list with a TODO — components render nothing (or a neutral fallback)
 * rather than inventing information.
 */

export const siteConfig = {
  name: 'LaNoir',
  descriptor: 'Bad Ass Witchery',
  tagline: 'Wear your power. Not their expectations.',
  description:
    'LaNoir is an attitude-based brand with dark feminine energy and an inclusive, rebellious edge. Shop the signature collections: Pretty Poison, After Dark and Mystic Minis.',
  locale: 'en_CA', // TODO(client): confirm locale

  /** Announcement / utility bar. Set `enabled: false` to remove it everywhere. */
  announcement: {
    enabled: true,
    // Brand line only — no offers, shipping or launch claims until supplied.
    text: 'Collections first. Attitude always.',
    href: '/collections' as string | null,
  },

  /** TODO(client): confirmed social handles/URLs. Empty = no social links rendered. */
  social: [] as { label: string; href: string }[],

  /** TODO(client): contact email / form endpoint. */
  contact: { email: null as string | null },

  /** TODO(client): newsletter provider endpoint. `null` = form shows a polite "opening soon" message. */
  newsletter: { action: null as string | null },
};

export interface NavItem {
  label: string;
  href: string;
  index?: string;
  note?: string;
  children?: NavItem[];
}

export const primaryNav: NavItem[] = [
  { label: 'Shop All', href: '/shop' },
  {
    label: 'Collections',
    href: '/collections',
    children: [
      { label: 'Pretty Poison', href: '/collections/pretty-poison', index: '01', note: 'Signature' },
      { label: 'After Dark', href: '/collections/after-dark', index: '02', note: 'Dark. Seductive. Powerful.' },
      { label: 'Mystic Minis', href: '/collections/mystic-minis', index: '03', note: 'Smaller treasures' },
    ],
  },
  { label: 'Pride Exclusive', href: '/collections/pride-exclusive' },
  { label: 'Statement Wear', href: '/statement-wear' },
  { label: 'Accessories / Jewelry', href: '/accessories' },
  { label: 'About LaNoir', href: '/about' },
];

export const footerPolicies: NavItem[] = [
  { label: 'Shipping', href: '/policies/shipping' },
  { label: 'Returns', href: '/policies/returns' },
  { label: 'Privacy', href: '/policies/privacy' },
  { label: 'Terms', href: '/policies/terms' },
];
