/**
 * Site-wide cart wiring: header badge, cart drawer, and the /cart page.
 * Tiny on purpose: the heavier cart-view code is loaded only when a cart is actually shown.
 */
import { cart } from './cart';

const badges = document.querySelectorAll<HTMLElement>('[data-cart-count]');
const links = document.querySelectorAll<HTMLElement>('[data-cart-open]');

function paintBadge() {
  const n = cart.count();
  badges.forEach((b) => { b.textContent = String(n > 99 ? '99+' : n); b.hidden = n === 0; });
  links.forEach((l) => l.setAttribute('aria-label', n ? `Cart, ${n} ${n === 1 ? 'item' : 'items'}` : 'Cart'));
}
paintBadge();
cart.subscribe(paintBadge);

type View = { refresh: (o?: { quiet?: boolean }) => Promise<void> };
async function mount(root: HTMLElement, cache: WeakMap<HTMLElement, View>): Promise<View> {
  let view = cache.get(root);
  if (!view) {
    const { mountCartView } = await import('./cart-view');
    view = mountCartView(root);
    cache.set(root, view);
  }
  return view;
}
const views = new WeakMap<HTMLElement, View>();

// ---- Drawer ------------------------------------------------------------------------------
const drawer = document.querySelector<HTMLDialogElement>('[data-cart-drawer]');
async function openDrawer() {
  if (!drawer || drawer.open) return;
  drawer.showModal();
  document.documentElement.style.overflow = 'hidden';
  const view = await mount(drawer.querySelector<HTMLElement>('[data-cart-view]')!, views);
  await view.refresh();
}

if (drawer) {
  drawer.addEventListener('close', () => { document.documentElement.style.overflow = ''; });
  // Click on the backdrop (the dialog element itself, outside the panel) closes it.
  drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.close(); });
  drawer.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) drawer.close(); });
  links.forEach((l) =>
    l.addEventListener('click', (e) => {
      if (location.pathname === '/cart') return; // already on the full cart page
      e.preventDefault(); // without JS the link simply goes to /cart
      openDrawer();
    }),
  );
  window.addEventListener('lanoir:open-cart', openDrawer);
}

// ---- Full cart page ------------------------------------------------------------------------
const page = document.querySelector<HTMLElement>('[data-cart-page] [data-cart-view]');
if (page) mount(page, views).then((v) => v.refresh());
