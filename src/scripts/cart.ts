/**
 * Browser cart store. Holds ONLY variant ids + quantities (never prices or names):
 * everything shown or charged is validated server-side via /api/cart/quote and /api/checkout.
 * Persisted in localStorage; synced across tabs and to the header badge via events.
 */
export interface StoredLine {
  variantId: string;
  quantity: number;
}

const KEY = 'lanoir.cart.v1';
const EVENT = 'lanoir:cart';
const MAX_LINES = 30;
const MAX_QTY = 99;
const ID = /^[A-Za-z0-9_-]{6,64}$/;

function parse(raw: string | null): StoredLine[] {
  try {
    const parsed = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const lines: StoredLine[] = [];
    for (const l of parsed) {
      if (l && typeof l.variantId === 'string' && ID.test(l.variantId) && Number.isInteger(l.quantity) && l.quantity >= 1) {
        lines.push({ variantId: l.variantId, quantity: Math.min(l.quantity, MAX_QTY) });
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

  add(variantId: string, quantity = 1) {
    const lines = current().map((l) => ({ ...l }));
    const hit = lines.find((l) => l.variantId === variantId);
    if (hit) hit.quantity = Math.min(hit.quantity + quantity, MAX_QTY);
    else if (lines.length < MAX_LINES) lines.push({ variantId, quantity: Math.min(quantity, MAX_QTY) });
    write(lines);
  },
  setQuantity(variantId: string, quantity: number) {
    if (quantity < 1) return cart.remove(variantId);
    write(current().map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : { ...l })));
  },
  remove(variantId: string) {
    write(current().filter((l) => l.variantId !== variantId).map((l) => ({ ...l })));
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
