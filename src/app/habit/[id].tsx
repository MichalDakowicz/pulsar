import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { EmptyState, LoadingState, SectionHeader } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { PactPanel } from '@/features/social/PactPanel';
import { Wall, WallLegend } from '@/features/habits/Wall';
import { useCheckIn } from '@/features/habits/useCheckIn';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { useArchiveHabit } from '@/features/habits/useHabits';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { formatDayShort } from '@/lib/dates';
import { challengeComplete, challengeLabel, dayProgress, habitMeta } from '@/lib/habit';
import { nextTier, tierProgress, tierRows } from '@/lib/tiers';
import { TOKEN_CAP, tokenWord } from '@/lib/tokens';
import { buildWall, wallRate } from '@/lib/wall';
import { COLORS } from '@/theme/colors';

const WEEKS = 12;

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const board = useHabitBoard();
  const checkIn = useCheckIn(board.perfectCount);
  const archive = useArchiveHabit();
  const { say } = useToast();
  const bottom = useNavBarSpace();
  const [dialog, setDialog] = useState<'freeze' | 'repair' | 'archive' | null>(null);
  const [repairDay, setRepairDay] = useState<string | null>(null);

  const row = board.rows.find((candidate) => candidate.habit.id === id) ?? null;

  const weeks = useMemo(() => {
    if (!row) return [];
    const progress: Record<string, number> = {};
    for (const [day, amount] of Object.entries(row.amounts)) {
      progress[day] = dayProgress(row.habit, amount);
    }
    return buildWall(row.entries, row.habit.cadence, {
      weeks: WEEKS,
      startedOn: row.habit.startedOn,
      progress,
    });
  }, [row]);

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
        <EmptyState
          title="that habit is gone"
          body="it was archived or deleted on another device."
          action={{ label: 'back to your habits', onPress: () => router.navigate('/habits') }}
        />
      </View>
    );
  }

  const { habit, streak } = row;
  const archived = !!habit.archivedAt;
  const canFreezeToday = !habit.hard && board.tokens > 0 && row.today === 'due' && !archived;
  const repairable = row.repairable;
  const canRepair = !habit.hard && board.tokens > 0 && repairable.length > 0 && !archived;
  const finished = challengeComplete(habit, streak.heldCount);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.detail}>
        <View className="flex-row items-center justify-end px-4 pt-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="edit this habit"
            hitSlop={8}
            onPress={() => router.navigate({ pathname: '/habit/edit', params: { id: habit.id } })}
          >
            <Text className="text-xs font-semibold text-muted-foreground">edit</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-4">
          <View className="flex-row flex-wrap gap-2">
            <StatusChip
              label={archived ? 'archived' : finished ? 'challenge cleared' : streak.current > 0 ? 'holding' : 'comeback'}
              tone={archived ? 'muted' : 'accent'}
            />
            {habit.hard && <StatusChip label="hard mode" tone="muted" />}
          </View>
          <Text className="mt-2.5 text-2xl font-bold leading-tight tracking-tight text-foreground">
            {habit.name}
          </Text>
          <Text className="mt-1.5 text-sm text-muted-foreground">{habitMeta(habit)}</Text>
          {!!habit.why.trim() && (
            <Text className="mt-2 text-sm text-muted-foreground">{habit.why.trim()}</Text>
          )}
        </View>

        <View className="flex-row items-center gap-4 px-4 pb-5 pt-5">
          <ProgressRing progress={tierProgress(streak.current)} size={116} stroke={8}>
            <Text className="text-2xl font-bold tracking-tight text-foreground">{streak.current}</Text>
            <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {streak.current === 1 ? 'day' : 'days'}
            </Text>
          </ProgressRing>
          <View className="min-w-0 flex-1 gap-3">
            <Figure label="next tier" value={`${nextTier(streak.current)} days`} />
            <Figure label="personal best" value={`${streak.best} days`} />
            <Figure label="hit rate" value={`${row.rate}%`} />
          </View>
        </View>

        {/* A finished challenge stops the app quietly counting past a run the
            user set an end to. Either extend it or let it stand. */}
        {finished && !archived && (
          <View className="mx-4 mb-5 rounded-xl border border-primary/35 bg-primary/10 p-4">
            <Text className="text-sm font-bold text-foreground">
              {challengeLabel(habit.challenge)} — done.
            </Text>
            <Text className="mt-1.5 text-xs text-muted-foreground">
              {streak.heldCount} days held. it keeps counting unless you archive it.
            </Text>
          </View>
        )}

        <View className="border-y border-border/50 px-4 py-5">
          <SectionHeader title="history" meta={`${WEEKS} weeks · ${wallRate(weeks)}%`} />
          <View className="mt-3.5">
            <Wall weeks={weeks} layout="week" gap={3} showWeekdays label={`${habit.name} history`} />
          </View>
          <WallLegend />
        </View>

        <View className="px-4 py-5">
          <SectionHeader title="the ladder" />
          <View className="mt-3.5 gap-2">
            {tierRows(streak.current).map((tier) => (
              <View
                key={tier.n}
                className={[
                  'flex-row items-center gap-3 rounded-xl border p-3',
                  tier.unlocked ? 'border-primary/40 bg-primary/10' : tier.live ? 'border-border' : 'border-border/50',
                ].join(' ')}
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: tier.unlocked ? COLORS.accent : COLORS.thumbGround }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: tier.unlocked ? COLORS.accentInk : tier.live ? '#fafafa' : COLORS.muted }}
                  >
                    {tier.n}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className={['text-sm font-bold', tier.unlocked || tier.live ? 'text-foreground' : 'text-muted-foreground'].join(' ')}
                  >
                    {tier.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {tier.unlocked ? 'cleared' : tier.live ? `${tier.remaining} days to go` : 'locked'}
                  </Text>
                </View>
                {tier.unlocked && <Check size={18} color={COLORS.accent} strokeWidth={2.6} />}
              </View>
            ))}
          </View>
        </View>

        {/* Commitment. Every control here is conditional on being able to do
            anything — hard mode removes freezes outright, and a repair with no
            missed day and no token is a button that can only ever say no. */}
        {!archived && (
          <View className="border-y border-border/50 px-4 py-5">
            <SectionHeader title="commitment" />
            <View className="mt-3.5 gap-2">
              {!!habit.pledge.trim() && (
                <View className="rounded-xl border border-border p-3.5">
                  <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    your word
                  </Text>
                  <Text className="mt-2 text-base font-semibold text-foreground">“{habit.pledge.trim()}”</Text>
                </View>
              )}

              {habit.hard ? (
                <View className="rounded-xl border border-border p-3.5">
                  <Text className="text-base font-bold text-foreground">hard mode</Text>
                  <Text className="mt-1.5 text-xs text-muted-foreground">
                    no freeze tokens, no repairs, one miss and it is over. turn it off in edit if that stops
                    being the deal you want.
                  </Text>
                </View>
              ) : (
                <View className="rounded-xl border border-border p-3.5">
                  <View className="flex-row items-baseline justify-between gap-2.5">
                    <Text className="text-base font-bold text-foreground">freeze tokens</Text>
                    <Text className="text-base font-bold text-primary">
                      {board.tokens}/{TOKEN_CAP}
                    </Text>
                  </View>
                  <Text className="my-2 text-xs text-muted-foreground">
                    one token holds a streak through one missed day. you earn one every 14 perfect days and
                    you cannot buy them.
                    {board.tokens < TOKEN_CAP && ` next one in ${board.tokensToNext} perfect days.`}
                  </Text>
                  {/* The button only exists while it could do something: today
                      still open, and a token to spend. */}
                  {canFreezeToday && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="freeze today"
                      onPress={() => setDialog('freeze')}
                      className="self-start rounded-full bg-primary px-4 py-2.5"
                    >
                      <Text className="text-sm font-semibold text-primary-foreground">freeze today</Text>
                    </Pressable>
                  )}
                  {!canFreezeToday && row.today === 'due' && board.tokens === 0 && (
                    <Text className="text-xs text-muted-foreground">
                      nothing to spend yet — {board.tokensToNext} perfect days to the first one.
                    </Text>
                  )}
                </View>
              )}

              {canRepair && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="repair a missed day"
                  onPress={() => {
                    setRepairDay(repairable[0]);
                    setDialog('repair');
                  }}
                  className="flex-row items-center gap-3 rounded-xl border border-border p-3.5"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-bold text-foreground">repair a missed day</Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDayShort(repairable[0])} · costs one token
                    </Text>
                  </View>
                  <ChevronRight size={18} color={COLORS.muted} />
                </Pressable>
              )}

              <PactPanel habit={habit} heldToday={row.today === 'held' || row.today === 'repaired'} />
            </View>
          </View>
        )}

        <View className="px-4 py-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={archived ? 'restore this habit' : 'archive this habit'}
            hitSlop={8}
            onPress={async () => {
              if (archived) {
                await archive.mutateAsync({ id: habit.id, archived: false });
                say(`${habit.name} is back. it asks again from today.`);
              } else {
                setDialog('archive');
              }
            }}
          >
            <Text
              className={['text-sm font-semibold', archived ? 'text-primary' : 'text-destructive-foreground'].join(' ')}
            >
              {archived ? 'restore this habit' : 'archive this habit'}
            </Text>
          </Pressable>
          <Text className="mt-1.5 text-xs text-muted-foreground">
            {archived
              ? 'it kept its wall while it was away.'
              : 'archiving stops it asking and keeps the wall. you can bring it back from the habits tab.'}
          </Text>
        </View>
      </ContentShell>

      <SheetDialog
        open={dialog === 'freeze'}
        title="spend a freeze token?"
        body={`the streak keeps counting and today stays empty on the wall. ${tokenWord(board.tokens - 1)} left after this.`}
        confirmLabel="freeze today"
        dismissLabel="keep the token"
        onConfirm={async () => {
          setDialog(null);
          await checkIn.freeze(habit);
        }}
        onDismiss={() => setDialog(null)}
      />

      <SheetDialog
        open={dialog === 'repair'}
        title={repairDay ? `repair ${formatDayShort(repairDay)}?` : 'repair a day?'}
        body={`that day fills in and the streak reads unbroken. it costs one token — ${tokenWord(board.tokens - 1)} left after this.`}
        confirmLabel="repair the day"
        dismissLabel="leave the gap"
        onConfirm={async () => {
          const day = repairDay;
          setDialog(null);
          if (day) await checkIn.repair(habit, day);
        }}
        onDismiss={() => setDialog(null)}
      >
        {repairable.length > 1 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {repairable.map((day) => (
              <Pressable
                key={day}
                accessibilityRole="radio"
                accessibilityState={{ selected: repairDay === day }}
                accessibilityLabel={formatDayShort(day)}
                onPress={() => setRepairDay(day)}
                className={[
                  'rounded-full border px-3 py-1.5',
                  repairDay === day ? 'border-primary bg-primary/15' : 'border-border',
                ].join(' ')}
              >
                <Text
                  className={['text-xs font-semibold', repairDay === day ? 'text-primary' : 'text-muted-foreground'].join(' ')}
                >
                  {formatDayShort(day)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </SheetDialog>

      <SheetDialog
        open={dialog === 'archive'}
        title={`archive ${habit.name}?`}
        body={`it stops asking from today and keeps its ${streak.heldCount} held days. you can restore it from the habits tab, streak included.`}
        confirmLabel="archive it"
        dismissLabel="keep it running"
        tone="destructive"
        onConfirm={async () => {
          setDialog(null);
          await archive.mutateAsync({ id: habit.id, archived: true });
          say(`${habit.name} archived. its wall is still in the habits tab.`);
          router.navigate('/habits');
        }}
        onDismiss={() => setDialog(null)}
      />
    </ScrollView>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="text-base font-bold text-foreground">{value}</Text>
    </View>
  );
}

function StatusChip({ label, tone }: { label: string; tone: 'accent' | 'muted' }) {
  return (
    <View
      className={[
        'rounded-full border px-2.5 py-1',
        tone === 'accent' ? 'border-primary/40 bg-primary/10' : 'border-border',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[10px] font-semibold uppercase tracking-widest',
          tone === 'accent' ? 'text-primary' : 'text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </Text>
    </View>
  );
}
