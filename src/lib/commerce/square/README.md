# Square adapter

Implemented. See `docs/SQUARE.md` for behaviour, Cloudflare setup and the Sandbox checklist.

- `config.ts` environment resolution (fails closed; never defaults to sandbox/production)
- `client.ts` minimal fetch client (bearer auth, pinned version, safe errors)
- `cache.ts` per-isolate + Cache API caching
- `inventory.ts` / `mapper.ts` pure Square → `Product` mapping (unit-tested)
- `catalog.ts` catalogue + inventory loading · `checkout.ts` Payment Links request · `index.ts` provider

Everything here is server-side only. The UI imports `~/lib/commerce`, never this folder.
