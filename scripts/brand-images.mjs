// Generates optimised WebP derivatives of the brand logo + icon into public/brand/.
// The ORIGINAL files in src/assets/brand/ are never modified. Run after replacing a logo asset:
//   npm run brand-images
// Why: server-rendered pages can't transform images at runtime on Workers (and we serve images
// untransformed by decision), so the variants are produced once here and served as static files.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const jobs = [
  { src: 'src/assets/brand/logo-icon.png', name: 'logo-icon', widths: [112, 168, 224, 336] },
  { src: 'src/assets/brand/logo-original.png', name: 'logo', widths: [480, 960, 1440, 1920] },
];
await mkdir('public/brand', { recursive: true });
for (const { src, name, widths } of jobs) {
  const meta = await sharp(src).metadata();
  for (const w of widths) {
    const out = `public/brand/${name}-${w}.webp`;
    const info = await sharp(src).resize({ width: Math.min(w, meta.width), withoutEnlargement: true }).webp({ quality: 88 }).toFile(out);
    console.log(out, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)}kB`);
  }
}
