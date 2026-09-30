/** JSON-LD builders. Only emit facts we actually have — no invented ratings, socials or offers. */
import type { Collection, Product } from '~/lib/commerce/types';
import { siteConfig } from '~/config/site';

const abs = (path: string, site: URL | undefined) => new URL(path, site ?? 'https://lanoir.example.com').href;

export const organization = (site?: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: `${siteConfig.name} — ${siteConfig.descriptor}`,
  url: abs('/', site),
  logo: abs('/og-default.png', site), // TODO: swap for the transparent/vector logo master
  ...(siteConfig.social.length ? { sameAs: siteConfig.social.map((s) => s.href) } : {}),
});

export const website = (site?: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: abs('/', site),
});

export const breadcrumbs = (items: { name: string; path: string }[], site?: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path, site) })),
});

export const collectionPage = (c: Collection, path: string, site?: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: c.name,
  description: c.description,
  url: abs(path, site),
});

export const productLd = (p: Product, path: string, site?: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: p.name,
  url: abs(path, site),
  ...(p.description ? { description: p.description } : {}),
  offers: p.variants.map((v) => ({
    '@type': 'Offer',
    price: (v.price.amount / 100).toFixed(2),
    priceCurrency: v.price.currency,
    availability: v.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: abs(path, site),
  })),
});
