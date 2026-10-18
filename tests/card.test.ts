import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { card, fullName } from '../src/config/card.ts';
import { contactMethods, formatPhone, normalizePhone } from '../src/lib/card/contact.ts';
import { qrSvg } from '../src/lib/card/qr.ts';
import { resolveCardUrl, sameOrigin } from '../src/lib/card/url.ts';
import { buildVCard, escapeText, fold, vcardFilename } from '../src/lib/card/vcard.ts';

const prod = 'https://lanoir.frameworkco.ca/card';
const input = (over: object = {}) => ({ ...card, phone: null, cardUrl: prod, ...over });
const unfold = (v: string) => v.replace(/\r\n /g, '');

describe('card URL per environment', () => {
  it('production always shares the permanent public URL, whatever host served the page', () => {
    for (const requestUrl of ['https://lanoir.frameworkco.ca/card', 'https://lanoir.shane.workers.dev/card?x=1#y', 'http://localhost:4321/card']) {
      assert.equal(resolveCardUrl({ requestUrl, isProduction: true, productionUrl: prod }), prod);
    }
  });
  it('staging and local share their OWN address (never the unavailable production page)', () => {
    const staging = 'https://staging-lanoir.example.workers.dev/card?utm=a#b';
    assert.equal(resolveCardUrl({ requestUrl: staging, isProduction: false, productionUrl: prod }), 'https://staging-lanoir.example.workers.dev/card');
    assert.equal(resolveCardUrl({ requestUrl: 'http://localhost:4321/card', isProduction: false, productionUrl: prod }), 'http://localhost:4321/card');
  });
  it('same-origin helper keeps the preview image on the card\'s origin', () => {
    assert.equal(sameOrigin('https://staging.example.dev/card', '/og-default.png'), 'https://staging.example.dev/og-default.png');
  });
});

describe('contact methods', () => {
  it('no phone → only Email; no tel:/sms: links exist', () => {
    const m = contactMethods({ ...card, phone: null });
    assert.deepEqual(m.map((x) => x.kind), ['email']);
    assert.equal(m[0].href, 'mailto:lanoirbadasswitchery@gmail.com');
    assert.ok(!m.some((x) => /^(tel|sms):/.test(x.href)));
  });
  it('shows only the enabled phone methods', () => {
    const phone = (call: boolean, text: boolean) => contactMethods({ email: 'a@b.co', phone: { number: '+1 (403) 555-0123', call, text } }).map((x) => `${x.kind}:${x.href}`);
    assert.deepEqual(phone(true, true), ['call:tel:+14035550123', 'text:sms:+14035550123', 'email:mailto:a@b.co']);
    assert.deepEqual(phone(true, false), ['call:tel:+14035550123', 'email:mailto:a@b.co']);
    assert.deepEqual(phone(false, true), ['text:sms:+14035550123', 'email:mailto:a@b.co']);
    assert.deepEqual(phone(false, false), ['email:mailto:a@b.co']);
  });
  it('the configured card: Call + Text + Email for (519) 965-3429, in that order', () => {
    assert.deepEqual(contactMethods(card).map((x) => `${x.kind}:${x.href}`), ['call:tel:+15199653429', 'text:sms:+15199653429', 'email:mailto:lanoirbadasswitchery@gmail.com']);
    assert.equal(formatPhone(card.phone!.number), '(519) 965-3429');
    assert.equal(formatPhone('+44 20 7946 0958'), '+442079460958');
  });
  it('the configured card\'s saved contact includes the phone', () => {
    assert.ok(buildVCard({ ...card, cardUrl: prod }).includes('\r\nTEL;TYPE=CELL,VOICE:+15199653429\r\n'));
  });
  it('requires a country code', () => {
    assert.throws(() => normalizePhone('403 555 0123'), /country code/);
    assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  });
  it('nothing enabled → empty list', () => assert.deepEqual(contactMethods({ email: null, phone: null }), []));
});

describe('saved contact (.vcf)', () => {
  const v = buildVCard(input());
  it('is a well-formed vCard 3.0 with CRLF endings', () => {
    assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
    assert.ok(v.endsWith('END:VCARD\r\n'));
    assert.ok(!/[^\r]\n/.test(v), 'every newline must be CRLF');
  });
  it('contains the confirmed details', () => {
    assert.ok(v.includes('\r\nN:Pinard;Cindy;;;\r\n'));
    assert.ok(v.includes('\r\nFN:Cindy Pinard\r\n'));
    assert.ok(v.includes('\r\nORG:LaNoir | Bad Ass Witchery\r\n'));
    assert.ok(v.includes('\r\nTITLE:Owner\r\n'));
    assert.ok(v.includes('\r\nEMAIL;TYPE=INTERNET,WORK:lanoirbadasswitchery@gmail.com\r\n'));
    assert.ok(v.includes('\r\nitem1.URL:https://lanoir.frameworkco.ca\r\n'));
    assert.ok(v.includes(`\r\nitem2.URL:${prod}\r\n`));
  });
  it('omits anything not supplied: no TEL, no NOTE, no placeholders', () => {
    assert.ok(!/TEL/.test(v) && !/NOTE/.test(v) && !/undefined|null|TODO|example/i.test(v));
  });
  it('includes the phone only when configured, in international format', () => {
    const withPhone = buildVCard(input({ phone: { number: '+1 403 555 0123', call: true, text: true } }));
    assert.ok(withPhone.includes('TEL;TYPE=CELL,VOICE:+14035550123'));
  });
  it('card-only details appear only in the saved contact when configured', () => {
    assert.ok(buildVCard(input({ vcardNote: 'Met at the market; follow up' })).includes('NOTE:Met at the market\; follow up'));
  });
  it('staging builds embed the staging card URL, not production', () => {
    assert.ok(buildVCard(input({ cardUrl: 'https://staging.example.dev/card' })).includes('item2.URL:https://staging.example.dev/card'));
  });
  it('escapes special characters and folds long lines without splitting characters', () => {
    assert.equal(escapeText('a,b;c\\d\ne'), 'a\\,b\;c\\\\d\\ne');
    const long = buildVCard(input({ business: 'Éclair & Crème Brûlée, Witchery; ' + 'é'.repeat(80) }));
    for (const line of long.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line.length}`);
    assert.ok(unfold(long).includes('ORG:Éclair & Crème Brûlée\\, Witchery\; ' + 'é'.repeat(80)), 'unfolds back to the original value');
    assert.ok(!unfold(long).includes('�'), 'no broken characters');
  });
  it('fold leaves short lines alone', () => assert.equal(fold('FN:Cindy Pinard'), 'FN:Cindy Pinard'));
  it('filename is recognisable (person + business) and filesystem-safe', () => {
    assert.equal(vcardFilename(card.fileBase), 'Cindy-Pinard-LaNoir.vcf');
    assert.equal(vcardFilename('../../etc/passwd'), 'etc-passwd.vcf');
    assert.equal(vcardFilename(''), 'contact.vcf');
    assert.equal(fullName(), 'Cindy Pinard');
  });
});

describe('QR code', () => {
  // Rasterise the SVG and decode it with an independent QR reader: proves the destination.
  const decode = async (url: string) => {
    const svg = qrSvg(url, 'test');
    const { data, info } = await sharp(Buffer.from(svg), { density: 300 }).resize(700, 700).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
  };
  it('decodes to the production card URL', async () => assert.equal(await decode(prod), prod));
  it('decodes to a staging card URL', async () => {
    const staging = 'https://staging-lanoir.example.workers.dev/card';
    assert.equal(await decode(staging), staging);
  });
  it('is high-contrast black on white, accessible, and self-contained', () => {
    const svg = qrSvg(prod, 'QR code for the card');
    assert.ok(svg.includes('fill="#000000"') && svg.includes('fill="#ffffff"'));
    assert.ok(svg.includes('role="img"') && svg.includes('aria-label="QR code for the card"'));
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg), 'no external references');
  });
  it('escapes the accessible label', () => assert.ok(qrSvg(prod, 'a "b" <c>').includes('aria-label="a &quot;b&quot; &lt;c>"')));
});
