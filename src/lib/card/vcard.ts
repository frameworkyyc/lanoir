/**
 * vCard 3.0 (RFC 2426) builder — the most widely imported version (iOS, Android, Outlook, Google).
 * CRLF line endings, escaped text values, lines folded at 75 octets. Pure and unit-tested.
 * Fields that are not supplied are omitted entirely (never empty or placeholder).
 */
import type { CardConfig } from '../../config/card.ts';
import { normalizePhone } from './contact.ts';

/** RFC 2426 §4 text escaping. */
export const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\;').replace(/,/g, '\\,');

/** Fold a content line to ≤75 octets per line, never splitting a multi-byte character. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // continuation lines start with one space
    }
    current += ch;
    bytes += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export interface VCardInput extends Pick<CardConfig, 'givenName' | 'familyName' | 'role' | 'business' | 'phone' | 'email' | 'website' | 'vcardNote'> {
  /** The card's public URL for the environment generating the file. */
  cardUrl: string;
}

export function buildVCard(c: VCardInput): string {
  const full = `${c.givenName} ${c.familyName}`.trim();
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeText(c.familyName)};${escapeText(c.givenName)};;;`,
    `FN:${escapeText(full)}`,
    ...(c.business ? [`ORG:${escapeText(c.business)}`] : []),
    ...(c.role ? [`TITLE:${escapeText(c.role)}`] : []),
    ...(c.phone ? [`TEL;TYPE=CELL,VOICE:${normalizePhone(c.phone.number)}`] : []),
    ...(c.email ? [`EMAIL;TYPE=INTERNET,WORK:${c.email}`] : []),
    // Apple-style grouped labels; other apps simply show the URLs.
    ...(c.website ? ['item1.URL:' + c.website, 'item1.X-ABLabel:Website'] : []),
    'item2.URL:' + c.cardUrl,
    'item2.X-ABLabel:Digital card',
    ...(c.vcardNote ? [`NOTE:${escapeText(c.vcardNote)}`] : []),
    'END:VCARD',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Safe download filename: letters, digits, dot, dash, underscore only. */
export const vcardFilename = (base: string) => {
  const safe = base
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.') // no ".." sequences
    .replace(/^[-.]+|[-.]+$/g, ''); // no leading/trailing dots or dashes
  return `${safe || 'contact'}.vcf`;
};
