# Square integration — setup, operation and testing

Square is the source of truth for **products, prices, variations, images and inventory**. The
website never calls Square from the browser: a Cloudflare Worker (this Astro app) does it with a
secret access token. Checkout and payment happen on **Square-hosted checkout**.

```
Browser ──► Astro on a Cloudflare Worker ──► Square (Sandbox or Production)
            ├─ catalogue pages (server-rendered, cached ~30s)
            ├─ POST /api/cart/quote      prices + validates cart lines (ids & quantities only)
            └─ POST /api/checkout        re-validates with FRESH data, creates the Square checkout
```

## How it behaves

| Topic | Behaviour |
|---|---|
| Products | Square **items**. Archived, deleted, non-REGULAR (e.g. gift cards) and items not present at the configured location are hidden. |
| Variations | Square **item variations**. Size/Colour come from Square **Item Options** (colour swatches use the option value's colour). Several variations with no Item Options appear as one "Option" choice. Products with one variation show no picker. |
| Collections | Square **category names** (case-insensitive): `Pretty Poison`, `After Dark`, `Mystic Minis`, `Pride Exclusive`, `Statement Wear`, `Accessories / Jewelry`. Copy/order is editorial (`src/config/collections.ts`). The website never creates or renames Square categories. |
| Homepage products | Items in the Square category **`Featured`** ("Start here"). Empty → the section is hidden (never auto-filled). |
| Inventory | Tracked variation: units `IN_STOCK` at the location; none recorded = sold out. Untracked = always available. Merchant "sold out" at the location wins (respecting its expiry). |
| Sold out | Shown on cards, product page (button disabled) and in the cart (checkout blocked). |
| Missing images | Neutral placeholder. Square images are served directly from Square's CDN, unresized (`src/lib/images.ts` is the single place to add transformations later). |
| Not purchasable | Variable-priced or non-sellable variations show "Unavailable". |
| Cart | Browser `localStorage`: variation id + quantity only. Per-line cap: 10 (`CART_LIMITS`, **placeholder — confirm**). |
| Checkout | Payment Links API. Line items are **catalog variation IDs** (so Square prices the order and decrements inventory). No prices are ever sent. Taxes = Square account taxes (`auto_apply_taxes`). Shipping address collected on Square. |
| Pickup | Wired, **disabled**. Set `FULFILLMENT_PICKUP_ENABLED=true` to allow `fulfillment: "pickup"`; the cart needs no changes. Verify the exact pickup fields in Sandbox first (see TODO in `square/checkout.ts`). |
| Errors | Square unreachable / misconfigured → on-brand error panel (HTTP 503, never cached), never an empty or sold-out catalogue. Bad credentials are logged server-side without the token. |
| Modes | `SQUARE_ENVIRONMENT` must be exactly `sandbox` or `production`. **Nothing defaults.** Production refuses the Sandbox location id. |

## Cloudflare setup (exact steps)

Worker name: `lanoir`. Build settings (already in use): build command `npm run build`;
deploy command `npx wrangler deploy` on `main`, `npx wrangler preview` on `staging`.

### A. Staging (Worker Preview, **Sandbox**)
Non-secret values are already committed in `wrangler.jsonc` → `previews.vars`:
`SQUARE_ENVIRONMENT=sandbox`, `SQUARE_LOCATION_ID=L0SZPKA80GMNA`.

Add the **one secret** (from a terminal where you are logged in to Cloudflare; paste the token at
the prompt — never put it on the command line):
```bash
npx wrangler preview secret put SQUARE_ACCESS_TOKEN --name staging
```
(`--name` defaults to the current git branch, which is `staging`.) Or use the dashboard:
Workers & Pages → `lanoir` → Settings → Variables and Secrets → *Preview* → Add → type **Secret**.
To share across all previews use `npx wrangler preview base-config secret put SQUARE_ACCESS_TOKEN`.
Then push to `staging` (or redeploy) so the build picks it up.

### B. Production (**Live Square — do this BEFORE merging to `main`**)
Dashboard → Workers & Pages → `lanoir` → Settings → Variables and Secrets → *Production*:

| Name | Type | Value |
|---|---|---|
| `SQUARE_ENVIRONMENT` | Text | `production` |
| `SQUARE_LOCATION_ID` | Text | your **production** location id (not the Sandbox one) |
| `SQUARE_ACCESS_TOKEN` | **Secret** | production access token (or `npx wrangler secret put SQUARE_ACCESS_TOKEN`) |

`wrangler.jsonc` sets `keep_vars: true`, so deploys never wipe these. If any are missing, the
live site shows the "shop is catching its breath" state instead of products.

### C. Build variables (Settings → Build → Variables) — *not* runtime
| Name | Staging | Production |
|---|---|---|
| `SITE_URL` | the staging URL | the real domain |
| `PUBLIC_ALLOW_INDEXING` | *unset* (noindex) | `true` |

### D. Optional / leave unset
`SQUARE_APPLICATION_ID` (not needed for hosted checkout) · `SQUARE_CACHE_SECONDS` (default 30, 0–600)
· `SQUARE_API_VERSION` (default pinned in `square/config.ts`) · `FULFILLMENT_PICKUP_ENABLED`.
**Never set `COMMERCE_PROVIDER` or `SQUARE_API_BASE_URL` in Cloudflare** (local development only).

### E. Recommended
Add a Cloudflare WAF **rate-limiting rule** for `/api/*` (e.g. 30 requests / minute / IP). The API is
same-origin-only and validated, but rate limiting protects your Square quota.

## Local development

```bash
cp .dev.vars.example .dev.vars      # git-ignored; edit as needed
npm run dev                          # COMMERCE_PROVIDER=mock works with no credentials
npm run fake-square                  # optional: local Square-shaped fixture server on :4010
npm test                             # unit tests
```
To try real Sandbox locally, put your own Sandbox token in **your local** `.dev.vars` only.

## Sandbox testing checklist

Prepare Sandbox (Square Developer Dashboard → Sandbox test account → Square Dashboard):
- [ ] Categories exist with the **exact** names above, plus `Featured`.
- [ ] Items covering: no variations · Size variations · Size + Colour (Item Options) · inventory **not** tracked · tracked with stock · tracked with **0** · an item with **no image** · a variable-price item.
- [ ] Inventory counts entered at location `L0SZPKA80GMNA`; shipping + tax configured in the Sandbox account.

On the staging URL:
1. [ ] **Catalogue:** `/shop` lists your items; names/prices match Square. Change a price in Square → it appears within ~30s.
2. [ ] **Collections:** each collection page shows only items in that category; `Featured` items appear on the homepage; an item with no category appears only in Shop All.
3. [ ] **Product page (no variations):** no picker; Add to cart works.
4. [ ] **Product page (Size / Colour):** chips + swatches; price and stock follow the chosen variation; a sold-out variation disables the button; a fully sold-out value is struck through.
5. [ ] **Untracked** item is always purchasable; **tracked** item's quantity stepper stops at stock on hand.
6. [ ] **No image:** neutral placeholder on card, page and in the cart.
7. [ ] **Cart drawer + /cart:** loading skeleton, quantity changes, remove, persistence after reload; empty state.
8. [ ] In Square, sell the last unit (or set stock to 0), then open the cart: line flagged "Sold out" / "Only N available", **Checkout disabled**.
9. [ ] **Price change:** edit a price in Square, then press Checkout on a stale cart → "prices changed", cart re-prices.
10. [ ] **Checkout:** redirects to a Square-hosted page showing the same items; shipping address is requested; **taxes and shipping rates (if configured) are applied by Square** ← *verify, see below*.
11. [ ] **Pay** with a Square Sandbox test card (see Square's "Testing" docs, e.g. `4111 1111 1111 1111`, any future expiry, CVV `111`, postal code `94103`).
12. [ ] After paying you land on `/order-complete` ("Thank you"), and the cart is cleared. Visiting `/order-complete` directly does **not** clear the cart.
13. [ ] **Square Dashboard → Orders:** the order's line items reference the catalogue variations (not custom items); **inventory decreased** for tracked variations.
14. [ ] **Errors:** set a deliberately wrong `SQUARE_ACCESS_TOKEN` preview secret → catalogue pages show the error panel (HTTP 503), cart shows "couldn't load", checkout fails politely; restore the real token.
15. [ ] **Security:** view page source / Network tab: no token, no `connect.squareup*` calls from the browser — only `/api/*`.

### Before merging to `main`
- [ ] All 15 checks pass on staging.
- [ ] Production variables/secret (section B) added; production catalogue, categories, inventory, taxes and shipping set up in **live** Square.
- [ ] `SITE_URL` + `PUBLIC_ALLOW_INDEXING=true` set for production builds.
- [ ] A real low-value live order tested and refunded.

## Things I could not verify from here (please confirm in Sandbox)
1. **Shipping rates:** we collect the address and send **no** shipping price. Whether Square applies your dashboard shipping settings to Payment Links created through the API is something to confirm at step 10. If it does not, the options are a Square-side shipping configuration that applies, or adding a `shipping_fee` from configuration (still not hardcoded in components).
2. **Pickup fields** (see above) and the exact redirect parameters Square appends to `/order-complete` (`orderId` / `transactionId` are assumed).
3. The pinned **Square API version** (`2025-10-16`) and response shapes were written from Square's documentation and recorded-shape fixtures; Sandbox is the first real call.
4. Stock is cached up to `SQUARE_CACHE_SECONDS` (30s) for display; **checkout always re-validates with fresh data**, but two shoppers buying the last unit at the same moment can still race inside Square.
5. The Worker's edge cache (`caches.default`) does nothing on `*.workers.dev` URLs; an in-memory per-instance cache still applies.

## Code map
`src/lib/commerce/square/` config · client · cache · inventory · mapper · catalog · checkout · index
`src/lib/commerce/cart.ts` validation · `src/lib/api.ts` endpoint helpers · `src/pages/api/*` endpoints
`src/scripts/cart*.ts` browser cart · `tests/` unit tests + Square-shaped fixtures
