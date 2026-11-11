/**
 * Browser cart store. Holds ONLY variant ids + quantities (never prices or names):
 * everything shown or charged is validated server-side via /api/cart/quote and /api/checkout.
 * Persisted in localStorage; synced across tabs and to the header badge via events.
 */
export interface StoredLine {
  variantId: string;
  modifierIds?: string[];
  quantity: number;
}

const KEY = 'lanoir.cart.v1';
const EVENT = 'lanoir:cart';
const MAX_LINES = 30;
const MAX_QTY = 99;
const ID = /^[A-Za-z0-9_-]{6,192}$/;
const lineKey = (variantId: string, modifierIds: string[] = []) => `${variantId}\u0000${[...modifierIds].sort().join('\u0000')}`;

function parse(raw: string | null): StoredLine[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const lines: StoredLine[] = [];
    for (const l of parsed) {
      const modifierIds = Array.isArray(l?.modifierIds) ? [...new Set(l.modifierIds)].filter((id): id is string => typeof id === 'string' && ID.test(id)).sort() : [];
      if (l && typeof l.variantId === 'string' && ID.test(l.variantId) && Number.isInteger(l.quantity) && l.quantity >= 1) {
        lines.push({ variantId: l.variantId, ...(modifierIds.length ? { modifierIds } : {}), quantity: Math.min(l.quantity, MAX_QTY) });
      }
    }
    return lines.slice(0, MAX_LINES);
  } catch {
    return []; // corrupted value → behave as an empty cart
  }
}

/** In-memory copy, used only when localStorage is unavailable (private mode / blocked storage). */
let memory: StoredLine[] = [];

/** Always re-read storage so a change made elsewhere (another tab, devtools) is never missed. */
function current(): StoredLine[] {
  try {
    return (memory = parse(localStorage.getItem(KEY)));
  } catch {
    return memory;
  }
}

function write(lines: StoredLine[]) {
  memory = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch { /* storage unavailable: the cart works for this page view only */ }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const cart = {
  lines: (): StoredLine[] => current().map((l) => ({ ...l })),
  count: (): number => current().reduce((n, l) => n + l.quantity, 0),

  add(variantId: string, quantity = 1, modifierIds: string[] = []) {
    const lines = current().map((l) => ({ ...l }));
    const cleanModifiers = [...new Set(modifierIds)].sort();
    const key = lineKey(variantId, cleanModifiers);
    const hit = lines.find((l) => lineKey(l.variantId, l.modifierIds) === key);
    if (hit) hit.quantity = Math.min(hit.quantity + quantity, MAX_QTY);
    else if (lines.length < MAX_LINES) lines.push({ variantId, ...(cleanModifiers.length ? { modifierIds: cleanModifiers } : {}), quantity: Math.min(quantity, MAX_QTY) });
    write(lines);
  },
  setQuantity(variantId: string, quantity: number, modifierIds: string[] = []) {
    if (quantity < 1) return cart.remove(variantId, modifierIds);
    const key = lineKey(variantId, modifierIds);
    write(current().map((l) => (lineKey(l.variantId, l.modifierIds) === key ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : { ...l })));
  },
  remove(variantId: string, modifierIds: string[] = []) {
    const key = lineKey(variantId, modifierIds);
    write(current().filter((l) => lineKey(l.variantId, l.modifierIds) !== key).map((l) => ({ ...l })));
  },
  clear() {
    write([]);
  },
  /** Runs on any change in this tab or another. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
    window.addEventListener(EVENT, fn);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(EVENT, fn); window.removeEventListener('storage', onStorage); };
  },
};
