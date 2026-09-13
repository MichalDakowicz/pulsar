// Rasterises assets/brand/*.svg into the PNGs app.json points at.
//
// Run with `npm run icons` after changing the mark. The PNGs are build inputs,
// not artwork to edit — every one of them is regenerated from the two SVGs, so a
// hand edit is lost the next time this runs.
//
// sharp is resolved from the sibling Radar checkout when it is not installed
// here: all four apps generate their icons the same way and one copy of a
// 40 MB native dependency is enough.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'assets', 'brand');
const images = join(root, 'assets', 'images');

const BACKGROUND = '#09090b';

async function loadSharp() {
  const require = createRequire(import.meta.url);
  for (const specifier of ['sharp', join(root, '..', 'radar', 'node_modules', 'sharp')]) {
    try {
      return require(specifier);
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error('sharp is not installed here or in ../radar. Run `npm i -D sharp`.');
}

/** One PNG: the mark centred on a square, optionally over a solid ground. */
async function render(sharp, svg, { size, pad, background, out }) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(svg).resize(inner, inner).png().toBuffer();
  const base = background
    ? sharp({ create: { width: size, height: size, channels: 4, background } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await base.composite([{ input: mark, gravity: 'centre' }]).png().toFile(join(images, out));
  console.log(`wrote ${out}`);
}

const sharp = await loadSharp();
await mkdir(images, { recursive: true });

const logo = await readFile(join(brand, 'logo.svg'));
const mono = await readFile(join(brand, 'logo-mono.svg'));

// The store icon sits on the ground colour; the adaptive foreground and the
// monochrome layer must stay transparent or Android draws a square on a circle.
await render(sharp, logo, { size: 1024, pad: 0.18, background: BACKGROUND, out: 'icon.png' });
await render(sharp, logo, { size: 1024, pad: 0.28, out: 'android-icon-foreground.png' });
await render(sharp, mono, { size: 1024, pad: 0.28, out: 'android-icon-monochrome.png' });
await render(sharp, logo, { size: 512, pad: 0.1, out: 'splash-icon.png' });
await render(sharp, logo, { size: 64, pad: 0.08, background: BACKGROUND, out: 'favicon.png' });

// The web build wants a real file rather than a data URI here.
await writeFile(join(images, '.gitkeep'), '');
