# Pulsar brand

The Ping mark (PING.md section 3): the ring stays, the centre glyph is swapped.
Pulsar's glyph is the pulse itself — the waveform the app is named for — with the
blip riding above its tail.

| File             | Use                                                        |
| ---------------- | ---------------------------------------------------------- |
| `logo.svg`       | amber on transparent. The source for every raster below.    |
| `logo-mono.svg`  | white on transparent, for the Android monochrome icon.      |

Rasters in `assets/images/` are generated — `node scripts/generate-icons.mjs`
rewrites them from these two files. Never hand-edit a PNG in there.

Checked at 16px: the ring has to stay uncropped under a Play Store mask, which
is why the glyph is inset rather than running edge to edge.
