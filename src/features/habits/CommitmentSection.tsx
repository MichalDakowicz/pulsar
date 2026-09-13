import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/states';
import type { BoardHabit } from '@/features/habits/useHabitBoard';
import { PactPanel } from '@/features/social/PactPanel';
import { formatDayShort } from '@/lib/dates';
import { TOKEN_CAP } from '@/lib/tokens';
import { COLORS } from '@/theme/colors';

type CommitmentSectionProps = {
  row: BoardHabit;
  tokens: number;
  tokensToNext: number;
  onFreeze: () => void;
  onRepair: (day: string) => void;
};

/**
 * What this habit costs to drop: your own words, the freeze balance, a repair,
 * and the pact if there is one.
 *
 * Every control is conditional on being able to do something. Hard mode removes
 * freezes and repairs outright rather than greying them out; the freeze button
 * needs both a token and an unresolved day; the repair row needs a missed day
 * inside the window. A button whose only possible answer is "no" is worse than
 * no button, because it teaches you that pressing things here does nothing.
 */
export function CommitmentSection({ row, tokens, tokensToNext, onFreeze, onRepair }: CommitmentSectionProps) {
  const { habit } = row;
  const held = row.today === 'held' || row.today === 'repaired';
  const canFreezeToday = !habit.hard && tokens > 0 && row.today === 'due';
  const canRepair = !habit.hard && tokens > 0 && row.repairable.length > 0;

  return (
    <View className="border-y border-border/50 px-4 py-5">
      <SectionHeader title="commitment" />
      <View className="mt-3.5 gap-2">
        {!!habit.pledge.trim() && (
          <View className="rounded-xl border border-border p-3.5">
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              your word
            </Text>
            <Text className="mt-2 text-base font-semibold text-foreground">“{habit.pledge.trim()}”</Text>
          </View>
        )}

        {habit.hard ? (
          <View className="rounded-xl border border-border p-3.5">
            <Text className="text-base font-bold text-foreground">hard mode</Text>
            <Text className="mt-1.5 text-xs text-muted-foreground">
              no freeze tokens, no repairs, one miss and it is over. turn it off in edit if that stops being
              the deal you want.
            </Text>
          </View>
        ) : (
          <View className="rounded-xl border border-border p-3.5">
            <View className="flex-row items-baseline justify-between gap-2.5">
              <Text className="text-base font-bold text-foreground">freeze tokens</Text>
              <Text className="text-base font-bold text-primary">
                {tokens}/{TOKEN_CAP}
              </Text>
            </View>
            <Text className="my-2 text-xs text-muted-foreground">
              one token holds a streak through one missed day. you earn one every 14 perfect days and you
              cannot buy them.
              {tokens < TOKEN_CAP && ` next one in ${tokensToNext} perfect days.`}
            </Text>
            {canFreezeToday && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="freeze today"
                onPress={onFreeze}
                className="self-start rounded-full bg-primary px-4 py-2.5"
              >
                <Text className="text-sm font-semibold text-primary-foreground">freeze today</Text>
              </Pressable>
            )}
            {!canFreezeToday && row.today === 'due' && tokens === 0 && (
              <Text className="text-xs text-muted-foreground">
                nothing to spend yet — {tokensToNext} perfect days to the first one.
              </Text>
            )}
          </View>
        )}

        {canRepair && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="repair a missed day"
            onPress={() => onRepair(row.repairable[0])}
            className="flex-row items-center gap-3 rounded-xl border border-border p-3.5"
          >
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-foreground">repair a missed day</Text>
              <Text className="text-xs text-muted-foreground">
                {formatDayShort(row.repairable[0])} · costs one token
              </Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </Pressable>
        )}

        <PactPanel habit={habit} heldToday={held} />
      </View>
    </View>
  );
}
