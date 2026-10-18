/**
 * QR code generated locally on the server as inline SVG (no paid service, no expiring link, no
 * client JavaScript needed). Black on white with a 4-module quiet zone for reliable scanning —
 * deliberately NOT brand-coloured. Error correction M.
 */
import { renderSVG } from 'uqr';

export function qrSvg(text: string, label: string): string {
  const svg = renderSVG(text, { ecc: 'M', border: 4, whiteColor: '#ffffff', blackColor: '#000000' });
  const safe = label.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return svg.replace('<svg ', `<svg role="img" aria-label="${safe}" focusable="false" shape-rendering="crispEdges" `);
}
