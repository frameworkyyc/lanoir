# Shop visual identity ("The Threshold" for commerce)

The shop shares the landing / Spiritual Services language (Noir, pink, plum, moonlit charcoal; celestial line art; curved
chapters; mist, stars and grain) but stays commerce-first. **No Square, product, inventory, cart or checkout code was
changed.** Only presentation.

## Where things live
- `src/components/layout/ShopWorld.astro` – rendered only in the shop frame (`chrome="shop"`). Global styles for:
  the night sky (`.shop-sky`), chapters (`.chapter`, `--plum|charcoal|smoke|night|deep`), header / announcement / footer
  atmosphere, product-card edge light, product-page and cart backdrops, and a 0.14–0.2 s cross-page fade
  (`@view-transition`, off with reduced motion, ignored by browsers without support).
- `src/components/commerce/ListingPage.astro` – collection / Shop All / category hero: per-collection colour and line art,
  curved bottom edge. `src/pages/store.astro` – the homepage sections are wrapped in chapters.
- `src/layouts/BaseLayout.astro` – adds `class="chrome-shop"` to `<body>` and renders `ShopWorld` for the shop only.

## Performance rules (measured against the pre-redesign build)
- Everything decorative is **static or compositor-only**: no canvas, video, library or JS animation.
- The sky, the header/footer atmosphere and the listing-hero art are switched on by a one-line inline script after
  `load` (`html.sky-on`), so they can never delay first paint or products. Without JavaScript the shop is plain Noir with
  the same layout (chapters and hero colours are structural and always on).
- Hero text is never faded in from transparent (that delayed LCP); it only slides a few pixels.
- Product images, names, prices, variants and buttons are never overlaid; decoration sits in gaps and behind content.
- Reduced motion: no animation at all. Low-power devices: nothing continuous runs on product grids.
