# /divination

The world entered through the Divination door on the landing ("The Threshold"): the same night sky, eclipse and
moonlight, but calmer and built for reading. Static page; no Square, no cart code, works without JavaScript.

## Where things live
- `src/config/divination.ts` – **every word on the page** (hero, Meet Cindy, services, approach, ethics, closing)
  plus the page title and description. Edit copy here; `tests/divination.test.ts` guards the confirmed wording and
  fails if prices, durations, booking claims, credentials or placeholders appear.
- `src/pages/divination.astro` – layout, motifs (eclipse + dowsing pendulum, Lenormand card, scribing line) and CSS.
- Shared with the landing and unchanged: `components/landing/Sky.astro` and `Eclipse.astro`. This page dims the stars,
  hides the light beam, meteor and glints, and makes `body` transparent so the fixed sky shows through.

## Behaviour
- Scroll reveals use the site's existing `data-reveal` (gated by `.js`, so everything is visible without JavaScript).
- Motion is restrained: a slow pendulum sway, a slow orbit, a drifting sky and a scribing line that writes itself once.
  `prefers-reduced-motion` removes all of it (0 running animations).
- Enquire: a plain `mailto:` link using `card.email` from `src/config/card.ts` (the public email already on the digital
  card). It is hidden automatically if that value is ever set to `null`.
- Metadata: title "Divination by LaNoir | Love Beyond the Veil"; description is the confirmed intro sentence only;
  canonical `/divination`; breadcrumb JSON-LD only (no `Service`/`Person`/`Offer` schema until facts are confirmed).
  `/divination` is in the generated `sitemap-0.xml`.

## Deliberately omitted (not supplied)
Prices, durations, locations, a booking method or button, qualifications/credentials/years of experience, a portrait or
photos, testimonials, and any medical/legal disclaimer beyond the "Professional Boundaries" principles supplied.
