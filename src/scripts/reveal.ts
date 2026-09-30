/**
 * Scroll reveals. ~0.5kB, no library. Elements with [data-reveal] get `.is-in`
 * when they enter the viewport (once). CSS in motion.css does the animating and
 * is disabled under prefers-reduced-motion, so this only flips a class.
 */
const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (!('IntersectionObserver' in window)) {
  targets.forEach((el) => el.classList.add('is-in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting || e.boundingClientRect.top < 0) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  targets.forEach((el) => io.observe(el));
}
