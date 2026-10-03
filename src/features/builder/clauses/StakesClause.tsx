import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Chip, Field, Overline, SwitchRow } from '@/components/ui/controls';
import { Note, Question, type ClauseProps } from '@/features/builder/clauses/shared';
import { StrictnessScale } from '@/features/builder/clauses/StrictnessScale';
import { draftShape } from '@/lib/builder';
import { strictnessOf, withStrictness } from '@/lib/builderEdits';
import { strictnessCaption, suggestedPledge } from '@/lib/builderWords';
import { judgedByWeek, missLine } from '@/lib/habitType';
import { COLORS } from '@/theme/colors';
import type { Challenge } from '@/types/habit';

/**
 * What a miss is, what it costs, and the rest folded away. The miss comes first
 * because "strict" means nothing until it is clear what is being missed — a day,
 * a week, or the last glass of eight.
 */
export function StakesClause({ state, apply, canShare }: ClauseProps & { canShare: boolean }) {
  const [open, setOpen] = useState(false);
  const shape = draftShape(state);
  const level = strictnessOf(state);

  return (
    <View className="gap-5">
      <Question>how strict?</Question>
      <View className="gap-1.5 rounded-xl bg-white/5 px-3.5 py-3">
        <Overline>a miss here means</Overline>
        <Text className="text-base font-semibold leading-snug text-foreground">{missLine(shape)}</Text>
      </View>

      <View className="gap-3">
        <StrictnessScale value={level} onChange={(next) => apply((current) => withStrictness(current, next))} />
        <Note>{strictnessCaption(level, judgedByWeek(shape))}</Note>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="more: length, shelf, your word"
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center justify-between rounded-xl bg-white/5 px-3.5 py-3"
      >
        <Text className="text-sm font-semibold text-foreground">
          more <Text className="text-xs font-normal text-muted-foreground">— length · shelf · your word</Text>
        </Text>
        <View style={open ? { transform: [{ rotate: '180deg' }] } : null}>
          <ChevronDown size={16} color={COLORS.muted} />
        </View>
      </Pressable>

      {open && (
        <View className="gap-5">
          <View className="gap-2.5">
            <Overline>how long</Overline>
            <View className="flex-row flex-wrap gap-2">
              {(['open', '30', '66', '100'] as Challenge[]).map((challenge) => (
                <Chip
                  key={challenge}
                  label={challenge === 'open' ? 'open-ended' : `${challenge} days`}
                  selected={state.challenge === challenge}
                  onPress={() => apply((current) => ({ ...current, challenge }))}
                />
              ))}
            </View>
          </View>

          {/* The per-habit shelf switch means nothing while the profile shares
              nothing — it would promise a visibility the account has closed. */}
          {canShare ? (
            <View className="rounded-xl border border-border px-3.5">
              <SwitchRow
                label="on your shelf"
                sub="anyone who can see your profile sees this wall — not the words behind it"
                value={state.publicShelf}
                onChange={(publicShelf) => apply((current) => ({ ...current, publicShelf }))}
              />
            </View>
          ) : (
            <Text className="text-xs text-muted-foreground">your profile is private, so nothing here is shareable.</Text>
          )}

          <View className="gap-2.5">
            <Overline>your word</Overline>
            <Field
              value={state.pledge}
              onChangeText={(pledge) => apply((current) => ({ ...current, pledge }))}
              placeholder={suggestedPledge(state)}
              multiline
              numberOfLines={3}
              maxLength={240}
              accessibilityLabel="your pledge"
            />
            <Text className="text-xs text-muted-foreground">read back to you at 9pm on the night a streak is about to break.</Text>
          </View>

          <View className="gap-2.5">
            <Overline>why</Overline>
            <Field
              value={state.why}
              onChangeText={(why) => apply((current) => ({ ...current, why }))}
              placeholder="because the mornings i skip it are the bad ones"
              multiline
              numberOfLines={2}
              maxLength={200}
              accessibilityLabel="why this habit matters"
            />
          </View>
        </View>
      )}
    </View>
  );
}
