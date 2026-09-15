import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Chip, Overline } from '@/components/ui/controls';
import type { StepProps } from '@/features/builder/steps/shared';
import { WEEKDAY_INITIALS } from '@/lib/dates';
import type { Challenge } from '@/types/habit';

/** Step 2 — cadence, and the target controls only the chosen kind needs. */
export function StepTarget({ state, set }: StepProps) {
  const cadence = state.cadence;

  return (
    <View className="gap-5 pt-5">
      <View className="gap-2.5">
        <Overline>cadence</Overline>
        <View className="flex-row flex-wrap gap-1.5">
          {(
            [
              { kind: 'daily' as const, label: 'every day' },
              { kind: 'weekdays' as const, label: 'weekdays' },
              { kind: 'days' as const, label: 'pick days' },
              { kind: 'interval' as const, label: 'every n days' },
              { kind: 'weekly' as const, label: 'n times a week' },
            ]
          ).map((option) => {
            const active = cadence.kind === option.kind;
            return (
              <Pressable
                key={option.kind}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                onPress={() => {
                  if (option.kind === 'days') set('cadence', { kind: 'days', days: [0, 1, 2, 3, 4] });
                  else if (option.kind === 'interval') set('cadence', { kind: 'interval', every: 2, anchor: '' });
                  else if (option.kind === 'weekly') set('cadence', { kind: 'weekly', perWeek: 3 });
                  else set('cadence', { kind: option.kind });
                }}
                className={[
                  'min-w-[47%] flex-1 items-center rounded-lg border py-2.5',
                  active ? 'border-primary bg-primary/10' : 'border-border',
                ].join(' ')}
              >
                <Text className={['text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* The day toggles and the interval chips are mutually exclusive and both
          are meaningless under the other two cadences, so only one can ever be
          on screen. */}
      {cadence.kind === 'days' && (
        <View className="flex-row justify-between">
          {WEEKDAY_INITIALS.map((initial, index) => {
            const on = cadence.days.includes(index);
            return (
              <Pressable
                key={index}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index]}`}
                onPress={() => {
                  const days = on ? cadence.days.filter((d) => d !== index) : [...cadence.days, index];
                  set('cadence', { kind: 'days', days: days.sort() });
                }}
                className={['h-10 w-10 items-center justify-center rounded-full', on ? 'bg-primary' : 'bg-secondary'].join(' ')}
              >
                <Text className={['text-sm font-bold', on ? 'text-primary-foreground' : 'text-muted-foreground'].join(' ')}>
                  {initial}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {cadence.kind === 'interval' && (
        <View className="flex-row flex-wrap gap-2">
          {[2, 3, 4, 7].map((every) => (
            <Chip
              key={every}
              label={every === 2 ? 'every other day' : `every ${every} days`}
              selected={cadence.every === every}
              onPress={() => set('cadence', { kind: 'interval', every, anchor: '' })}
            />
          ))}
        </View>
      )}

      {cadence.kind === 'weekly' && (
        <View className="gap-2.5">
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((perWeek) => (
              <Chip
                key={perWeek}
                label={perWeek === 1 ? 'once a week' : `${perWeek} times`}
                selected={cadence.perWeek === perWeek}
                onPress={() => set('cadence', { kind: 'weekly', perWeek })}
              />
            ))}
          </View>
          {/* The one cadence where an empty day means nothing, so it is worth
              saying out loud before someone commits to it. */}
          <Text className="text-xs text-muted-foreground">
            any days you like. the week is what has to add up, so a quiet tuesday costs nothing.
          </Text>
        </View>
      )}

      {state.kind === 'count' && (
        <View className="gap-3">
          <Overline>daily target</Overline>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="one fewer"
              onPress={() => set('amount', Math.max(1, state.amount - 1))}
              className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
            >
              <Minus size={18} color="#fafafa" />
            </Pressable>
            <Text className="min-w-[48px] text-center text-3xl font-bold tracking-tight text-foreground">
              {state.amount}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="one more"
              onPress={() => set('amount', Math.min(99, state.amount + 1))}
              className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
            >
              <Plus size={18} color="#fafafa" />
            </Pressable>
            <Text className="flex-1 text-sm text-muted-foreground">{state.unit} a day</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {['glasses', 'pages', 'reps', 'ml', 'times'].map((unit) => (
              <Chip key={unit} label={unit} selected={state.unit === unit} onPress={() => set('unit', unit)} />
            ))}
          </View>
        </View>
      )}

      {state.kind === 'timer' && (
        <View className="gap-2.5">
          <Overline>minutes a day</Overline>
          <View className="flex-row flex-wrap gap-2">
            {[5, 10, 20, 45].map((minutes) => (
              <Chip
                key={minutes}
                label={`${minutes} min`}
                selected={state.minutes === minutes}
                onPress={() => set('minutes', minutes)}
              />
            ))}
          </View>
        </View>
      )}

      <View className="gap-2.5">
        <Overline>how long</Overline>
        <View className="flex-row flex-wrap gap-2">
          {(['open', '30', '66', '100'] as Challenge[]).map((challenge) => (
            <Chip
              key={challenge}
              label={challenge === 'open' ? 'open-ended' : `${challenge} days`}
              selected={state.challenge === challenge}
              onPress={() => set('challenge', challenge)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
