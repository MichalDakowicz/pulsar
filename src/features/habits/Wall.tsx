import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_INITIALS } from '@/lib/dates';
import type { WallCell, WallWeek } from '@/lib/wall';
import { COLORS } from '@/theme/colors';

/**
 * The wall: one square per day.
 *
 * Five colours for five states, and the fifth is the one the mock did not have.
 * A `rest` day — one the habit never asked for — is drawn fainter than a miss
 * rather than the same as one, because a weekday habit whose weekends read as
 * holes looks two-sevenths broken when it is in fact perfect.
 */

function partialColor(ratio: number): string {
  return `hsl(38 92% 50% / ${(0.25 + ratio * 0.55).toFixed(2)})`;
}

function cellColor(cell: WallCell): string {
  switch (cell.state) {
    case 'held':
      return COLORS.accent;
    case 'partial':
      // The ratio is visible rather than rounded away: six of eight glasses is
      // not the same as none, and a wall that says it is teaches you not to
      // bother on a day you cannot finish.
      return partialColor(cell.ratio);
    case 'frozen':
      return 'hsl(38 92% 50% / 0.2)';
    case 'missed':
      return COLORS.wallEmpty;
    case 'rest':
      return COLORS.wallRest;
    case 'future':
      // Today paints `future` until it is answered, but a counter already part
      // of the way there shows how far — the wall should not hide a start.
      return cell.ratio > 0 ? partialColor(cell.ratio) : 'transparent';
  }
}

function Cell({
  cell,
  gap,
  editable,
  ring,
  onPress,
}: {
  cell: WallCell;
  gap: number;
  editable: boolean;
  /** The open day's outline, when this cell is it. */
  ring?: string;
  onPress?: (day: string) => void;
}) {
  const fill = cellColor(cell);
  const edge = ring ?? (editable ? COLORS.accent : undefined);
  const style = {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 2,
    marginRight: gap,
    // A ringed day still waiting on an answer sits on the empty ground, so the
    // outline reads as a square and not as a gap.
    backgroundColor: ring && fill === 'transparent' ? COLORS.wallEmpty : fill,
    // An editable day is outlined rather than recoloured: the colour is the
    // answer, and a day you can still change has not got a different answer.
    borderWidth: ring ? 1.5 : editable ? 1 : 0,
    borderColor: edge ?? 'transparent',
  } as const;

  if (!editable || !onPress) return <View style={style} />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`change ${cell.day}`}
      onPress={() => onPress(cell.day)}
      style={style}
    />
  );
}

type WallProps = {
  weeks: WallWeek[];
  /**
   * `day` gives seven columns, one row per week — the calendar shape, right for
   * a small tile. `week` gives one column per week and seven rows, which is the
   * only way twelve weeks fit across a phone without the squares vanishing.
   */
  layout?: 'day' | 'week';
  gap?: number;
  /** Weekday initials down the left. Only ever on the wide `week` layout. */
  showWeekdays?: boolean;
  /** Days still open for a free edit — outlined, and the only tappable ones. */
  editable?: ReadonlySet<string>;
  onPressDay?: (day: string) => void;
  /** Outline one day — the one a habit card is still asking about. */
  ring?: { day: string; color: string };
  label: string;
};

export function Wall({
  weeks,
  layout = 'day',
  gap = 3,
  showWeekdays,
  editable,
  onPressDay,
  ring,
  label,
}: WallProps) {
  const rows = useMemo(() => {
    if (layout === 'day') return weeks.map((week) => week.cells);
    // Column-major: row `d` is every week's day `d`.
    return Array.from({ length: 7 }, (_, d) => weeks.map((week) => week.cells[d]));
  }, [weeks, layout]);

  return (
    <View accessibilityLabel={label}>
      {rows.map((cells, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: gap, alignItems: 'center' }}>
          {showWeekdays && (
            <Text
              className="text-[9px] text-muted-foreground"
              style={{ width: 14 }}
              // Only alternate labels, or the column becomes a wall of its own.
            >
              {index % 2 === 0 ? WEEKDAY_INITIALS[index] : ''}
            </Text>
          )}
          {cells.map((cell, cellIndex) => (
            <Cell
              key={cell?.day ?? cellIndex}
              cell={cell}
              gap={gap}
              editable={!!editable?.has(cell.day)}
              ring={ring && cell.day === ring.day ? ring.color : undefined}
              onPress={onPressDay}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** The key under the long wall on a habit's detail page. */
export function WallLegend() {
  const swatch = (color: string, key: string) => (
    <View key={key} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
  );
  return (
    <View className="mt-3 flex-row items-center gap-2">
      <Text className="text-[10px] text-muted-foreground">missed</Text>
      {swatch(COLORS.wallEmpty, 'missed')}
      {swatch('hsl(38 92% 50% / 0.2)', 'frozen')}
      {swatch('hsl(38 92% 50% / 0.55)', 'partial')}
      {swatch(COLORS.accent, 'held')}
      <Text className="text-[10px] text-muted-foreground">held</Text>
      <View className="flex-1" />
      {swatch(COLORS.wallRest, 'rest')}
      <Text className="text-[10px] text-muted-foreground">rest day</Text>
    </View>
  );
}
