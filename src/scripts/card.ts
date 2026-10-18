/**
 * Card page behaviour: Share (native share → copy-link fallback) and the QR overlay.
 * Everything else on the page is plain HTML/links and works without this script.
 */
const toast = document.querySelector<HTMLElement>('[data-toast]');
let toastTimer: number | undefined;

function say(message: string) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-on'), 3500);
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* not available (insecure context / denied) — try the legacy route */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta);
    ta.select();
    // execCommand is deprecated but is the only copy route on older/insecure-context browsers.
    const ok = (document as unknown as { execCommand: (c: string) => boolean }).execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

// ---- Share ------------------------------------------------------------------------------------
const shareBtn = document.querySelector<HTMLButtonElement>('[data-share]');
shareBtn?.addEventListener('click', async () => {
  const url = shareBtn.dataset.url!;
  const data = { title: shareBtn.dataset.title, text: shareBtn.dataset.text, url };
  if (typeof navigator.share === 'function' && (navigator.canShare?.(data) ?? true)) {
    try {
      await navigator.share(data);
      return;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return; // the person closed the share sheet
      // any other failure → fall back to copying the link
    }
  }
  if (await copy(url)) say('Link copied');
  else say(`Copy this link: ${url}`);
});

// ---- QR overlay -------------------------------------------------------------------------------
const dialog = document.querySelector<HTMLDialogElement>('[data-qr]');
const qrButton = document.querySelector<HTMLButtonElement>('[data-qr-open]');
if (dialog && qrButton) {
  qrButton.addEventListener('click', () => dialog.showModal()); // focus moves into the dialog (Close is autofocused)
  // Click on the backdrop (outside the panel) closes it; Esc is handled natively by <dialog>.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  // Return focus to the control that opened it.
  dialog.addEventListener('close', () => qrButton.focus());
}
