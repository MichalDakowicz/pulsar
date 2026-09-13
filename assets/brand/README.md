# Pulsar brand assets

The mark is a pulsar scope: an open ring sweeping around a held day, with the
blip breaking out of the gap - one day, kept. The centre glyph is a single cell
of the twelve-week wall with the tick knocked out of it rather than drawn over
it, so the mark reads on any ground. Everything is drawn on a 64x64 grid so it
stays crisp at 16px in the header and at 1024px as an app icon.

It is deliberately the *same* mark as Radar's, Lidar's and Sonar's - the same
ring, the same blip, the same stroke weight - with only the centre glyph and the
colour changed. Four apps, one family: put the icons side by side and they read
as a set rather than as four unrelated projects.

| File            | Use                                                                  |
| --------------- | -------------------------------------------------------------------- |
| `logo.svg`      | The mark. Imported as a component (`import Logo from '@/assets/brand/logo.svg'`). |
| `logo-mono.svg` | Single-colour mark using `currentColor` - pass `color` to tint it.    |
| `splash.svg`    | The mark, for splash/launch surfaces.                                |
| `google.svg`    | Google's G, for the OAuth button.                                    |

`logo.svg` is the single source of truth for every PNG in `assets/images/`.
After editing it, regenerate them:

```bash
npm run icons
```

Never hand-edit a PNG in there - the next run overwrites it.

## Palette

One flat colour, no gradients: `#F59E0B` - the `--primary` token from
`src/theme/colors.ts`. The backdrop everywhere is `#09090B`.
