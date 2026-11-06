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
