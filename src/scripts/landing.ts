/**
 * Landing enhancements (progressive: the page works and looks complete without this).
 *  - cursor parallax on the sky and eclipse (fine pointers only, rAF-throttled, self-stopping)
 *  - the "door opens" state: hover (mouse) / press (touch), plus a spotlight that follows the pointer
 *  - the exit transition when a door is chosen
 *  - a frame-rate probe that switches to a lighter effects mode on slow devices
 * Skips all motion work under prefers-reduced-motion.
 */
const root = document.querySelector<HTMLElement>('[data-landing]');
if (root) init(root);

function init(root: HTMLElement) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  try { sessionStorage.setItem('ln-landing-seen', '1'); } catch { /* private mode: fine */ }

  let lite = false;
  const setLite = () => { lite = true; root.dataset.fx = 'lite'; };

  // ---- Low-power detection -------------------------------------------------------------
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if ((nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || nav.connection?.saveData) setLite();
  // Probe during the entrance (heaviest) and again once ambient motion is running.
  if (!reduce.matches && !lite) { probeFrames(600, setLite); probeFrames(5200, setLite); }

  // ---- Parallax --------------------------------------------------------------------------
  if (!reduce.matches && fine.matches) {
    const layers = [...root.querySelectorAll<HTMLElement>('[data-depth]')].map((el) => ({ el, d: Number(el.dataset.depth) || 0 }));
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      for (const { el, d } of layers) el.style.transform = `translate3d(${(-cx * d).toFixed(2)}px,${(-cy * d).toFixed(2)}px,0)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', (e) => {
      if (lite || e.pointerType !== 'mouse') return;
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } });
  }

  // ---- Doors: open state + spotlight + exit ---------------------------------------------
  const doors = [...root.querySelectorAll<HTMLAnchorElement>('a.door')];
  for (const door of doors) {
    const spot = door.querySelector<HTMLElement>('.fx--spot');
    const place = (e: PointerEvent) => {
      if (!spot) return;
      const r = door.getBoundingClientRect();
      spot.style.transform = `translate3d(${(e.clientX - r.left).toFixed(0)}px,${(e.clientY - r.top).toFixed(0)}px,0)`;
    };
    let release = 0;
    door.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { door.dataset.hot = ''; place(e); } });
    door.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') place(e); }, { passive: true });
    door.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') delete door.dataset.hot; });
    door.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      clearTimeout(release);
      place(e);
      door.dataset.hot = '';
    });
    const letGo = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      release = window.setTimeout(() => delete door.dataset.hot, 350);
    };
    door.addEventListener('pointerup', letGo);
    door.addEventListener('pointercancel', letGo);

    door.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduce.matches || root.dataset.leaving) return;
      e.preventDefault();
      const cta = door.querySelector<HTMLElement>('.door__cta')!.getBoundingClientRect();
      // Keyboard activation reports no pointer position: bloom from the call to action instead.
      const x = e.detail === 0 ? cta.left + cta.width / 2 : e.clientX;
      const y = e.detail === 0 ? cta.top + cta.height / 2 : e.clientY;
      root.style.setProperty('--ex', `${x}px`);
      root.style.setProperty('--ey', `${y}px`);
      door.classList.add('is-chosen');
      root.dataset.leaving = door.dataset.door ?? '';
      window.setTimeout(() => { location.href = door.href; }, 760);
    });
  }

  // Back/forward cache: come back to a usable landing, not a half-finished exit.
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    delete root.dataset.leaving;
    for (const d of doors) { d.classList.remove('is-chosen'); delete d.dataset.hot; }
  });
}

/** Sample frame times (once during the entrance, once when ambient motion is running); sustained slowness means "go lite". */
function probeFrames(startAfter: number, onSlow: () => void) {
  const dts: number[] = [];
  let last = 0;
  const frame = (t: number) => {
    if (last) {
      const dt = t - last;
      if (dt < 250) dts.push(dt); // ignore tab switches
    }
    last = t;
    if (dts.length < 45) return requestAnimationFrame(frame);
    dts.sort((a, b) => a - b);
    // 75th percentile: a quarter of frames missing ~30fps is a struggling device, a stray hitch is not.
    if (dts[Math.floor(dts.length * 0.75)] > 30) onSlow();
  };
  setTimeout(() => requestAnimationFrame(frame), startAfter);
}
