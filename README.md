# LaNoir — Bad Ass Witchery

Custom storefront. **Astro + TypeScript + plain CSS.** Static output, deployed on Cloudflare.
Source of truth for design/voice: the *LaNoir Brand System* (Framework, Sept 2026, v1.1).

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run check      # type-check (.astro + .ts)
npm run build      # static build → dist/
npm run preview    # serve dist/ locally
```

Node 22+. Copy `.env.example` to `.env` if you need to override anything (optional locally).

## Branches & deploy

`staging` (development, Cloudflare preview) → `main` (production).

Cloudflare build settings: build command `npm run build`, output directory `dist`, Node 22.
Environment variables:

| Variable | Staging | Production |
|---|---|---|
| `SITE_URL` | staging URL | real domain |
| `PUBLIC_ALLOW_INDEXING` | *unset* (site is `noindex`, robots disallows all) | `true` |
| `PUBLIC_COMMERCE_PROVIDER` | `mock` | `mock` until the Square adapter ships |

## Structure

```
src/
  config/        site.ts (nav, announcement flag, TODO business info), logo.ts (logo asset + crop)
  styles/        tokens.css → fonts → base → typography → utilities → motion
  lib/commerce/  types.ts (provider-neutral), index.ts (provider switch), mock/, square/ (planned)
  components/
    brand/       Logo, Moon, Arc, Eyebrow, Rule, SpectrumRule
    media/       Picture (responsive), Placeholder (temporary art)
    commerce/    ProductCard, ProductGrid, ListingPage
    layout/      AnnouncementBar, Header, MobileNav, Footer
    sections/    homepage sections
  layouts/       BaseLayout
  seo/           Seo.astro, jsonld.ts
  pages/         routes
```

## Conventions

- **UI never imports a commerce platform.** Only `~/lib/commerce` types/provider.
- **Temporary content is flagged in source:** `MOCK DATA` banner in `lib/commerce/mock/data.ts`,
  `PLACEHOLDER:` comments + `data-placeholder` attributes on image placeholders, `TODO(client)` for
  missing business information. Nothing developer-facing is shown to visitors.
- **Logo:** always `<Logo />`. Swap the asset in `config/logo.ts` only.
- **Replacing a placeholder with a photo:** give the media `src` (imported image or remote URL); no layout change.
- **Announcement bar:** `siteConfig.announcement.enabled` in `config/site.ts`.
- Breakpoints (mobile-first): 40rem / 48rem / 64rem / 80rem. Desktop nav starts at 64rem.
