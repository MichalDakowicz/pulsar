import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useToast } from '@/components/ui/Toast';
import { useFriends } from '@/features/social/useFriends';
import { useSendNudge } from '@/features/social/useNudges';
import { useEndPact, useOfferPact, usePactPartnerDay, usePacts } from '@/features/social/usePacts';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useProfile } from '@/hooks/useProfile';
import { useUserSettings } from '@/hooks/useUserSettings';
import { sharesAnything } from '@/lib/userSettings';
import type { Habit } from '@/types/habit';

/**
 * The pact on a habit's detail page: one partner, both sides' state today, and
 * a nudge.
 *
 * The whole panel is conditional. With no friends there is nobody to pact with
 * and the panel says so instead of offering an empty picker; with the shared
 * privacy switch closed there is nothing to agree to; and the nudge button only
 * appears when there is somebody who has not held yet *and* nudges are on for
 * both of you.
 */
export function PactPanel({ habit, heldToday }: { habit: Habit; heldToday: boolean }) {
  const { active, loading } = usePacts();
  const { friends } = useFriends();
  const { settings } = useUserSettings();
  const { settings: habitSettings } = useHabitSettings();
  const { say } = useToast();
  const offer = useOfferPact();
  const end = useEndPact();
  const nudge = useSendNudge();
  const [picking, setPicking] = useState(false);
  const [ending, setEnding] = useState(false);

  const pact = active.find((candidate) => candidate.habitId === habit.id || candidate.partnerHabitId === habit.id) ?? null;
  const { profile: partner } = useProfile(pact?.otherId);
  const { partnerHabit, heldToday: partnerHeld } = usePactPartnerDay(pact);

  if (loading) return null;

  if (!pact) {
    // Nothing to show but the offer, and the offer needs somewhere to send it.
    if (!sharesAnything(settings)) return null;
    if (friends.length === 0) return null;

    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="put this habit in a pact"
          onPress={() => setPicking(true)}
          className="rounded-xl border border-border p-3.5"
        >
          <Text className="text-base font-bold text-foreground">put it in a pact</Text>
          <Text className="mt-1.5 text-xs text-muted-foreground">
            one friend sees whether you held this habit, and you see theirs. they have to accept, and either
            of you can end it.
          </Text>
        </Pressable>

        <SheetDialog
          open={picking}
          title="who is watching this one?"
          body="they get to see this habit and nothing else of yours. they pick a habit of their own when they accept."
          confirmLabel="close"
          dismissLabel="never mind"
          onConfirm={() => setPicking(false)}
          onDismiss={() => setPicking(false)}
        >
          <View className="mt-3 gap-2">
            {friends.map((friend) => (
              <Pressable
                key={friend.id}
                accessibilityRole="button"
                accessibilityLabel={`offer a pact to ${friend.displayName || friend.username}`}
                onPress={async () => {
                  setPicking(false);
                  try {
                    await offer.mutateAsync({ habitId: habit.id, partnerId: friend.id });
                    say(`pact offered to ${friend.displayName || friend.username}.`);
                  } catch {
                    say('that did not send. try again in a moment.');
                  }
                }}
                className="flex-row items-center gap-3 rounded-xl bg-secondary p-3"
              >
                <Avatar profile={friend} size={34} />
                <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                  {friend.displayName || friend.username}
                </Text>
              </Pressable>
            ))}
          </View>
        </SheetDialog>
      </>
    );
  }

  const partnerName = partner?.displayName || partner?.username || 'your partner';
  const canNudge = habitSettings.partnerNudges && !partnerHeld && !!partnerHabit;

  return (
    <>
      <View className="rounded-xl border border-border p-3.5">
        <View className="flex-row items-center gap-3">
          <Avatar profile={partner} size={30} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
              pact with {partnerName}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {partnerHabit ? partnerHabit.name : 'waiting on their side'}
            </Text>
          </View>
          {/* Nudging someone who has already held is poking them about work
              they have done — the button is not there to be pressed then. */}
          {canNudge && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`nudge ${partnerName}`}
              onPress={async () => {
                try {
                  await nudge.mutateAsync({ toId: pact.otherId, habitId: partnerHabit!.id });
                  say(`nudged ${partnerName}.`);
                } catch (error) {
                  say(error instanceof Error ? error.message : 'that did not send.');
                }
              }}
              className="rounded-full border border-border px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-foreground">nudge</Text>
            </Pressable>
          )}
        </View>

        <View className="mt-3 flex-row gap-2">
          <Side label="you" held={heldToday} />
          <Side label={partnerName} held={partnerHeld} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="end this pact"
          hitSlop={6}
          onPress={() => setEnding(true)}
          className="mt-3"
        >
          <Text className="text-xs font-semibold text-muted-foreground">end the pact</Text>
        </Pressable>
      </View>

      <SheetDialog
        open={ending}
        title={`end the pact with ${partnerName}?`}
        body="you both stop seeing each other's habit from now on. the streak itself is untouched."
        confirmLabel="end it"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={async () => {
          setEnding(false);
          await end.mutateAsync(pact.id);
          say('pact ended.');
        }}
        onDismiss={() => setEnding(false)}
      />
    </>
  );
}

function Side({ label, held }: { label: string; held: boolean }) {
  return (
    <View
      className={['flex-1 items-center rounded-full px-2.5 py-2', held ? 'bg-primary/15' : 'bg-secondary'].join(' ')}
    >
      <Text
        className={['text-xs font-semibold', held ? 'text-primary' : 'text-muted-foreground'].join(' ')}
        numberOfLines={1}
      >
        {label} {held ? '✓' : '—'}
      </Text>
    </View>
  );
}
