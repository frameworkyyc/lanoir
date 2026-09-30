/**
 * Cart view: used by both the drawer and the /cart page.
 * States: loading · empty · error (retry) · ready (with per-line issues) · redirecting.
 * All prices, stock and validation come from the server; this file only renders them.
 */
import type { CartQuote, QuotedLine } from '../lib/commerce/types';
import { formatMoney } from '../lib/format';
import { cart } from './cart';
import { h } from './dom';

type ViewState =
  | { kind: 'empty' }
  | { kind: 'loading'; lines: number }
  | { kind: 'error' }
  | { kind: 'ready'; quote: CartQuote; stale?: boolean };

const ISSUE_TEXT: Record<string, (l: QuotedLine) => string> = {
  'not-found': () => 'This item is no longer available.',
  'sold-out': () => 'Sold out.',
  unavailable: () => 'Not available to buy online.',
  'insufficient-stock': (l) => (l.issue?.code === 'insufficient-stock' ? `Only ${l.issue.available} available.` : ''),
};

export function mountCartView(root: HTMLElement) {
  let state: ViewState = { kind: 'empty' };
  let seq = 0;
  let checkingOut = false;
  let message = ''; // polite status / error text under the lines

  async function refresh(opts: { quiet?: boolean } = {}) {
    const lines = cart.lines();
    if (lines.length === 0) { state = { kind: 'empty' }; message = ''; return render(); }

    const mine = ++seq;
    if (state.kind === 'ready' && opts.quiet) state = { ...state, stale: true };
    else state = { kind: 'loading', lines: lines.length };
    render();

    try {
      const res = await fetch('/api/cart/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { quote } = (await res.json()) as { quote: CartQuote };
      if (mine !== seq) return; // a newer request superseded this one
      state = { kind: 'ready', quote };
    } catch {
      if (mine !== seq) return;
      state = { kind: 'error' };
    }
    render();
  }

  async function checkout() {
    if (state.kind !== 'ready' || !state.quote.canCheckout || checkingOut) return;
    checkingOut = true; message = ''; render();
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: cart.lines().map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          expectedSubtotal: state.quote.subtotal?.amount,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { code?: string; message?: string } };
      if (res.ok && data.url) { window.location.assign(data.url); return; } // stay in "redirecting" state
      checkingOut = false;
      const code = data.error?.code;
      if (code === 'cart_invalid' || code === 'price_changed') {
        message = code === 'price_changed' ? 'Some prices changed. Please review your cart.' : 'Some items changed. Please review your cart.';
        await refresh({ quiet: true });
        return;
      }
      message = 'We couldn’t start checkout. Please try again.';
    } catch {
      checkingOut = false;
      message = 'We couldn’t reach checkout. Check your connection and try again.';
    }
    render();
  }

  function lineEl(l: QuotedLine): HTMLElement {
    const blocked = !!l.issue && l.issue.code !== 'insufficient-stock';
    const setQty = (q: number) => { cart.setQuantity(l.variantId, q); };
    const meta = Object.values(l.options).join(' / ') || (l.variantTitle !== 'Default' ? l.variantTitle : '');
    const img = l.image?.src && typeof l.image.src === 'string'
      ? h('img', { class: 'cv-line__img', src: l.image.src, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' })
      : h('div', { class: 'cv-line__img cv-line__img--empty', 'aria-hidden': 'true' });

    return h('li', { class: `cv-line${blocked ? ' is-blocked' : ''}` },
      img,
      h('div', { class: 'cv-line__body' },
        l.productSlug
          ? h('a', { class: 'cv-line__name', href: `/products/${l.productSlug}` }, l.productName)
          : h('p', { class: 'cv-line__name' }, l.productName),
        meta ? h('p', { class: 'cv-line__meta t-label' }, meta) : null,
        l.issue
          ? h('p', { class: 'cv-line__issue', role: 'status' },
              ISSUE_TEXT[l.issue.code](l),
              l.issue.code === 'insufficient-stock' && l.issue.available > 0
                ? h('button', { type: 'button', class: 'cv-link', onclick: () => setQty((l.issue as { available: number }).available) }, ` Reduce to ${l.issue.available}`)
                : null)
          : null,
        h('div', { class: 'cv-line__row' },
          h('div', { class: 'qty', role: 'group', 'aria-label': `Quantity for ${l.productName}` },
            h('button', { type: 'button', class: 'qty__btn', 'aria-label': 'Decrease quantity', disabled: l.quantity <= 1, onclick: () => setQty(l.quantity - 1) }, '−'),
            h('span', { class: 'qty__val', 'aria-live': 'polite' }, String(l.quantity)),
            h('button', { type: 'button', class: 'qty__btn', 'aria-label': 'Increase quantity', disabled: l.quantity >= Math.max(l.maxQuantity, 1) || blocked, onclick: () => setQty(l.quantity + 1) }, '+')),
          h('p', { class: 'cv-line__price' }, blocked ? '' : formatMoney(l.lineTotal))),
        h('button', { type: 'button', class: 'cv-link cv-line__remove', onclick: () => cart.remove(l.variantId), 'aria-label': `Remove ${l.productName}` }, 'Remove')));
  }

  function render() {
    root.replaceChildren();
    root.setAttribute('aria-busy', String(state.kind === 'loading' || (state.kind === 'ready' && !!state.stale)));

    if (state.kind === 'empty') {
      root.append(h('div', { class: 'cv-empty' },
        h('p', { class: 't-display-sm' }, 'Your cart is empty.'),
        h('p', { class: 't-body t-muted' }, 'Nothing here yet. Start with the collections.'),
        h('a', { class: 'btn', href: '/collections' }, 'Shop the collections ', h('span', { class: 'btn__arrow', 'aria-hidden': 'true' }, '→'))));
      return;
    }

    if (state.kind === 'loading') {
      root.append(h('ul', { class: 'cv-lines list-reset', 'aria-label': 'Loading your cart' },
        ...Array.from({ length: Math.min(state.lines, 3) }, () =>
          h('li', { class: 'cv-line cv-skeleton', 'aria-hidden': 'true' }, h('div', { class: 'cv-line__img' }), h('div', { class: 'cv-line__body' }, h('span', { class: 'sk sk--w60' }), h('span', { class: 'sk sk--w30' }))))));
      return;
    }

    if (state.kind === 'error') {
      root.append(h('div', { class: 'cv-error', role: 'alert' },
        h('p', { class: 't-statement-sm' }, 'We couldn’t load your cart.'),
        h('p', { class: 't-body t-muted' }, 'Your items are still saved. Please try again.'),
        h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => refresh() }, 'Try again')));
      return;
    }

    const { quote, stale } = state;
    const subtotal = quote.subtotal ? formatMoney(quote.subtotal) : '—';
    root.append(
      h('ul', { class: `cv-lines list-reset${stale ? ' is-stale' : ''}`, role: 'list' }, ...quote.lines.map(lineEl)),
      h('div', { class: 'cv-summary' },
        h('p', { class: 'cv-summary__row' }, h('span', { class: 't-label' }, 'Subtotal'), h('span', { class: 'cv-summary__total' }, subtotal)),
        h('p', { class: 'cv-summary__note t-label' }, 'Shipping and taxes are calculated at checkout.'),
        message ? h('p', { class: 'cv-message', role: 'alert' }, message) : h('p', { class: 'cv-message', role: 'status' }),
        h('button', {
          type: 'button', class: 'btn cv-checkout', onclick: checkout,
          disabled: !quote.canCheckout || !!stale || checkingOut, 'aria-busy': checkingOut,
        }, checkingOut ? 'Taking you to secure checkout…' : 'Checkout', checkingOut ? null : h('span', { class: 'btn__arrow', 'aria-hidden': 'true' }, '→')),
        !quote.canCheckout && quote.lines.length > 0
          ? h('p', { class: 'cv-summary__note t-label' }, 'Remove or update the highlighted items to continue.') : null));
  }

  cart.subscribe(() => { message = ''; refresh({ quiet: true }); });
  // Returning via the browser's back button from Square's checkout restores this page frozen mid-redirect.
  window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) { checkingOut = false; refresh({ quiet: true }); } });

  return { refresh };
}
