import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { HoldButton } from '@/components/ui/HoldButton';
import { Chip, Overline } from '@/components/ui/controls';
import { useToast } from '@/components/ui/Toast';
import { useCreateHabit } from '@/features/habits/useHabits';
import { blankBuilder, suggestedPledge, toHabitDraft } from '@/features/builder/useBuilder';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { MAX_W } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

const SUGGESTIONS = [
  'take meds',
  'stretch 10 min',
  'tidy one surface',
  'phone out of the bedroom',
  'walk after lunch',
  'lights out by 23:30',
];

const TIMES = ['07:00', '07:30', '08:00', '12:00', '19:00', '22:30'];

const TITLES = ['pick the first one', 'when does it happen?', 'now commit to it'];
const SUBS = [
  'one habit. you can add more once this one has a streak worth protecting.',
  'a time makes it a plan. pick anytime if this one has no clock.',
  'hold the button until the bar fills. nothing here costs money — the pledge is the whole stake, and pulsar reads it back to you on the night you are about to drop it.',
];

/**
 * First run. Three steps and it makes exactly one habit, because the fastest way
 * to never use a habit tracker is to set up six on the first evening.
 */
export default function Onboarding() {
  const router = useRouter();
  const { say } = useToast();
  const create = useCreateHabit();
  const { updateSettings } = useHabitSettings();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [time, setTime] = useState<string | null>('07:30');

  const finish = async (withHabit: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (withHabit && name) {
        const state = {
          ...blankBuilder(),
          name,
          window: time ? ('exact' as const) : ('anytime' as const),
          times: time ? [time] : [],
        };
        await create.mutateAsync(toHabitDraft({ ...state, pledge: suggestedPledge(state) }));
        say('committed. day one starts now.');
      }
    } catch (error) {
      // Saying nothing here is what makes the button look broken. Stay on the
      // step so the habit that was just built is not thrown away.
      say(error instanceof Error ? error.message : 'that did not save. try again in a moment.');
      setBusy(false);
      return;
    }

    // The stamp is a convenience, not a gate: someone who has seen the tour
    // should not see it again, but failing to record that must never strand
    // them on it. Fire and forget, and leave either way.
    void updateSettings({ onboardedAt: new Date().toISOString() }).catch(() => {});
    router.replace('/');
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="flex-row items-center gap-2.5 px-4 pt-4">
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              className="h-1.5 rounded-full"
              style={{
                width: index === step ? 20 : 6,
                backgroundColor: index === step ? COLORS.accent : 'rgba(255,255,255,0.14)',
              }}
            />
          ))}
        </View>

        <View className="flex-1 justify-center px-4 pt-5">
          <Text className="text-4xl font-bold leading-tight tracking-tight text-foreground">{TITLES[step]}</Text>
          <Text className="mt-3 text-sm text-muted-foreground">{SUBS[step]}</Text>

          {step === 0 && (
            <View className="mt-7 flex-row flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  selected={name === suggestion}
                  onPress={() => setName(suggestion)}
                />
              ))}
            </View>
          )}

          {step === 1 && (
            <View className="mt-7 gap-4">
              <View className="flex-row flex-wrap gap-2">
                {TIMES.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={time === option}
                    onPress={() => setTime(option)}
                  />
                ))}
                <Chip label="anytime" selected={time === null} onPress={() => setTime(null)} />
              </View>
              {time === null && (
                <Text className="text-xs text-muted-foreground">
                  no clock on this one — pulsar will count the day but will not remind you about it.
                </Text>
              )}
            </View>
          )}

          {step === 2 && (
            <View className="mt-7 gap-4">
              <View className="rounded-2xl border border-border p-4">
                <Overline>the pledge</Overline>
                <Text className="mt-2 text-base font-semibold text-foreground">
                  “{suggestedPledge({ ...blankBuilder(), name: name || 'this habit' })}”
                </Text>
              </View>
              <HoldButton
                label={busy ? 'starting it…' : 'hold to commit'}
                onComplete={() => void finish(true)}
                disabled={busy}
              />
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-2 px-4 pt-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step === 0 ? 'skip the tour' : 'back a step'}
            onPress={() => (step === 0 ? void finish(false) : setStep(step - 1))}
            className="rounded-full border border-border px-5 py-3.5"
          >
            <Text className="text-sm font-semibold text-muted-foreground">{step === 0 ? 'skip' : 'back'}</Text>
          </Pressable>

          {step === 2 ? null : (
            <View className="flex-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="next step"
                accessibilityState={{ disabled: step === 0 && !name }}
                onPress={() => {
                  if (step === 0 && !name) {
                    say('pick one to start with, or skip.');
                    return;
                  }
                  setStep(step + 1);
                }}
                className={['items-center rounded-full py-3.5', step === 0 && !name ? 'bg-secondary' : 'bg-primary'].join(' ')}
              >
                <Text
                  className={[
                    'text-sm font-bold',
                    step === 0 && !name ? 'text-muted-foreground' : 'text-primary-foreground',
                  ].join(' ')}
                >
                  next
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ContentShell>
    </ScrollView>
  );
}
