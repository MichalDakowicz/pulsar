import { Ban, Check, Hash, Timer } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { typeTags, type TagGlyph, type TypeTag } from '@/lib/habitType';
import { COLORS } from '@/theme/colors';
import type { Habit } from '@/types/habit';

type Typed = Pick<Habit, 'kind' | 'target' | 'unit' | 'cadence'> & Partial<Pick<Habit, 'targetPeriod' | 'checksPerDay'>>;

/** Two dots for a habit checked more than once a day. Lucide has no glyph that says "twice". */
function StepDots({ color }: { color: string }) {
  return (
    <View className="flex-row gap-[2px]">
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

function Glyph({ glyph, color }: { glyph: TagGlyph; color: string }) {
  if (glyph === 'steps') return <StepDots color={color} />;
  const Icon = glyph === 'count' ? Hash : glyph === 'timer' ? Timer : glyph === 'avoid' ? Ban : Check;
  return <Icon size={11} color={color} strokeWidth={2.6} />;
}

function Tag({ tag }: { tag: TypeTag }) {
  // A habit judged by the week is outlined in the accent rather than filled, so
  // a weekly habit and a daily one never read as the same kind of promise.
  const color = tag.week ? COLORS.accent : COLORS.foreground;
  return (
    <View
      className={[
        'flex-row items-center gap-1 rounded-full border px-2 py-[2px]',
        tag.week ? 'border-primary/55' : 'border-transparent bg-white/10',
      ].join(' ')}
    >
      {tag.glyph && <Glyph glyph={tag.glyph} color={color} />}
      <Text className={['text-[11px] font-semibold', tag.week ? 'text-primary' : 'text-foreground/85'].join(' ')} numberOfLines={1}>
        {tag.label}
      </Text>
    </View>
  );
}

/** What a habit logs and when it is judged, as two tags. */
export function TypeTags({ habit }: { habit: Typed }) {
  const [measure, rhythm] = typeTags(habit);
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-1">
      <Tag tag={measure} />
      <Tag tag={rhythm} />
    </View>
  );
}
