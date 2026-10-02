// Rasterises assets/brand/*.svg into the PNGs app.json points at.
//
// Run with `npm run icons` after changing the mark. The PNGs are build inputs,
// not artwork to edit — every one of them is regenerated from the two SVGs, so a
// hand edit is lost the next time this runs.
//
// The mark is trimmed to its tight bounding box first, then re-padded per
// target (PING.md §3.4). That keeps its optical size identical to Radar, Lidar
// and Sonar even though the SVG carries its own padding: scaling the untrimmed
// SVG made this app's launcher icon a fifth smaller than its siblings'.
//
// sharp is resolved from the sibling Radar checkout when it is not installed
// here: all the apps generate their icons the same way and one copy of a
// 40 MB native dependency is enough.

import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'assets', 'brand');
const images = join(root, 'assets', 'images');

// The --background token, and the ground the store icon and the adaptive icon sit on.
const BACKGROUND = { r: 9, g: 9, b: 11, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Supersample well above the largest target so the trimmed edges stay smooth.
const RENDER_PX = 2048;

/**
 * `scale` is the fraction of the canvas the mark's bounding box fills. The
 * Android adaptive icons stay near 0.48 because Play Store masks crop to the
 * centre ~66% of the canvas; the standalone icons can run much closer to full
 * bleed. These are the PING.md §3.4 numbers — change them there first.
 */
const TARGETS = [
  { file: 'icon.png', size: 1024, scale: 0.57, background: BACKGROUND },
  { file: 'favicon.png', size: 64, scale: 0.94 },
  { file: 'splash-icon.png', size: 512, scale: 0.91 },
  { file: 'android-icon-foreground.png', size: 1024, scale: 0.478 },
  { file: 'android-icon-monochrome.png', size: 1024, scale: 0.478, mono: '#FFFFFF' },
  // Notifications have no launcher mask, so the white mark can fill the canvas.
  { file: 'notification-icon.png', size: 96, scale: 0.94, mono: '#FFFFFF' },
];

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

const sharp = await loadSharp();

async function trimmedMark(mono) {
  const source = mono
    ? (await readFile(join(brand, 'logo-mono.svg'), 'utf8')).replaceAll('currentColor', mono)
    : await readFile(join(brand, 'logo.svg'), 'utf8');

  return sharp(Buffer.from(source), { density: 600 })
    .resize({ width: RENDER_PX, height: RENDER_PX, fit: 'contain', background: TRANSPARENT })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
}

async function render({ file, size, scale, background, mono }) {
  const content = Math.round(size * scale);
  const mark = await sharp(await trimmedMark(mono))
    .resize({ width: content, height: content, fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: background ?? TRANSPARENT } })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(join(images, file));

  return `${file}  ${size}x${size}`;
}

await mkdir(images, { recursive: true });
for (const target of TARGETS) {
  console.log('wrote', await render(target));
}
