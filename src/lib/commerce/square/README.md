# Square adapter (planned — Phase 3)

Not implemented. Nothing in the UI depends on Square.

When the Square architecture is decided, add `index.ts` here exporting a
`CommerceProvider` (see `../types.ts`) that maps Square Catalog objects →
`Product` / `Variant` / `Collection` (Square categories/items/variations) and
inventory → `Variant.available`. Register it in `../index.ts`.

Credentials must stay server-side (Cloudflare environment secrets, never
`PUBLIC_*`). The exact checkout approach (Square-hosted Checkout links vs. Web
Payments SDK + a Cloudflare Worker) is a separate decision.
