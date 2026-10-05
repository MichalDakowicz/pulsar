import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ContentShell } from "@/components/layout/ContentShell";
import { ScreenTop } from "@/components/layout/ScreenTop";
import { Segmented } from "@/components/ui/controls";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader,
  Stat,
} from "@/components/ui/states";
import { RiskBanner } from "@/features/habits/RiskBanner";
import { SiblingStreaks } from "@/features/habits/SiblingStreaks";
import { TodayCard } from "@/features/habits/TodayCard";
import { heroCopy, TodayHero } from "@/features/habits/TodayHero";
import { useCheckIn } from "@/features/habits/useCheckIn";
import { nextDueLabel, useHabitBoard } from "@/features/habits/useHabitBoard";
import { useHabitSettings } from "@/hooks/useHabitSettings";
import { useNavBarSpace } from "@/hooks/useNavBarSpace";
import { MAX_W } from "@/hooks/useResponsive";
import { addDays, dateKey, formatDayLong } from "@/lib/dates";
import { dayTabLabel, todayHint } from "@/lib/habit";
import { readError } from "@/lib/utils";

/**
 * Today. The only screen that has to work in four seconds while standing up, so
 * it is check-in first and everything else after.
 */
export default function TodayScreen() {
  const router = useRouter();
  const board = useHabitBoard();
  const { settings } = useHabitSettings();
  const checkIn = useCheckIn(board.rows);
  const bottom = useNavBarSpace();
  const [showResting, setShowResting] = useState(false);
  // Which day the list is showing. Today always; yesterday only once there is
  // an avoid habit to put in it, so the switch never offers an empty side.
  const [day, setDay] = useState<"today" | "yesterday">("today");

  const copy = useMemo(
    () =>
      heroCopy({
        due: board.dueCount,
        done: board.doneCount,
        riskStreak: board.atRisk?.streak.current ?? null,
        riskName: board.atRisk?.habit.name ?? null,
        restCount: board.resting.length,
      }),
    [board.dueCount, board.doneCount, board.atRisk, board.resting.length],
  );

  if (board.loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  // A failed read is not an empty account. Saying "no habits yet" over a
  // database that never answered is the lie that sends someone off to rebuild
  // habits they already have.
  if (board.error) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <ErrorState message={readError(board.error)} />
      </View>
    );
  }

  const nothingAtAll = board.rows.length === 0;
  const hasYesterday = board.yesterdayTab.rows.length > 0;
  // The switch is dropped the moment its second side empties — an avoid habit
  // archived while yesterday was on screen must not leave the list stuck on a
  // day that no longer has anything in it.
  const showing = hasYesterday ? day : "today";
  const tab = showing === "yesterday" ? board.yesterdayTab : board.todayTab;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="flex-row items-baseline justify-between px-4 pt-2.5">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {formatDayLong(dateKey())}
          </Text>
        </View>

        {nothingAtAll ? (
          <EmptyState
            title="nothing to hold yet"
            body="one habit is the right number to start with. you can add the rest once this one has a streak worth protecting."
            action={{
              label: "build the first one",
              onPress: () => router.navigate("/habit/new"),
            }}
          />
        ) : (
          <>
            <TodayHero
              done={board.doneCount}
              due={board.dueCount}
              copy={copy}
            />

            <View className="flex-row gap-2 px-4 pb-4 pt-3.5">
              <Stat label="longest live" value={`${board.longestLive}d`} />
              <Stat label="perfect days" value={String(board.perfectCount)} />
            </View>

            {board.atRisk && settings.riskAlerts && (
              <RiskBanner
                name={board.atRisk.habit.name}
                streak={board.atRisk.streak.current}
                hoursLeft={board.hoursLeft}
                onPress={() =>
                  router.navigate(`/save/${board.atRisk!.habit.id}`)
                }
              />
            )}

            <SiblingStreaks />

            <View className="border-y border-border/50 px-4 py-5">
              <SectionHeader
                title={showing === "yesterday" ? "yesterday" : "today"}
                // The hint describes the gesture that is actually wired up, for
                // the day on screen. Once everything is checked off the only
                // gesture left is the one that takes it back, so the hint
                // becomes that rather than vanishing — which is when people
                // most want it.
                meta={todayHint(settings.checkinMode, tab.open, tab.undoable)}
              />

              {/* The switch only appears once there is a second day to show. An
                  account with no avoid habit never had a yesterday, and a tab
                  that is always empty is a tab that teaches people to ignore
                  the row of tabs. */}
              {hasYesterday && (
                <View className="mt-3.5">
                  <Segmented<"today" | "yesterday">
                    label="which day to answer"
                    value={showing}
                    onChange={setDay}
                    options={[
                      {
                        value: "today",
                        label: dayTabLabel("today", board.todayTab.open),
                      },
                      {
                        value: "yesterday",
                        label: dayTabLabel(
                          "yesterday",
                          board.yesterdayTab.open,
                        ),
                      },
                    ]}
                  />
                  <Text className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {formatDayLong(
                      showing === "yesterday"
                        ? addDays(board.today, -1)
                        : board.today,
                    )}
                  </Text>
                </View>
              )}

              {tab.rows.length === 0 ? (
                <Text className="mt-3.5 text-sm text-muted-foreground">
                  {showing === "yesterday"
                    ? "yesterday is answered. nothing here is waiting on you."
                    : "nothing is scheduled today. the wall knows — a rest day is not a hole in it."}
                </Text>
              ) : (
                <View className="mt-3.5 gap-2.5">
                  {tab.rows.map((row) => (
                    <TodayCard
                      key={row.habit.id}
                      row={row}
                      mode={settings.checkinMode}
                      checkIn={checkIn}
                      today={board.today}
                      // The switch above already says which day this is.
                      namesDay={!hasYesterday}
                    />
                  ))}
                </View>
              )}

              {/* Habits that were never due today are collapsed rather than
                  listed as pending — the design had no rest day, so a Mon/Wed/Fri
                  habit sat on Today every Tuesday looking undone. */}
              {showing === "today" && board.resting.length > 0 && (
                <View className="mt-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showResting
                        ? "hide the habits not due today"
                        : `show ${board.resting.length} habits not due today`
                    }
                    accessibilityState={{ expanded: showResting }}
                    onPress={() => setShowResting((open) => !open)}
                    hitSlop={6}
                    className="py-2"
                  >
                    <Text className="text-xs font-semibold text-muted-foreground">
                      {showResting ? "hide" : "show"} {board.resting.length} not
                      due today
                    </Text>
                  </Pressable>
                  {showResting && (
                    <View className="gap-2">
                      {board.resting.map((row) => (
                        <Pressable
                          key={row.habit.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${row.habit.name}, ${nextDueLabel(row.habit, board.today)}`}
                          onPress={() =>
                            router.navigate(`/habit/${row.habit.id}`)
                          }
                          className="flex-row items-center justify-between rounded-xl border border-border/50 px-3 py-2.5"
                        >
                          <Text
                            className="min-w-0 flex-1 text-sm text-muted-foreground"
                            numberOfLines={1}
                          >
                            {row.habit.name}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {nextDueLabel(row.habit, board.today)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ContentShell>
    </ScrollView>
  );
}
