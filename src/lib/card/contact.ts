/**
 * Which contact methods are enabled, and their links. Pure: driven entirely by the config.
 * Only enabled methods are returned, so the UI never shows a dead Call/Text button.
 */
import type { CardConfig } from '../../config/card.ts';

export type MethodKind = 'call' | 'text' | 'email';
export interface ContactMethod { kind: MethodKind; label: string; href: string }

/** International format: "+" then 7–15 digits (E.164). Spaces/dashes/brackets are stripped. */
export function normalizePhone(raw: string): string {
  const compact = raw.replace(/[\s\-().]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(compact)) {
    throw new Error(`Card phone must include the country code, e.g. +14035550123 (got "${raw}")`);
  }
  return compact;
}

/** Friendly display: +1 numbers as "(519) 965-3429"; anything else stays in international format. */
export function formatPhone(raw: string): string {
  const n = normalizePhone(raw);
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(n);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n;
}

export function contactMethods(c: Pick<CardConfig, 'phone' | 'email'>): ContactMethod[] {
  const out: ContactMethod[] = [];
  if (c.phone) {
    const n = normalizePhone(c.phone.number);
    if (c.phone.call) out.push({ kind: 'call', label: 'Call', href: `tel:${n}` });
    if (c.phone.text) out.push({ kind: 'text', label: 'Text', href: `sms:${n}` });
  }
  if (c.email) out.push({ kind: 'email', label: 'Email', href: `mailto:${c.email}` });
  return out;
}
