import Svg, { Path } from 'react-native-svg';

/**
 * A habit's mark — the glyph that makes a row findable at a glance without
 * reading it. One stroke each, drawn on the same 24-unit grid as every lucide
 * icon in the app so they sit at the same optical weight.
 *
 * The first eight are abstract, the rest name a domain: a quit-smoking habit
 * wants the ban, a gym habit wants the weight, and picking a shape that says
 * nothing is how every row ends up looking the same.
 *
 * Text keys rather than an enum, and stored as text in the database: adding a
 * glyph should never need a migration. Order is append-only for the same
 * reason — an existing habit's `mark` is one of these keys.
 */

export type MarkDef = { key: string; d: string; width: number };

export const MARKS: MarkDef[] = [
  { key: 'dot', d: 'M12 12h.01', width: 7 },
  { key: 'ring', d: 'M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0', width: 2 },
  { key: 'pulse', d: 'M2 12h4l2.5-7 3.5 14 3-9 2 2h5', width: 2 },
  { key: 'bars', d: 'M5 19V9M12 19V5M19 19v-7', width: 2 },
  { key: 'sweep', d: 'M3 17a11 11 0 0 1 18 0', width: 2 },
  { key: 'moon', d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z', width: 2 },
  { key: 'drop', d: 'M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z', width: 2 },
  { key: 'check', d: 'M20 6 9 17l-5-5', width: 2.4 },
  {
    key: 'flame',
    d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
    width: 2,
  },
  {
    key: 'heart',
    d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z',
    width: 2,
  },
  {
    key: 'book',
    d: 'M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
    width: 2,
  },
  {
    key: 'fork',
    d: 'M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7',
    width: 2,
  },
  { key: 'weight', d: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11', width: 2 },
  {
    key: 'bike',
    d: 'M18.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 17.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 17.5V14l-3-3 4-3 2 3h2',
    width: 2,
  },
  {
    key: 'leaf',
    d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
    width: 2,
  },
  {
    key: 'sun',
    d: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
    width: 2,
  },
  {
    key: 'cup',
    d: 'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2',
    width: 2,
  },
  { key: 'bolt', d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z', width: 2 },
  {
    key: 'wallet',
    d: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
    width: 2,
  },
  {
    key: 'phone',
    d: 'M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01',
    width: 2,
  },
  {
    key: 'note',
    d: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    width: 2,
  },
  { key: 'pen', d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z', width: 2 },
  { key: 'clock', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', width: 2 },
  { key: 'ban', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM4.9 4.9l14.2 14.2', width: 2 },
];

/**
 * Falls back to the pulse rather than rendering nothing for an unknown key —
 * by key, not by index, so appending to MARKS can never move the fallback.
 */
export function markFor(key: string): MarkDef {
  return MARKS.find((mark) => mark.key === key) ?? MARKS.find((mark) => mark.key === 'pulse')!;
}

type MarkProps = {
  mark: string;
  size?: number;
  color: string;
};

export function Mark({ mark, size = 20, color }: MarkProps) {
  const def = markFor(mark);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={def.d}
        stroke={color}
        strokeWidth={def.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
