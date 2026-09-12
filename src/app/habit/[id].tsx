import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { EmptyState, LoadingState, SectionHeader } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { CommitmentSection } from '@/features/habits/CommitmentSection';
import { TierLadder } from '@/features/habits/TierLadder';
import { Wall, WallLegend } from '@/features/habits/Wall';
import { useCheckIn } from '@/features/habits/useCheckIn';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { useArchiveHabit } from '@/features/habits/useHabits';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { formatDayShort } from '@/lib/dates';
import { challengeComplete, challengeLabel, dayProgress, habitMeta } from '@/lib/habit';
import { nextTier, tierProgress } from '@/lib/tiers';
import { tokenWord } from '@/lib/tokens';
import { buildWall, wallRate } from '@/lib/wall';

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

        <TierLadder streak={streak.current} />

        {/* Hidden entirely on an archived habit: there is nothing left to
            commit to, and every control in it would be inert. */}
        {!archived && (
          <CommitmentSection
            row={row}
            tokens={board.tokens}
            tokensToNext={board.tokensToNext}
            onFreeze={() => setDialog('freeze')}
            onRepair={(day) => {
              setRepairDay(day);
              setDialog('repair');
            }}
          />
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
        {row.repairable.length > 1 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {row.repairable.map((day) => (
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
