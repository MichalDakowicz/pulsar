import { useRouter } from 'expo-router';
import { ArchiveRestore } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { EmptyState, LoadingState, SectionHeader } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { HabitCard } from '@/features/habits/HabitCard';
import { useArchiveHabit, useHabits } from '@/features/habits/useHabits';
import { useHabitBoard } from '@/features/habits/useHabitBoard';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * Every habit you have, live and archived.
 *
 * This screen exists because the source design did not have one: it offered
 * "archive this habit" on a detail page with no route to an archived habit
 * anywhere, which made archiving a one-way door and left restore impossible.
 * An archive you cannot open is a delete with extra steps.
 */
export default function HabitsScreen() {
  const router = useRouter();
  const { active, archived, loading } = useHabits();
  const board = useHabitBoard();
  const archive = useArchiveHabit();
  const { say } = useToast();
  const bottom = useNavBarSpace();
  const [showArchive, setShowArchive] = useState(false);

  const rowFor = (id: string) => board.rows.find((row) => row.habit.id === id);

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">your habits</Text>
          <Text className="mt-1.5 text-sm text-muted-foreground">
            {active.length === 0
              ? 'nothing running yet.'
              : `${active.length} running${archived.length > 0 ? ` · ${archived.length} archived` : ''}`}
          </Text>
        </View>

        {active.length === 0 ? (
          <EmptyState
            title="no habits running"
            body="start with one. the second is easier once the first has a streak you would rather not lose."
            action={{ label: 'build one', onPress: () => router.navigate('/habit/new') }}
          />
        ) : (
          <View className="mt-4 gap-2.5 px-4">
            {active.map((habit) => {
              const row = rowFor(habit.id);
              if (!row) return null;
              return (
                <HabitCard key={habit.id} row={row} onOpen={() => router.navigate(`/habit/${habit.id}`)} />
              );
            })}
          </View>
        )}

        {/* The archive section only exists when there is something in it. */}
        {archived.length > 0 && (
          <View className="mt-6 border-t border-border/50 px-4 pt-5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showArchive ? 'hide the archive' : `show ${archived.length} archived habits`}
              accessibilityState={{ expanded: showArchive }}
              onPress={() => setShowArchive((open) => !open)}
            >
              <SectionHeader title="archived" meta={showArchive ? 'hide' : `${archived.length}`} />
            </Pressable>
            {showArchive && (
              <View className="mt-3.5 gap-2">
                <Text className="text-xs text-muted-foreground">
                  an archived habit stops asking for anything and keeps its wall. restoring one picks up
                  where it left off, streak included.
                </Text>
                {archived.map((habit) => (
                  <View
                    key={habit.id}
                    className="flex-row items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5"
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`open ${habit.name}`}
                      onPress={() => router.navigate(`/habit/${habit.id}`)}
                      className="min-w-0 flex-1"
                    >
                      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                        {habit.name}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`restore ${habit.name}`}
                      hitSlop={8}
                      onPress={async () => {
                        await archive.mutateAsync({ id: habit.id, archived: false });
                        say(`${habit.name} is back. it asks again from today.`);
                      }}
                      className="flex-row items-center gap-1.5"
                    >
                      <ArchiveRestore size={15} color={COLORS.accent} />
                      <Text className="text-xs font-semibold text-primary">restore</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ContentShell>
    </ScrollView>
  );
}
