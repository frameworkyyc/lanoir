# LaNoir — Bad Ass Witchery

Custom storefront. **Astro + TypeScript + plain CSS.** Static output, deployed on Cloudflare.
Source of truth for design/voice: the *LaNoir Brand System* (Framework, Sept 2026, v1.1).

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # git-ignored. COMMERCE_PROVIDER=mock needs no credentials
npm run dev                      # http://localhost:4321
npm run check                    # type-check (.astro + .ts)
npm test                         # unit tests (Square mapping, inventory, cart, checkout, config)
npm run build                    # → dist/ (static client + Worker)
npm run preview                  # run the built Worker locally
```

Node 22+. Commerce runs on **Square** (Sandbox on staging, Production on main) — see
[`docs/SQUARE.md`](docs/SQUARE.md) for architecture, the exact Cloudflare variables/secrets, and the
Sandbox testing checklist. Secrets live in Cloudflare / your local `.dev.vars`, never in git.

## Branches & deploy

`staging` (development, Cloudflare Worker Preview, **Square Sandbox**) → `main` (production, **live Square**).

Astro runs in hybrid mode on a Cloudflare Worker (`@astrojs/cloudflare`): static pages are prerendered,
catalogue pages and `/api/*` run on the Worker. `main` and the Worker/assets config are generated at
build time; `wrangler.jsonc` holds only the name, `keep_vars`, and the sandbox-only `previews` block.

| Branch | Cloudflare build | Deploy command |
|---|---|---|
| `main` (production) | `npm run build` | `npx wrangler deploy` |
| `staging` (preview) | `npm run build` | `npx wrangler preview` |

- `previews` in `wrangler.jsonc` is required by `wrangler preview` and holds **only** Sandbox values. Never put
  anything there that should reach production, and never put secrets in `wrangler.jsonc`.
- Worker name `lanoir` (confirmed) must stay in sync with the Worker in the Cloudflare dashboard.

### Cloudflare staging setup

- Worker: `lanoir` (config in `wrangler.jsonc`; the Worker and assets config are generated into `dist/` at build).
- Pushes to `staging` build with `npm run build` and deploy a Worker Preview via `npx wrangler preview`.
- Staging build settings: build command `npm run build`, deploy command `npx wrangler preview`, Node 22. Wrangler is a local dev dependency (no per-build install).
- Staging deploys come only from the `staging` branch; `main` is not touched by staging builds.
- Staging is served `noindex` (leave `PUBLIC_ALLOW_INDEXING` unset there). `main` remains the production branch.

## Structure

```
src/
  config/        site.ts (nav, announcement flag, TODO business info), logo.ts (logo asset + crop)
  styles/        tokens.css → fonts → base → typography → utilities → motion
  lib/commerce/  types.ts (provider-neutral), cart.ts (validation), square/ (Square adapter), mock/ (local design only)
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
- **Logo:** always `<Logo />`. Swap assets in `config/logo.ts` only.
  `variant="full"` (master artwork, ≥320px: footer, large placements) vs `variant="icon"` (LN monogram:
  header, mobile menu, favicon). The icon is an opaque PNG on black, so it is only for dark surfaces
  (shown with `mix-blend-mode: screen`; no `backdrop-filter` on its ancestors). Never combine both in one lockup.
- **Replacing a placeholder with a photo:** give the media `src` (imported image or remote URL); no layout change.
- **Announcement bar:** `siteConfig.announcement.enabled` in `config/site.ts`.
- Breakpoints (mobile-first): 40rem / 48rem / 64rem / 80rem. Desktop nav starts at 64rem.
