import { Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';

import { WEEKDAY_INITIALS } from '@/lib/dates';
import { COLORS } from '@/theme/colors';

/**
 * The two charts on Stats, and one bar list. Presentational only — every figure
 * arrives already computed (lib/wall), so a chart can never disagree with the
 * wall it was drawn from.
 */

/** Held-per-day bars for the current week. */
export function WeekBars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  return (
    <View className="mt-4 h-[96px] flex-row items-end justify-between gap-2">
      {values.map((value, index) => (
        <View key={index} className="flex-1 items-center gap-2">
          <View
            className="w-full rounded"
            style={{
              height: Math.max(4, (value / max) * 76),
              backgroundColor:
                value === max && value > 0 ? COLORS.accent : `hsl(38 92% 50% / ${(0.25 + (value / max) * 0.4).toFixed(2)})`,
            }}
          />
          <Text className="text-[10px] text-muted-foreground">{labels[index]}</Text>
        </View>
      ))}
    </View>
  );
}

const SIZE = 160;
const CENTRE = SIZE / 2;
const RADIUS = 64;

function point(index: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * index) / 7 - Math.PI / 2;
  return [CENTRE + Math.cos(angle) * RADIUS * value, CENTRE + Math.sin(angle) * RADIUS * value];
}

function polygon(values: number[] | number): string {
  const list = typeof values === 'number' ? new Array(7).fill(values) : values;
  return list.map((value, index) => point(index, value).map((n) => n.toFixed(1)).join(',')).join(' ');
}

/**
 * Held rate by weekday. The one question a shape like this answers well is
 * "which day of the week is where my streaks die", which is why the caption
 * names the worst day rather than leaving the reader to squint at a polygon.
 */
export function WeekdayShape({ values }: { values: number[] }) {
  const worst = values.reduce((low, value, index) => (value < values[low] ? index : low), 0);
  const anyData = values.some((value) => value > 0);

  return (
    <View className="items-center">
      <View style={{ width: 200, height: 200, marginTop: 16 }}>
        <Svg width={200} height={200} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: 'absolute', left: 20, top: 20, width: SIZE, height: SIZE }}>
          <Polygon points={polygon(1)} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
          <Polygon points={polygon(0.55)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
          {values.map((_, index) => {
            const [x, y] = point(index, 1);
            return (
              <Line
                key={index}
                x1={CENTRE}
                y1={CENTRE}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
            );
          })}
          <Polygon
            points={polygon(values)}
            fill="hsl(38 92% 50% / 0.22)"
            stroke={COLORS.accent}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
        {values.map((_, index) => {
          const [x, y] = point(index, 1.22);
          return (
            <Text
              key={index}
              className="absolute text-[10px] text-muted-foreground"
              style={{ left: x + 12, top: y + 12, width: 16, textAlign: 'center' }}
            >
              {WEEKDAY_INITIALS[index]}
            </Text>
          );
        })}
      </View>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        {anyData
          ? `${['mondays', 'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays', 'sundays'][worst]} are where your streaks die.`
          : 'not enough history to find your weak day yet.'}
      </Text>
    </View>
  );
}

/** Per-habit hit rate, as a bar list. */
export function ConsistencyBars({ rows }: { rows: { name: string; rate: number }[] }) {
  return (
    <View className="mt-4 gap-3">
      {rows.map((row) => (
        <View key={row.name}>
          <View className="flex-row items-baseline justify-between gap-2.5">
            <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
              {row.name}
            </Text>
            <Text className="text-xs text-muted-foreground">{row.rate}%</Text>
          </View>
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <View
              className="h-full rounded-full"
              style={{
                width: `${row.rate}%`,
                backgroundColor: row.rate > 80 ? COLORS.accent : 'hsl(38 92% 50% / 0.5)',
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
