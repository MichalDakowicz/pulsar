/**
 * The accent at a given opacity, for the wall and the charts.
 *
 * Comma `hsla()` on purpose: React Native's colour parser rejects the CSS 4
 * `hsl(h s l / a)` form and returns null, which paints nothing at all — every
 * partial and frozen square on the wall was invisible until this existed.
 * Keep in step with `--primary` in `theme/colors.ts`.
 */
export function accentAlpha(alpha: number): string {
  return `hsla(38,92%,50%,${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
}
