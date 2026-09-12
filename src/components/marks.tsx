import Svg, { Path } from 'react-native-svg';

/**
 * A habit's mark — the glyph that makes a row findable at a glance without
 * reading it. Eight of them, one stroke each, drawn on the same 24-unit grid as
 * every lucide icon in the app so they sit at the same optical weight.
 *
 * Text keys rather than an enum, and stored as text in the database: adding a
 * glyph should never need a migration.
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
];

/** Falls back to the pulse rather than rendering nothing for an unknown key. */
export function markFor(key: string): MarkDef {
  return MARKS.find((mark) => mark.key === key) ?? MARKS[2];
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
