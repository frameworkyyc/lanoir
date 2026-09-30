/**
 * LOCAL DEVELOPMENT ONLY. A tiny stand-in for the Square API, served from the same fixtures the
 * tests use, so the storefront can be exercised end-to-end with no credentials:
 *
 *   npm run fake-square          # http://localhost:4010
 *   # .dev.vars:  SQUARE_ENVIRONMENT=sandbox  SQUARE_ACCESS_TOKEN=local  SQUARE_API_BASE_URL=http://localhost:4010
 *
 * The site only honours SQUARE_API_BASE_URL for sandbox + http://localhost (see square/config.ts).
 */
import http from 'node:http';
import { fakeSquare } from '../tests/fixtures/square.ts';

const port = Number(process.env.PORT ?? 4010);
const { fetchImpl, calls } = fakeSquare({ catalogPageSize: 6, paymentLinkUrl: 'https://sandbox.square.link/u/local-fixture' });

http
  .createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString() || undefined;
    if (!String(req.headers.authorization ?? '').startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ errors: [{ category: 'AUTHENTICATION_ERROR', code: 'UNAUTHORIZED' }] }));
    }
    const out = await fetchImpl(`http://localhost:${port}${req.url}`, { method: req.method, body, headers: {} });
    const text = await out.text();
    const last = calls[calls.length - 1];
    console.log(`${req.method} ${req.url?.split('?')[0]} → ${out.status}${last?.body?.order ? `  ${JSON.stringify(last.body.order.line_items)}` : ''}`);
    res.writeHead(out.status, { 'Content-Type': 'application/json' });
    res.end(text);
  })
  .listen(port, () => console.log(`Fake Square (fixtures) on http://localhost:${port}`));
