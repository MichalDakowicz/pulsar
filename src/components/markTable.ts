/**
 * The table of habit marks — the glyph that makes a row findable at a glance
 * without reading it. One stroke each, drawn on the same 24-unit grid as every
 * lucide icon in the app so they sit at the same optical weight.
 *
 * Most paths are lucide's (ISC). The figures and the phone pair — phone,
 * phone-off, yoga, stretch, run, walk, swim, calculator — are Tabler Icons'
 * (MIT, tabler.io/icons), whose stroke style matches; lucide has no runner and
 * no yoga pose. Climb is drawn here: neither set has a stair climber. Each icon's
 * separate elements are flattened into one `d` so Mark stays a single Path.
 *
 * Text keys rather than an enum, and stored as text in the database: adding a
 * glyph should never need a migration. Order is append-only for the same
 * reason — an existing habit's `mark` is one of these keys. The picker shows
 * them by `group`, so a new mark joins its group without moving the order.
 */

export type MarkGroup = 'shapes' | 'move' | 'body' | 'mind' | 'life' | 'quit';

/** The picker's sections, top to bottom. */
export const MARK_GROUPS: MarkGroup[] = ['shapes', 'move', 'body', 'mind', 'life', 'quit'];

export type MarkDef = { key: string; group: MarkGroup; width: number; d: string };

export const MARKS: MarkDef[] = [
  { key: 'dot',           group: 'shapes', width: 7, d: 'M12 12h.01' },
  { key: 'ring',          group: 'shapes', width: 2, d: 'M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0' },
  { key: 'pulse',         group: 'shapes', width: 2, d: 'M2 12h4l2.5-7 3.5 14 3-9 2 2h5' },
  { key: 'bars',          group: 'shapes', width: 2, d: 'M5 19V9M12 19V5M19 19v-7' },
  { key: 'sweep',         group: 'shapes', width: 2, d: 'M3 17a11 11 0 0 1 18 0' },
  { key: 'moon',          group: 'body',   width: 2, d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z' },
  { key: 'drop',          group: 'body',   width: 2, d: 'M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z' },
  { key: 'check',         group: 'shapes', width: 2.4, d: 'M20 6 9 17l-5-5' },
  { key: 'flame',         group: 'shapes', width: 2, d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z' },
  { key: 'heart',         group: 'body',   width: 2, d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z' },
  { key: 'book',          group: 'mind',   width: 2, d: 'M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z' },
  { key: 'fork',          group: 'body',   width: 2, d: 'M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7' },
  { key: 'weight',        group: 'move',   width: 2, d: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11' },
  { key: 'bike',          group: 'move',   width: 2, d: 'M18.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 17.5V14l-3-3 4-3 2 3h2' },
  { key: 'leaf',          group: 'life',   width: 2, d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12' },
  { key: 'sun',           group: 'body',   width: 2, d: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42' },
  { key: 'cup',           group: 'body',   width: 2, d: 'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2' },
  { key: 'bolt',          group: 'shapes', width: 2, d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' },
  { key: 'wallet',        group: 'life',   width: 2, d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' },
  { key: 'phone',         group: 'life',   width: 2, d: 'M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14M11 4h2M12 17v.01' },
  { key: 'note',          group: 'mind',   width: 2, d: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { key: 'pen',           group: 'mind',   width: 2, d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z' },
  { key: 'clock',         group: 'mind',   width: 2, d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  { key: 'ban',           group: 'quit',   width: 2, d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM4.9 4.9l14.2 14.2' },
  { key: 'pill',          group: 'body',   width: 2, d: 'M10.5 20.5l10 -10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7ZM8.5 8.5l7 7' },
  { key: 'phone-off',     group: 'quit',   width: 2, d: 'M7.159 3.185c.256 -.119 .54 -.185 .841 -.185h8a2 2 0 0 1 2 2v9m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-13M11 4h2M3 3l18 18M12 17v.01' },
  { key: 'yoga',          group: 'move',   width: 2, d: 'M4 20h4l1.5 -3M17 20l-1 -5h-5l1 -7M4 10l4 -1l4 -1l4 1.5l4 1.5M10.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' },
  { key: 'stretch',       group: 'move',   width: 2, d: 'M15 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M5 20l5 -.5l1 -2M18 20v-5h-5.5l2.5 -6.5l-5.5 1l1.5 2' },
  { key: 'calculator',    group: 'mind',   width: 2, d: 'M4 5a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -14M8 8a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-6a1 1 0 0 1 -1 -1l0 -1M8 14l0 .01M12 14l0 .01M16 14l0 .01M8 17l0 .01M12 17l0 .01M16 17l0 .01' },
  { key: 'climb',         group: 'move',   width: 2, d: 'M2 21h7.5v-4h5.5v-4h7M10 3.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M10 7.5l-1.5 5M8.5 12.5l-1.5 4l-1 4.5M8.5 12.5l4 .5l0 4M10 7.5l3.5 1.5M10 7.5l-3.5 1.5l-1 2.5' },
  { key: 'run',           group: 'move',   width: 2, d: 'M11.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M4 17l5 1l.75 -1.5M15 21v-4l-4 -3l1 -6M7 12v-3l5 -1l3 3l3 1' },
  { key: 'walk',          group: 'move',   width: 2, d: 'M12 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M7 21l3 -4M16 21l-2 -4l-3 -3l1 -6M6 12l2 -3l4 -1l3 3l3 1' },
  { key: 'steps',         group: 'move',   width: 2, d: 'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0ZM20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0ZM16 17h4M4 13h4' },
  { key: 'swim',          group: 'move',   width: 2, d: 'M15 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M6 11l4 -2l3.5 3l-1.5 2M3 16.75a2.4 2.4 0 0 0 1 .25a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1 -.25' },
  { key: 'heartbeat',     group: 'move',   width: 2, d: 'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27' },
  { key: 'biceps',        group: 'move',   width: 2, d: 'M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1M15 14a5 5 0 0 0-7.584 2M9.964 6.825C8.019 7.977 9.5 13 8 15' },
  { key: 'mountain',      group: 'move',   width: 2, d: 'M8 3l4 8 5 -5 5 15H2L8 3z' },
  { key: 'sigma',         group: 'mind',   width: 2, d: 'M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2' },
  { key: 'brain',         group: 'mind',   width: 2, d: 'M12 18V5M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5M17.997 5.125a4 4 0 0 1 2.526 5.77M18 18a4 4 0 0 0 2-7.464M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517M6 18a4 4 0 0 1-2-7.464M6.003 5.125a4 4 0 0 0-2.526 5.77' },
  { key: 'code',          group: 'mind',   width: 2, d: 'M16 18l6 -6 -6 -6M8 6l-6 6 6 6' },
  { key: 'language',      group: 'mind',   width: 2, d: 'M5 8l6 6M4 14l6 -6 2 -3M2 5h12M7 2h1M22 22l-5 -10 -5 10M14 18h6' },
  { key: 'palette',       group: 'mind',   width: 2, d: 'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8zM13 6.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M17 10.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M6 12.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0M8 7.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0' },
  { key: 'cap',           group: 'mind',   width: 2, d: 'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5' },
  { key: 'bed',           group: 'body',   width: 2, d: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9' },
  { key: 'glass',         group: 'body',   width: 2, d: 'M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79zM6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0' },
  { key: 'apple',         group: 'body',   width: 2, d: 'M12 6.528V3a1 1 0 0 1 1-1h0M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21' },
  { key: 'shower',        group: 'body',   width: 2, d: 'M4 4l2.5 2.5M13.5 6.5a4.95 4.95 0 0 0-7 7M15 5 5 15M14 17v.01M10 16v.01M13 13v.01M16 10v.01M11 20v.01M17 14v.01M20 11v.01' },
  { key: 'sparkles',      group: 'body',   width: 2, d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594zM20 2v4M22 4h-4M2 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' },
  { key: 'dog',           group: 'life',   width: 2, d: 'M11.25 16.25h1.5L12 17zM16 14v.5M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444a11.702 11.702 0 0 0-.493-3.309M8 14v.5M8.5 8.5c-.384 1.05-1.083 2.028-2.344 2.5-1.931.722-3.576-.297-3.656-1-.113-.994 1.177-6.53 4-7 1.923-.321 3.651.845 3.651 2.235A7.497 7.497 0 0 1 14 5.277c0-1.39 1.844-2.598 3.767-2.277 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5' },
  { key: 'sprout',        group: 'life',   width: 2, d: 'M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4M5 21h14' },
  { key: 'gamepad',       group: 'quit',   width: 2, d: 'M6 11L10 11M8 9L8 13M15 12L15.01 12M18 10L18.01 10M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z' },
  { key: 'cigarette-off', group: 'quit',   width: 2, d: 'M12 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h13M18 8c0-2.5-2-2.5-2-5M2 2l20 20M21 12a1 1 0 0 1 1 1v2a1 1 0 0 1-.5.866M22 8c0-2.5-2-2.5-2-5M7 12v4' },
  { key: 'wine-off',      group: 'quit',   width: 2, d: 'M8 22h8M7 10h3m7 0h-1.343M12 15v7M7.307 7.307A12.33 12.33 0 0 0 7 10a5 5 0 0 0 7.391 4.391M8.638 2.981C8.75 2.668 8.872 2.34 9 2h6c1.5 4 2 6 2 8 0 .407-.05.809-.145 1.198M2 2L22 22' },
  { key: 'shield',        group: 'quit',   width: 2, d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' },
];

/** One section of the picker, in table order. */
export function marksIn(group: MarkGroup): MarkDef[] {
  return MARKS.filter((mark) => mark.group === group);
}

/**
 * Falls back to the pulse rather than rendering nothing for an unknown key —
 * by key, not by index, so appending to MARKS can never move the fallback.
 */
export function markFor(key: string): MarkDef {
  return MARKS.find((mark) => mark.key === key) ?? MARKS.find((mark) => mark.key === 'pulse')!;
}
