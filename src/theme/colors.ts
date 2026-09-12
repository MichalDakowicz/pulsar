import { vars } from 'nativewind';

/**
 * Pulsar's slice of the Ping token set (PING.md §4.1). Nineteen shadcn-shaped
 * variables, identical to Radar, Lidar and Sonar except `--primary`/`--ring`.
 *
 * The accent is amber-500. It is the one Ping accent bright enough that the
 * house rule — white on the accent fill, always (§4.2) — breaks: #FAFAFA on
 * #F59E0B measures 2.1:1, which is not a contrast ratio, it is a rumour. So
 * `--primary-foreground` is near-black in dark mode. Every other app keeps the
 * white; this is the deliberate exception, and it is why the check tick and the
 * hero ring read at arm's length instead of smearing.
 */
const dark = {
  '--background': '0 0% 3.9%',
  '--foreground': '0 0% 98%',
  '--card': '0 0% 3.9%',
  '--card-foreground': '0 0% 98%',
  '--popover': '0 0% 3.9%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '38 92% 50%',
  '--primary-foreground': '0 0% 5%',
  '--secondary': '0 0% 14.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '0 0% 14.9%',
  '--muted-foreground': '0 0% 63.9%',
  '--accent': '0 0% 14.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 62.8% 30.6%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 14.9%',
  '--input': '0 0% 14.9%',
  '--ring': '38 92% 50%',
};

// Amber on white is worse than amber on black, so light mode drops to amber-700
// and takes the white label back — #B45309 against #FAFAFA measures 5.0:1.
const light = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 9%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 9%',
  '--primary': '26 90% 37%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 96%',
  '--secondary-foreground': '0 0% 9%',
  '--muted': '0 0% 96%',
  '--muted-foreground': '0 0% 45%',
  '--accent': '0 0% 96%',
  '--accent-foreground': '0 0% 9%',
  '--destructive': '0 62.8% 40%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 90%',
  '--input': '0 0% 90%',
  '--ring': '26 90% 37%',
};

export const themeVars = {
  dark: vars(dark),
  light: vars(light),
};

/** Unwrapped, for mirroring onto document.documentElement on web. */
export const rawThemeVars = { dark, light };

export type ResolvedTheme = keyof typeof themeVars;

/**
 * The handful of colours that cannot come from a NativeWind class: SVG strokes,
 * chart fills, the nav islands' glass. Nothing else in the app may hold a hex.
 */
export const COLORS = {
  accent: 'hsl(38 92% 50%)',
  accentSoft: 'hsla(38,92%,50%,0.15)',
  accentInk: 'hsl(0 0% 5%)',
  foreground: 'hsl(0 0% 98%)',
  muted: 'hsl(0 0% 63.9%)',
  mutedDeep: 'hsl(0 0% 45%)',
  /** A streak about to break, and nothing else. Overused, it stops meaning it. */
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.1)',
  dangerEdge: 'rgba(239,68,68,0.45)',
  /** The wall's empty cell — a day that happened and was not held. */
  wallEmpty: 'rgba(255,255,255,0.055)',
  /** A day outside the habit's schedule: nothing was owed, so nothing is missing. */
  wallRest: 'rgba(255,255,255,0.02)',
  islandFill: 'rgba(22,22,22,0.72)',
  islandEdge: 'rgba(255,255,255,0.09)',
  islandPlate: 'rgba(255,255,255,0.12)',
  thumbGround: 'rgba(255,255,255,0.08)',
} as const;
