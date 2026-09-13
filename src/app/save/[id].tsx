import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useCheckIn } from '@/features/habits/useCheckIn';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { formatCountdown } from '@/lib/dates';
import { tokenWord } from '@/lib/tokens';
import { COLORS } from '@/theme/colors';

/**
 * The streak-save moment.
 *
 * Three options, and the third one — letting it break — is deliberately on the
 * screen. An app that will not let you say "this one is over" is an app that
 * makes you lie to it instead, and a wall full of lies is worth nothing. What it
 * does do is read your own pledge back at you first.
 */
export default function SaveStreak() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const board = useHabitBoard();
  const checkIn = useCheckIn(board.perfectCount);
  const bottom = useNavBarSpace();
  const [dialog, setDialog] = useState<'freeze' | 'break' | null>(null);

  const row = board.rows.find((candidate) => candidate.habit.id === id) ?? null;

  if (board.loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  if (!row) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <EmptyState title="nothing to save" body="that habit is gone." action={{ label: 'back to today', onPress: () => router.navigate('/') }} />
      </View>
    );
  }

  const { habit, streak } = row;

  // Arriving here after the day is already resolved should not show a rescue
  // screen for a streak that is not in danger.
  if (row.today !== 'due') {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <EmptyState
          title="already safe"
          body={`${habit.name} is settled for today. the streak is not going anywhere.`}
          action={{ label: 'back to today', onPress: () => router.navigate('/') }}
        />
      </View>
    );
  }

  const canFreeze = !habit.hard && board.tokens > 0;
  const elapsed = Math.min(100, Math.max(0, ((24 - board.hoursLeft) / 24) * 100));

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: 'hsl(0 0% 3.9%)' }}
      contentContainerStyle={{ paddingBottom: bottom, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.form}>
        <View className="px-4 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="not now"
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Text className="text-sm font-semibold text-muted-foreground">not now</Text>
          </Pressable>
        </View>

        <View className="flex-1 justify-center px-4 py-6">
          <View className="flex-row items-center gap-2">
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: COLORS.danger }} />
            <Text className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#fca5a5' }}>
              streak at risk
            </Text>
          </View>

          <Text className="mt-3.5 text-4xl font-bold leading-tight tracking-tight text-foreground">
            {streak.current} days end in {formatCountdown(board.hoursLeft)}
          </Text>
          <Text className="mt-3 text-sm text-muted-foreground">
            {habit.name}. after midnight it goes back to
            {habit.hard || habit.rule === 'strict'
              ? ' zero'
              : habit.rule === 'decay'
                ? ` ${Math.max(0, streak.current - 3)}`
                : ' zero, unless this is your one forgiven miss this week'}
            .
          </Text>

          {/* Your own words, from the night you set it up. This is the whole
              stake in this app — there is no money in it and never was. */}
          {!!habit.pledge.trim() && (
            <View className="mt-6 rounded-2xl border border-border p-4">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                what you said
              </Text>
              <Text className="mt-2 text-base font-semibold text-foreground">“{habit.pledge.trim()}”</Text>
              {!!habit.why.trim() && (
                <Text className="mt-2 text-xs text-muted-foreground">{habit.why.trim()}</Text>
              )}
            </View>
          )}

          <View className="mt-7">
            <View className="flex-row items-baseline justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                day gone
              </Text>
              <Text className="text-xs font-semibold" style={{ color: '#fca5a5' }}>
                {formatCountdown(board.hoursLeft)} left
              </Text>
            </View>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <View className="h-full rounded-full bg-primary" style={{ width: `${elapsed}%` }} />
            </View>
          </View>

          <View className="mt-8 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="i did it, check in now"
              onPress={async () => {
                await checkIn.hold(habit, streak.current + 1, habit.target);
                router.navigate('/');
              }}
              className="items-center rounded-full bg-primary py-4"
            >
              <Text className="text-sm font-bold text-primary-foreground">i did it — check in now</Text>
            </Pressable>

            {/* No freeze button when there is no token to spend or the habit
                refuses them; the reason is stated underneath instead. */}
            {canFreeze ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`spend a freeze token, ${board.tokens} left`}
                onPress={() => setDialog('freeze')}
                className="items-center rounded-full border border-border py-4"
              >
                <Text className="text-sm font-semibold text-foreground">
                  spend a freeze token · {board.tokens} left
                </Text>
              </Pressable>
            ) : (
              <Text className="py-1 text-center text-xs text-muted-foreground">
                {habit.hard
                  ? 'hard mode — no freeze token can save this one.'
                  : `no tokens. the next one lands after ${board.tokensToNext} more perfect days.`}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="let it break"
              onPress={() => setDialog('break')}
              className="items-center py-4"
            >
              <Text className="text-sm font-semibold text-destructive-foreground">let it break</Text>
            </Pressable>
          </View>
        </View>
      </ContentShell>

      <SheetDialog
        open={dialog === 'freeze'}
        title="freeze tonight?"
        body={`the ${streak.current}-day streak holds and today stays empty on the wall. ${tokenWord(board.tokens - 1)} left after this.`}
        confirmLabel="spend one token"
        dismissLabel="not yet"
        onConfirm={async () => {
          setDialog(null);
          await checkIn.freeze(habit);
          router.navigate('/');
        }}
        onDismiss={() => setDialog(null)}
      />

      <SheetDialog
        open={dialog === 'break'}
        title={`let ${streak.current} days go?`}
        body="the day is marked as missed and the count resets under whatever rule you set. your best is kept, and the wall keeps every day you did hold."
        confirmLabel="let it break"
        dismissLabel="keep fighting for it"
        tone="destructive"
        onConfirm={() => {
          setDialog(null);
          // Nothing is written: a missed day is the *absence* of an entry, and
          // inventing a "missed" row to record a decision would put a lie in the
          // ledger. The streak walker sees an empty day once midnight passes.
          router.navigate('/');
        }}
        onDismiss={() => setDialog(null)}
      />
    </ScrollView>
  );
}
