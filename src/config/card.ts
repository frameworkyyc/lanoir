/**
 * THE ONE PLACE to edit the digital business card (/card).
 * Everything rendered on the page, the saved contact (.vcf), the link preview and the QR code
 * is derived from this object, so they cannot drift apart.
 *
 * Optional things are `null` / empty: nothing is rendered and nothing is invented.
 */

export interface CardLink { label: string; href: string }

export interface CardConfig {
  givenName: string;
  familyName: string;
  /** Job title as displayed and saved. */
  role: string;
  /** Business name exactly as it should appear (also saved as the contact's company). */
  business: string;
  /** null = no phone → no Call / Text buttons and no TEL in the saved contact. */
  phone: { number: string; call: boolean; text: boolean } | null;
  email: string | null;
  /** The business website (also saved to the contact). */
  website: string | null;
  /**
   * Permanent PUBLIC address of this card. Production always shares this (QR code, Share, saved
   * contact). Staging/local use their own address so testing never points at production.
   * TODO(release): TEMPORARY domain — replace with the final domain when it goes live.
   */
  productionUrl: string;
  /** Short description under the name. null = none shown. */
  description: string | null;
  /** Optional business links, shown as text rows in this order (after the website row). */
  links: CardLink[];
  /** Optional social profiles, shown understated, in this order. */
  social: CardLink[];
  /** Base name of the downloaded contact file (no extension). */
  fileBase: string;
  /** Link-preview image, a path under /public (1200×630). */
  previewImage: string;
  previewImageAlt: string;
  /** Extra text saved ONLY in the contact file (not shown on the page). null = none. */
  vcardNote: string | null;
}

export const card: CardConfig = {
  givenName: 'Cindy',
  familyName: 'Pinard',
  role: 'Owner',
  business: 'LaNoir | Bad Ass Witchery',
  phone: null,
  email: 'lanoirbadasswitchery@gmail.com',
  website: 'https://lanoir.frameworkco.ca',
  productionUrl: 'https://lanoir.frameworkco.ca/card',
  description: null,
  links: [],
  social: [],
  fileBase: 'Cindy-Pinard-LaNoir',
  previewImage: '/og-default.png',
  previewImageAlt: 'LaNoir | Bad Ass Witchery',
  vcardNote: null,
};

export const fullName = (c: CardConfig = card) => `${c.givenName} ${c.familyName}`.trim();
