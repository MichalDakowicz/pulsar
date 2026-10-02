import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// pngjs ships with expo-notifications' image tooling, so it is always installed.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PNG } = require('pngjs');

const IMAGES = join(__dirname, '..', '..', 'assets', 'images');

// PING.md §3.4: the fraction of the canvas the mark's bounding box fills. Every
// Ping app's raster icons must hit these, or its launcher icon, favicon and
// splash read bigger or smaller than its siblings'.
const SPEC = [
  ['icon.png', 0.57],
  ['favicon.png', 0.94],
  ['splash-icon.png', 0.91],
  ['android-icon-foreground.png', 0.478],
  ['android-icon-monochrome.png', 0.478],
  ['notification-icon.png', 0.94],
] as const;

/** Width and height of the opaque part of the mark, as a fraction of the canvas. */
function markFraction(file: string) {
  const png = PNG.sync.read(readFileSync(join(IMAGES, file)));
  const ground = png.data.slice(0, 4);
  const transparentGround = ground[3] === 0;

  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const differs = transparentGround
        ? png.data[i + 3] > 8
        : Math.abs(png.data[i] - ground[0]) + Math.abs(png.data[i + 1] - ground[1]) + Math.abs(png.data[i + 2] - ground[2]) > 30;
      if (!differs) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { width: (maxX - minX + 1) / png.width, height: (maxY - minY + 1) / png.height };
}

describe('raster icons', () => {
  it.each(SPEC)('%s: the mark fills %s of the canvas', (file, scale) => {
    const { width, height } = markFraction(file);
    expect(Math.abs(width - scale)).toBeLessThan(0.01);
    expect(Math.abs(height - scale)).toBeLessThan(0.01);
  });
});
