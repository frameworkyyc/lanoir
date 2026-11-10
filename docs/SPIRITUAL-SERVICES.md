# /spiritual-services (formerly /divination)

The world entered through the Spiritual Services door on the landing ("The Threshold"): the same night sky, eclipse and
moonlight, but calmer and built for reading. Static page; no Square, no cart code, works without JavaScript.

## Art direction: chapters
The hero (black sky, eclipse, dowsing pendulum) is the anchor. Everything below is a separate world, joined by curved
"dome" transitions that carry an edge of light:

| Chapter | Background | Artwork |
|---|---|---|
| Hero | black sky (shared with the landing) | eclipse, pendulum, orbit rings |
| Meet Cindy | deep plum to black | Lenormand card + dowsing pendulum + scribed line; one pull quote |
| Training & Certifications | night sky with stars | a constellation timeline: seven star nodes joined by a gently winding line that draws itself on scroll; the final credential is a hollow, dashed star badged "In Progress" |
| Services | charcoal stage; two feature panels | Lenormand: pink/plum, fanned cards, pendulum arc, 3 months / 6–9 months timeline. Mediumship: moonlit, veil layers, looping scribed lines. Text/art sides alternate |
| A Practice Rooted in Respect | brighter smoky plum, full width | celestial symbol, oversized quotation marks and closing statement |
| Ethics & Sacred Practice | moonlit charcoal | five principle panels in an offset grid, each with a line symbol; alternating glass / pink edge-light surfaces |
| Closing | smoky pink-black with stars | the eclipse with a strong pink bloom; Enquire is primary, Visit the shop secondary |

Backgrounds use tints of the brand palette only (pink, gunmetal, warm-white over Noir). "Cooler" moonlight is gunmetal and
warm-white, not a new hue.

## Where things live
- `src/config/spiritual-services.ts` – **every word on the page** plus the page title and description, the pull quote (lifted
  verbatim from the last biography paragraph) and the two decorative timeline labels (from the Lenormand copy).
  `tests/spiritual-services.test.ts` guards the confirmed wording and fails if prices, durations, booking claims, credentials or
  placeholders appear.
- `src/pages/spiritual-services.astro` – layout, artwork and CSS. Zone colours are the `--zone-top` / `--zone-bot` variables.
- Shared with the landing and unchanged: `components/landing/Sky.astro` and `Eclipse.astro`.

## Training & Certifications
Exactly the seven supplied credentials, in order, in `training` in the config (`credentialText()` rebuilds each exact string).
They are credentials, **not services**: the only confirmed services remain Lenormand Readings and Mediumship & Spirit Scribing.
The last credential is labelled "In Progress". No providers (beyond Tony Savory where supplied), dates, licences, years of
experience, memberships or accreditations are added; tests fail if any appear.

## Behaviour
- Scroll reveals use the site's `data-reveal` (gated by `.js`, so everything is visible without JavaScript).
- Parallax is CSS scroll-driven animation (`animation-timeline: view()`) on the artwork layers: no JavaScript, and it simply
  doesn't run in browsers that lack it. Ambient loops (pendulum, veils, scribed lines, moon glow) are slow.
  `prefers-reduced-motion` removes all of it (0 running animations; every line fully drawn).
- Enquire: a plain `mailto:` link using `card.email` from `src/config/card.ts`. Hidden automatically if that is `null`.
- Metadata: title "Spiritual Services by LaNoir | Love Beyond the Veil"; description is the confirmed intro only; canonical
  `/spiritual-services`; breadcrumb JSON-LD only. `/spiritual-services` is in the generated `sitemap-0.xml`; `/divination` is a permanent (301) redirect (`redirects` in `astro.config.mjs`, emitted as `dist/client/_redirects`) and is not in the sitemap.

## Deliberately omitted (not supplied)
Prices, durations, locations, a booking method or button, qualifications/credentials/years of experience, a portrait or
photos, testimonials, and any medical/legal disclaimer beyond the "Professional Boundaries" principles supplied.
