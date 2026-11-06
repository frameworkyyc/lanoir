/**
 * Copy and links for the landing page (/), where visitors choose a side. One source for the page,
 * its metadata and the tests. The two sides share one brand: same palette, type and motifs.
 */
export interface Door {
  key: 'shop' | 'divination';
  href: string;
  label: string;
  description: string;
  /** Small action label shown with the arrow. */
  cta: string;
}

export const landing = {
  eyebrow: 'LaNoir / Bad Ass Witchery',
  title: 'LaNoir | Bad Ass Witchery — The Shop & Divination',
  doors: [
    {
      key: 'shop',
      href: '/store',
      label: 'The Shop',
      description: 'Handcrafted collections for the bold, curious and unapologetic.',
      cta: 'Enter the shop',
    },
    {
      key: 'divination',
      href: '/divination',
      label: 'Divination',
      description: 'Intuitive readings for clarity, reflection and guidance.',
      cta: 'Enter divination',
    },
  ] satisfies Door[],
};

/** The page description is exactly the two door descriptions, so metadata and page cannot drift apart. */
export const landingDescription = landing.doors.map((d) => d.description).join(' ');
