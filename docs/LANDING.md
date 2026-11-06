# Landing page and the two sides of LaNoir

| Route | What |
|---|---|
| `/` | **Landing** — two doors: **The Shop** → `/store`, **Divination** → `/divination`. Everyone sees it. Static; no shop header, cart or announcement bar. |
| `/store` | The shop's front page (the former homepage, unchanged). Live Square data. |
| `/shop` | Shop All catalogue (unchanged). Collections, products, cart, `/card` are unchanged too. |
| `/divination` | Divination — **a minimal shell**, see below. |

## Edit it
- Landing copy, door labels, links: `src/config/landing.ts` (one source for the page, its metadata and `tests/landing.test.ts`).
- Shop navigation (desktop + mobile): `primaryNav` in `src/config/site.ts` (`accent: true` makes an item pink).
- Frames: `BaseLayout` takes `chrome="shop" | "divination" | "bare"` (landing uses `bare`; divination uses a slim header/footer with no cart).

## How the two sides stay one brand
Same palette, Bebas/Cinzel/Inter, hairlines, sharp corners and celestial motifs. The shop door carries the pink ring and
dot; the divination door the moon and stars on the deeper Noir already used by After Dark; one shared moon sits where
the two doors meet. The divination header is the shop header's twin (LN monogram, label type, pink accent).

## Divination — still needed from the business (nothing below is invented on the page)
Today `/divination` shows only the supplied line: *"Intuitive readings for clarity, reflection and guidance."* plus
"Details are being finalised." To complete it, supply:
1. Services offered, with a short description of each
2. Prices and durations (or "enquire")
3. How to book or enquire (external booking link, email, phone/text, form)
4. Format: in person / online, location
5. Who gives the readings, bio and photo
6. Any disclaimer or policy wording (used verbatim)
7. Photos/video

No structured data (`Service` schema) is emitted for divination until the facts above are confirmed.

## Art direction: "The Threshold"

The landing (`/`) is one night sky split by a single eclipse. The two sides share the sky, stars, mist,
grain, type and eclipse, so they read as one brand; each gets its own energy.

| | The Shop | Divination |
|---|---|---|
| Light | pink, warm | warm-white moonlight |
| Motion | embers rise, a fire-glyph sigil turns | motes drift, an orbit star circles, a constellation draws in |
| Opens from | the right / lower edge toward the eclipse | the left / upper edge toward the eclipse |

**Sequence (≈2.8 s first visit, ≈1.1 s on repeat visits in a session):** sky fades up → eclipse ignites →
monogram emerges with a light bloom and sheen → eyebrow wipes in → each world is unveiled by a clip with a
leading edge of light → letters rise → description, call to action.

**Interactions:** hover / keyboard focus / touch press "opens" a door (light spills from the seam, a spotlight
follows the pointer or finger, the arrow lengthens, the call to action turns white for contrast). Choosing a
door blooms its light from where you tapped, fades to Noir, then navigates (~0.75 s).

### Where things live
- `src/pages/index.astro` – markup, door artwork, all landing CSS and the timeline (`--k` scales every timing).
- `src/components/landing/Sky.astro` – stars, glints, mist, beam, meteor. `Eclipse.astro` – the eclipse.
- `src/lib/landing-fx.ts` – seeded generators for stars / embers / motes (deterministic builds).
- `src/scripts/landing.ts` – parallax, door open state, exit transition, frame-rate probe (~2 kB).

### Performance and accessibility rules
- Animate `transform` / `opacity` only; no video, canvas, library or sound. Landing ships no cart code.
- **Lite mode** (`data-fx="lite"`) turns on automatically for `deviceMemory ≤ 2`, Save-Data, or when the
  frame probe sees a struggling device (75th-percentile frame > 30 ms during the entrance or once ambient
  motion runs). It drops parallax, mist/stars drift, the sheen, the meteor and glints, the grain animation
  and most particles; the composition stays.
- **Reduced motion:** the finished composition renders immediately; no animation, parallax or exit transition.
- Pink text never sits on strong pink light (≥ 4.5:1 measured against the rendered glow, idle and open);
  decoration shrinks and fades on short phones so it never crosses the type.
- To retune the mood: palette values come from `tokens.css`; glow strengths are the `color-mix(...)` percentages
  in the door CSS and `Sky.astro`.
