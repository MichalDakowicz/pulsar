import { Ban, Check, Hash, Minus, Plus, Timer, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Chip, Overline, SwitchRow } from '@/components/ui/controls';
import { ChecksPicker } from '@/features/builder/clauses/ChecksPicker';
import { Note, Question, type ClauseProps } from '@/features/builder/clauses/shared';
import { UnitField } from '@/features/builder/clauses/UnitField';
import { isMeasured } from '@/lib/builder';
import { amountOptions, minuteOptions, withChecks, withKind } from '@/lib/builderEdits';
import { COLORS } from '@/theme/colors';
import type { HabitKind } from '@/types/habit';

const KINDS: { kind: HabitKind; label: string; icon: LucideIcon }[] = [
  { kind: 'do', label: 'check', icon: Check },
  { kind: 'count', label: 'count', icon: Hash },
  { kind: 'timer', label: 'time', icon: Timer },
  { kind: 'avoid', label: 'avoid', icon: Ban },
];

/** How a day is judged, and only the numbers that kind needs. */
export function MeasureClause({ state, apply, choose, editing, kindLocked }: ClauseProps) {
  const week = state.targetPeriod === 'week' && isMeasured(state.kind);
  const locked = kindLocked;

  return (
    <View className="gap-5">
      <Question>{week ? 'what adds up?' : 'how is a day judged?'}</Question>
      <View className="flex-row gap-1.5">
        {KINDS.map(({ kind, label, icon: Icon }) => {
          const active = state.kind === kind;
          return (
            <Pressable
              key={kind}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: locked && !active }}
              accessibilityLabel={label}
              disabled={locked && !active}
              onPress={() => (kind === 'avoid' ? choose : apply)((current) => withKind(current, kind))}
              className={[
                'flex-1 items-center gap-1.5 rounded-xl border py-3',
                active ? 'border-primary bg-primary/10' : 'border-border',
                locked && !active ? 'opacity-40' : '',
              ].join(' ')}
            >
              <Icon size={18} color={active ? COLORS.accent : COLORS.muted} strokeWidth={2.2} />
              <Text className={['text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {state.kind === 'do' && (
        <View className="gap-2.5">
          <Overline>how many times a day</Overline>
          <ChecksPicker
            checks={state.checksPerDay}
            named={state.checksNamed}
            onPick={(checks, named) => choose((current) => withChecks(current, checks, named))}
          />
          {state.checksPerDay > 1 && (
            <Text className="text-xs text-muted-foreground">
              each check keeps a streak of its own. the day is only full once all {state.checksPerDay} are in.
              {editing ? ' saving asks how far back the change reaches.' : ''}
            </Text>
          )}
        </View>
      )}

      {state.kind === 'count' && (
        <View className="gap-2.5">
          <Overline>{week ? 'how many a week' : 'how many a day'}</Overline>
          <View className="flex-row flex-wrap items-center gap-2">
            {amountOptions(state).map((amount) => (
              <Chip
                key={amount}
                label={String(amount)}
                selected={state.amount === amount}
                onPress={() => apply((current) => ({ ...current, amount }))}
              />
            ))}
            <Stepper
              onLess={() => apply((current) => ({ ...current, amount: Math.max(1, current.amount - 1) }))}
              onMore={() => apply((current) => ({ ...current, amount: Math.min(999, current.amount + 1) }))}
            />
          </View>
          <Overline className="mt-2">of what</Overline>
          <UnitField unit={state.unit} onChange={(unit) => apply((current) => ({ ...current, unit }))} />
        </View>
      )}

      {state.kind === 'timer' && (
        <View className="gap-2.5">
          <Overline>{week ? 'minutes a week' : 'minutes a day'}</Overline>
          <View className="flex-row flex-wrap gap-2">
            {minuteOptions(state).map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes} min`}
                selected={state.minutes === minutes}
                onPress={() => choose((current) => ({ ...current, minutes }))}
              />
            ))}
          </View>
        </View>
      )}

      {isMeasured(state.kind) && (
        <View className="rounded-xl border border-border px-3.5">
          <SwitchRow
            label="let it run past the target"
            sub="off, it stops at the target — done is done. on, it keeps taking more and shows the surplus."
            value={state.allowExceed}
            onChange={(allowExceed) => apply((current) => ({ ...current, allowExceed }))}
          />
        </View>
      )}

      {state.kind === 'avoid' && (
        <Note>a clean day is the win. log a slip when it happens; a day with nothing logged counts as held.</Note>
      )}
    </View>
  );
}

function Stepper({ onLess, onMore }: { onLess: () => void; onMore: () => void }) {
  return (
    <View className="flex-row gap-1">
      <Pressable accessibilityRole="button" accessibilityLabel="one fewer" onPress={onLess} className="h-8 w-9 items-center justify-center rounded-full bg-secondary">
        <Minus size={15} color={COLORS.foreground} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="one more" onPress={onMore} className="h-8 w-9 items-center justify-center rounded-full bg-secondary">
        <Plus size={15} color={COLORS.foreground} />
      </Pressable>
    </View>
  );
}
