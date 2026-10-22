# Digital business card (`/card`)

A minimal, mobile-first contact page: logo, name, role, **Save contact**, Email (and Call / Text when a
phone number is added), the website link, and **Share card** / **Show QR code**. No app or account needed.

## Edit it in one place
`src/config/card.ts` drives everything — the page, the saved contact (`.vcf`), the link preview tags and
the QR code — so they cannot drift apart. Optional fields left `null` / empty render nothing.

| To… | Change |
|---|---|
| Add a phone | `phone: { number: '+1…', call: true, text: true }` (country code required; set `call`/`text` independently). Call/Text buttons and the saved TEL appear automatically. |
| Add a description | `description: '…'` |
| Add business links | `links: [{ label: 'Book a call', href: 'https://…' }]` (shown in order, after the website row) |
| Add social profiles | `social: [{ label: 'Instagram', href: 'https://…' }]` |
| Save extra details only in the contact | `vcardNote: '…'` |
| Change the domain | `publicUrl` (card) and `website` (business site) — **currently `https://lanoir.ca/card` and `https://lanoir.ca`** — plus the `CARD_PUBLIC_URL` variable below, and `SITE_URL` in Cloudflare. |

## Which URL does the card share?
**One permanent URL in every environment** — production, staging, previews and local — set by the
`CARD_PUBLIC_URL` variable (default `https://lanoir.ca/card`, also the value of `publicUrl` in
`src/config/card.ts`). It is used for:

| Where | Value |
|---|---|
| QR code destination (and the address printed under it) | `CARD_PUBLIC_URL` |
| Share button (native share and copy-link) | `CARD_PUBLIC_URL` |
| Saved contact — **Digital card** field | `CARD_PUBLIC_URL` |
| Canonical URL, `og:url` | `CARD_PUBLIC_URL` |
| `og:image` / `twitter:image` (absolute) | `CARD_PUBLIC_URL`'s origin + `/og-default.png` |
| Saved contact — **Website** field | `website` in the config (`https://lanoir.ca`) — independent |

It is **never derived from the current hostname or from `PUBLIC_ALLOW_INDEXING`** (which only controls whether
the site as a whole is indexable). So the staging page displays and works normally at its own address, but its
QR code, Share button and saved contact all point at `https://lanoir.ca/card`.

- **Where to set it:** it is a *runtime* variable. It is committed in `wrangler.jsonc` (`vars` for production,
  `previews.vars` for staging) and can also be set in Cloudflare → Variables and Secrets. If unset, the config
  default is used. Local: optionally in `.dev.vars`.
- **Bad values:** it must be an `https` URL (query, hash and trailing slash are dropped). Anything else is
  ignored, the default is used, and `[card] CARD_PUBLIC_URL is not a valid https URL…` is logged.
- `/card` is `noindex` and not in the sitemap. `/card/` redirects to `/card`.

## Files
`src/pages/card.astro` page · `src/pages/card/[file].vcf.ts` saved contact · `src/layouts/CardLayout.astro`
· `src/scripts/card.ts` (Share + QR overlay; everything else works without JavaScript) · `src/lib/card/*`
(contact methods, vCard 3.0 builder, URL rules, local QR via the `uqr` package) · `tests/card.test.ts`.

## Notes
- **QR codes** are generated locally on the server as inline SVG (black on white, error-correction M): no
  service, no expiry. The destination is always printed under the code.
- **NFC:** this webpage does not itself enable phone-to-phone NFC sharing. An NFC card or sticker can store
  the public card URL; tapping it opens this page.
- **Logo:** the full script logo on its own charcoal ground (Brand System: 320px wide).
- **Launch animation:** a one-time ≈2.7s sequence (CSS only, transform/opacity): the logo materialises, a thin
  spell-circle is traced around its ring, four-point stars and drifting glints twinkle in, and the name, role and
  buttons rise into place. It then clears and the clean logo is held. Buttons stay tappable throughout. With
  `prefers-reduced-motion: reduce` there is no sequence — the finished card shows immediately. To tune it, edit
  `sparks` / `dust` (positions, sizes, delays) and the `@keyframes` in `src/pages/card.astro`; to remove it,
  delete the `.magic` block and the `.rise` classes.
- **Saved contact:** served as `text/vcard`, named `Cindy-Pinard-LaNoir.vcf`. What happens after the file
  opens is up to the device; the page never claims the contact was saved.

## Release / device checks (not done in the automated pass)
- [ ] iPhone (Safari): tap **Save contact** → contact sheet appears; fields correct.
- [ ] Android (Chrome): **Save contact** downloads and opens in Contacts; fields correct.
- [ ] Share card opens the native share sheet on iOS and Android; copy fallback on desktop.
- [ ] Phone camera scans the QR code from another screen / print, and opens the right page.
- [ ] Link preview (title, description, image) in iMessage / WhatsApp / Facebook / LinkedIn — these services cache, so test with a fresh URL.
- [ ] NFC tag written with the public URL opens the card (device test).
- [ ] On production (`https://lanoir.ca/card`): confirm `SITE_URL=https://lanoir.ca` is set for the build (and `CARD_PUBLIC_URL`, if you override the default), then re-check the above. `PUBLIC_ALLOW_INDEXING` is unrelated to the card.
- [ ] On the staging card: QR, Share and Save contact must all still point at `https://lanoir.ca/card`.
