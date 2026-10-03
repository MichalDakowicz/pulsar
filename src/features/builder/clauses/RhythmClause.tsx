import { Pressable, Text, View } from 'react-native';

import { Chip, Overline } from '@/components/ui/controls';
import { Note, OptionTile, Question, type ClauseProps } from '@/features/builder/clauses/shared';
import { builderTarget } from '@/lib/builder';
import { RHYTHM_COPY, rhythmOf, rhythmOptions, withRhythm, type Rhythm } from '@/lib/builderEdits';
import { WEEKDAY_INITIALS } from '@/lib/dates';

/** An answer with nothing under it — the builder can move on by itself. */
const SETTLED: Rhythm[] = ['daily', 'weekdays'];

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** When it is due — the weekly total is one of the answers, not a second question. */
export function RhythmClause({ state, apply, choose }: ClauseProps) {
  const rhythm = rhythmOf(state);
  const cadence = state.cadence;

  return (
    <View className="gap-5">
      <Question>when is it due?</Question>
      <View className="flex-row flex-wrap gap-2">
        {rhythmOptions(state).map((option) => (
          <OptionTile
            key={option}
            label={RHYTHM_COPY[option].label}
            sub={RHYTHM_COPY[option].sub}
            active={rhythm === option}
            onPress={() => (SETTLED.includes(option) ? choose : apply)((current) => withRhythm(current, option))}
          />
        ))}
      </View>

      {cadence.kind === 'days' && rhythm !== 'total' && (
        <View className="flex-row justify-between">
          {WEEKDAY_INITIALS.map((initial, index) => {
            const on = cadence.days.includes(index);
            return (
              <Pressable
                key={index}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={DAY_NAMES[index]}
                onPress={() => {
                  const days = on ? cadence.days.filter((day) => day !== index) : [...cadence.days, index];
                  apply((current) => ({ ...current, cadence: { kind: 'days', days: days.sort() } }));
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
              onPress={() => choose((current) => ({ ...current, cadence: { kind: 'interval', every, anchor: '' } }))}
            />
          ))}
        </View>
      )}

      {cadence.kind === 'weekly' && (
        <View className="gap-2.5">
          <Overline>how many times</Overline>
          <View className="flex-row flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((perWeek) => (
              <Chip
                key={perWeek}
                label={perWeek === 1 ? 'once' : `${perWeek}×`}
                selected={cadence.perWeek === perWeek}
                onPress={() => choose((current) => ({ ...current, cadence: { kind: 'weekly', perWeek } }))}
              />
            ))}
          </View>
          <Text className="text-xs text-muted-foreground">any days. the week is what has to add up, so a quiet tuesday costs nothing.</Text>
        </View>
      )}

      {rhythm === 'total' && (
        <Note>
          {`${builderTarget(state)} ${state.kind === 'timer' ? 'min' : state.unit || '…'} a week, any days. a quiet tuesday costs nothing — one big day can carry the week. the number is under measure.`}
        </Note>
      )}
    </View>
  );
}
