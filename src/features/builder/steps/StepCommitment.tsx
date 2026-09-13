import { Pressable, Text, View } from 'react-native';

import { Field, Overline, SwitchRow } from '@/components/ui/controls';
import type { StepProps } from '@/features/builder/steps/shared';
import { RULE_LABELS, RULE_SUBS, suggestedPledge } from '@/features/builder/useBuilder';
import type { StreakRule } from '@/lib/streak';

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
