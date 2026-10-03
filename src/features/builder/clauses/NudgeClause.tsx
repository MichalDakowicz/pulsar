import { View } from 'react-native';

import { Chip, Overline, SwitchRow } from '@/components/ui/controls';
import { Note, Question, type ClauseProps } from '@/features/builder/clauses/shared';
import { TIME_OPTIONS, toggleTime, withStepTime, withWindow } from '@/lib/builderEdits';
import { STEP_TIMES, stepNames } from '@/lib/steps';

/** When Pulsar pushes. A habit checked twice a day gets a time per check. */
export function NudgeClause({ state, apply, choose }: ClauseProps) {
  const multi = state.checksPerDay > 1;
  const off = state.window === 'anytime';

  return (
    <View className="gap-5">
      <Question>when should pulsar push?</Question>
      <View className="flex-row flex-wrap gap-2">
        <Chip label="no nudges" selected={off} onPress={() => choose((current) => withWindow(current, 'anytime'))} />
        {multi ? (
          <Chip label="one per check" selected={!off} onPress={() => apply((current) => withWindow(current, 'exact'))} />
        ) : (
          <>
            <Chip label="morning · 08:00" selected={state.window === 'morning'} onPress={() => choose((current) => withWindow(current, 'morning'))} />
            <Chip label="evening · 19:00" selected={state.window === 'evening'} onPress={() => choose((current) => withWindow(current, 'evening'))} />
            <Chip label="pick times" selected={state.window === 'exact'} onPress={() => apply((current) => withWindow(current, 'exact'))} />
          </>
        )}
      </View>

      {multi && !off && (
        <View className="gap-4">
          {stepNames(state.checksPerDay).map((step, index) => (
            <View key={step} className="gap-2.5">
              <Overline>{step}</Overline>
              <View className="flex-row flex-wrap gap-2">
                {STEP_TIMES[step].map((time) => (
                  <Chip
                    key={time}
                    label={time}
                    selected={state.times[index] === time}
                    onPress={() => apply((current) => withStepTime(current, index, time))}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {!multi && state.window === 'exact' && (
        <View className="gap-2.5">
          <Overline>tap to add or drop</Overline>
          <View className="flex-row flex-wrap gap-2">
            {TIME_OPTIONS.map((time) => (
              <Chip key={time} label={time} selected={state.times.includes(time)} onPress={() => apply((current) => toggleTime(current, time))} />
            ))}
          </View>
        </View>
      )}

      {/* Escalation needs something to escalate from. */}
      {!off && state.times.length > 0 && (
        <View className="rounded-xl border border-border px-3.5">
          <SwitchRow
            label="escalate if ignored"
            sub="a second nudge two hours later, and a last one with three hours left"
            value={state.escalate}
            onChange={(escalate) => apply((current) => ({ ...current, escalate }))}
          />
        </View>
      )}

      {off && <Note>no clock on this one. pulsar still counts the day, and still warns you before a streak goes.</Note>}
    </View>
  );
}
