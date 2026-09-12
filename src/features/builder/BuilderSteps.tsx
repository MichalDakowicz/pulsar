import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { MARKS, Mark } from '@/components/marks';
import { Chip, Field, Overline, SwitchRow } from '@/components/ui/controls';
import {
  RULE_LABELS,
  RULE_SUBS,
  suggestedPledge,
  type BuilderState,
} from '@/features/builder/useBuilder';
import { KIND_LABELS, WINDOW_LABELS } from '@/lib/habit';
import { WEEKDAY_INITIALS } from '@/lib/dates';
import type { StreakRule } from '@/lib/streak';
import type { Challenge, HabitKind, NudgeWindow } from '@/types/habit';
import { COLORS } from '@/theme/colors';

type StepProps = {
  state: BuilderState;
  set: <K extends keyof BuilderState>(key: K, value: BuilderState[K]) => void;
};

const TIME_OPTIONS = ['07:00', '07:30', '08:00', '12:00', '17:30', '19:00', '21:00', '22:30'];

/** Step 1 — the name, how it is judged, and the mark. */
export function StepHabit({ state, set }: StepProps) {
  return (
    <View className="gap-5 pt-5">
      <Field
        value={state.name}
        onChangeText={(value) => set('name', value)}
        placeholder="walk after lunch"
        maxLength={60}
        accessibilityLabel="habit name"
      />

      <View className="gap-2.5">
        <Overline>how it is judged</Overline>
        <View className="flex-row flex-wrap gap-1.5">
          {(Object.keys(KIND_LABELS) as HabitKind[]).map((kind) => {
            const active = state.kind === kind;
            return (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={KIND_LABELS[kind].label}
                onPress={() => set('kind', kind)}
                className={[
                  'min-w-[47%] flex-1 rounded-lg border px-3 py-2.5',
                  active ? 'border-primary bg-primary/10' : 'border-border',
                ].join(' ')}
              >
                <Text className={['text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>
                  {KIND_LABELS[kind].label}
                </Text>
                <Text className="text-[11px] text-muted-foreground">{KIND_LABELS[kind].sub}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2.5">
        <Overline>its mark</Overline>
        <View className="flex-row flex-wrap gap-2">
          {MARKS.map((mark) => {
            const active = state.mark === mark.key;
            return (
              <Pressable
                key={mark.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${mark.key} mark`}
                onPress={() => set('mark', mark.key)}
                className={['h-11 w-11 items-center justify-center rounded-lg', active ? 'bg-primary' : 'bg-secondary'].join(' ')}
              >
                <Mark mark={mark.key} size={20} color={active ? COLORS.accentInk : COLORS.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2.5">
        <Overline>why (pulsar reads this back at you)</Overline>
        <Field
          value={state.why}
          onChangeText={(value) => set('why', value)}
          placeholder="because the mornings i skip it are the bad ones"
          multiline
          numberOfLines={2}
          maxLength={200}
          accessibilityLabel="why this habit matters"
        />
      </View>
    </View>
  );
}

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

/** Step 4 — what a miss costs. Streak rule, hard mode, and who can see it. */
export function StepCommitment({ state, set, canShare }: StepProps & { canShare: boolean }) {
  return (
    <View className="gap-5 pt-5">
      <View className="gap-2.5">
        <Overline>what a miss does</Overline>
        {/* Hard mode owns the rule, so the picker disappears rather than sitting
            there being overridden. */}
        {state.hard ? (
          <Text className="text-sm text-muted-foreground">
            hard mode is on, so this one is strict: a miss ends it, and no freeze token can save it.
          </Text>
        ) : (
          <View className="gap-2">
            {(['strict', 'grace', 'decay'] as StreakRule[]).map((rule) => {
              const active = state.rule === rule;
              return (
                <Pressable
                  key={rule}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={RULE_LABELS[rule]}
                  onPress={() => set('rule', rule)}
                  className={[
                    'rounded-xl border px-3.5 py-3',
                    active ? 'border-primary bg-primary/10' : 'border-border',
                  ].join(' ')}
                >
                  <Text className="text-sm font-bold text-foreground">{RULE_LABELS[rule]}</Text>
                  <Text className="text-xs text-muted-foreground">{RULE_SUBS[rule]}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View className="rounded-xl border border-border px-3.5">
        <SwitchRow
          label="hard mode"
          sub="no freeze tokens on this habit, and a miss is always strict"
          value={state.hard}
          onChange={(value) => set('hard', value)}
        />
      </View>

      {/* The per-habit shelf switch is meaningless while the shared privacy
          setting is "no one" — it would promise a visibility the account-level
          switch has already closed. */}
      {canShare ? (
        <View className="rounded-xl border border-border px-3.5">
          <SwitchRow
            label="on your shelf"
            sub="anyone who can see your profile sees this wall — not the note behind it"
            value={state.publicShelf}
            onChange={(value) => set('publicShelf', value)}
          />
        </View>
      ) : (
        <Text className="text-xs text-muted-foreground">
          your profile is set to private, so nothing here is shareable. change it in settings if you want a
          habit on your shelf.
        </Text>
      )}

      <View className="gap-2.5">
        <Overline>your word</Overline>
        <Field
          value={state.pledge}
          onChangeText={(value) => set('pledge', value)}
          placeholder={suggestedPledge(state)}
          multiline
          numberOfLines={3}
          maxLength={240}
          accessibilityLabel="your pledge"
        />
        <Text className="text-xs text-muted-foreground">
          nothing in pulsar costs money. this sentence is the whole stake, and it is the thing you get shown
          at 9pm on the night you are about to drop it.
        </Text>
      </View>
    </View>
  );
}
