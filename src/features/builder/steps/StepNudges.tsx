import { Pressable, Text, View } from 'react-native';

import { Chip, Overline, SwitchRow } from '@/components/ui/controls';
import { TIME_OPTIONS, type StepProps } from '@/features/builder/steps/shared';
import { WINDOW_LABELS } from '@/lib/habit';
import type { NudgeWindow } from '@/types/habit';

/** Step 3 — the window, the times it implies, and escalation if it can apply. */
export function StepNudges({ state, set }: StepProps) {
  const hasClock = state.window !== 'anytime';

  return (
    <View className="gap-5 pt-5">
      <View className="gap-2.5">
        <Overline>window</Overline>
        <View className="flex-row flex-wrap gap-1.5">
          {(Object.keys(WINDOW_LABELS) as NudgeWindow[]).map((window) => {
            const active = state.window === window;
            return (
              <Pressable
                key={window}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={WINDOW_LABELS[window]}
                onPress={() => {
                  set('window', window);
                  // Switching to "anytime" drops the times outright rather than
                  // keeping them hidden — a reminder that still fires for a
                  // habit that says it has no clock is the worst kind of ghost.
                  if (window === 'anytime') set('times', []);
                  else if (state.times.length === 0) set('times', ['08:00']);
                }}
                className={[
                  'min-w-[47%] flex-1 items-center rounded-lg border py-2.5',
                  active ? 'border-primary bg-primary/10' : 'border-border',
                ].join(' ')}
              >
                <Text className={['text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>
                  {WINDOW_LABELS[window]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {hasClock ? (
        <>
          <View className="gap-2.5">
            <Overline>reminders · tap to add or drop</Overline>
            <View className="flex-row flex-wrap gap-2">
              {TIME_OPTIONS.map((time) => (
                <Chip
                  key={time}
                  label={time}
                  selected={state.times.includes(time)}
                  onPress={() =>
                    set(
                      'times',
                      state.times.includes(time)
                        ? state.times.filter((t) => t !== time)
                        : [...state.times, time].sort(),
                    )
                  }
                />
              ))}
            </View>
          </View>

          {/* Escalation needs something to escalate from. With no reminder set
              the switch would be a promise the app cannot keep. */}
          {state.times.length > 0 && (
            <View className="rounded-xl border border-border px-3.5">
              <SwitchRow
                label="escalate if ignored"
                sub="a second nudge two hours later, and a last one with three hours left"
                value={state.escalate}
                onChange={(value) => set('escalate', value)}
              />
            </View>
          )}
        </>
      ) : (
        <Text className="text-sm text-muted-foreground">
          no clock on this one. pulsar will not remind you about it — it will still count the day, and it
          will still tell you when a streak is about to go.
        </Text>
      )}
    </View>
  );
}
