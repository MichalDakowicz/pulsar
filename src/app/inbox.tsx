import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { EmptyState, LoadingState, SectionHeader } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/features/friends/Avatar';
import { useHabits } from '@/features/habits/useHabits';
import { useMarkNudgesSeen, useNudges } from '@/features/social/useNudges';
import { useAnswerPact, usePacts, type Pact } from '@/features/social/usePacts';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useProfile, useProfileMap } from '@/hooks/useProfile';
import { MAX_W } from '@/hooks/useResponsive';

/**
 * Everything waiting on you: pact invites, and today's nudges.
 *
 * Accepting an invite asks which habit *you* are putting up, because a pact with
 * one side is not a pact. The design let you accept without naming one, which
 * would leave a partner watching a habit that did not exist.
 */
export default function Inbox() {
  const router = useRouter();
  const { pacts, loading } = usePacts();
  const { nudges, unseen } = useNudges();
  const markSeen = useMarkNudgesSeen();
  const bottom = useNavBarSpace();

  const incoming = pacts.filter((pact) => pact.state === 'pending' && pact.incoming);
  const sent = pacts.filter((pact) => pact.state === 'pending' && !pact.incoming);
  const senders = useProfileMap([...incoming, ...sent].map((pact) => pact.otherId).concat(nudges.map((n) => n.fromId)));

  // Opening the inbox is seeing them; leaving the dot lit after would make it a
  // counter of visits rather than of things to do.
  useEffect(() => {
    if (unseen.length > 0) void markSeen.mutateAsync(unseen.map((nudge) => nudge.id));
    // Only the ids matter here; re-running on the mutation object would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen.length]);

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  const empty = incoming.length === 0 && sent.length === 0 && nudges.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">inbox</Text>
        </View>

        {empty ? (
          <EmptyState
            title="nothing waiting"
            body="pact invites and nudges land here. it is empty, which is the good version."
            action={{ label: 'back to social', onPress: () => router.navigate('/social') }}
          />
        ) : (
          <>
            {incoming.length > 0 && (
              <View className="px-4 pt-5">
                <SectionHeader title="pact invites" />
                <View className="mt-3.5 gap-2">
                  {incoming.map((pact) => (
                    <InviteRow key={pact.id} pact={pact} name={senders.get(pact.otherId)?.username ?? 'someone'} />
                  ))}
                </View>
              </View>
            )}

            {sent.length > 0 && (
              <View className="px-4 pt-5">
                <SectionHeader title="waiting on them" />
                <View className="mt-3.5 gap-2">
                  {sent.map((pact) => {
                    const person = senders.get(pact.otherId);
                    return (
                      <View key={pact.id} className="flex-row items-center gap-3 rounded-xl border border-border/50 p-3">
                        <Avatar profile={person ?? null} size={30} />
                        <Text className="min-w-0 flex-1 text-sm text-muted-foreground" numberOfLines={1}>
                          {person?.displayName || person?.username || 'someone'} has not answered yet
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {nudges.length > 0 && (
              <View className="px-4 pt-5">
                <SectionHeader title="nudges today" />
                <View className="mt-3.5 gap-3">
                  {nudges.map((nudge) => {
                    const person = senders.get(nudge.fromId);
                    return (
                      <View key={nudge.id} className="flex-row items-center gap-3">
                        <Avatar profile={person ?? null} size={30} />
                        <Text className="min-w-0 flex-1 text-sm text-foreground">
                          {person?.displayName || person?.username || 'your partner'} nudged you about your pact
                          habit.
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
      </ContentShell>
    </ScrollView>
  );
}

function InviteRow({ pact, name }: { pact: Pact; name: string }) {
  const { profile } = useProfile(pact.otherId);
  const { active } = useHabits();
  const answer = useAnswerPact();
  const { say } = useToast();
  const [picking, setPicking] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);

  const display = profile?.displayName || profile?.username || name;

  return (
    <>
      <View className="gap-3 rounded-xl border border-border p-3.5">
        <View className="flex-row items-center gap-3">
          <Avatar profile={profile} size={34} />
          <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground">
            {display} wants a pact with you
          </Text>
        </View>
        <Text className="text-xs text-muted-foreground">
          they put one habit up and you put one up. you each see whether the other held it today, and
          nothing else.
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`accept the pact with ${display}`}
            accessibilityState={{ disabled: active.length === 0 }}
            disabled={active.length === 0}
            onPress={() => setPicking(true)}
            className={['flex-1 items-center rounded-full py-2.5', active.length === 0 ? 'bg-secondary' : 'bg-primary'].join(' ')}
          >
            <Text
              className={['text-sm font-bold', active.length === 0 ? 'text-muted-foreground' : 'text-primary-foreground'].join(' ')}
            >
              accept
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`decline the pact with ${display}`}
            onPress={async () => {
              await answer.mutateAsync({ pactId: pact.id, accept: false });
              say('declined.');
            }}
            className="flex-1 items-center rounded-full border border-border py-2.5"
          >
            <Text className="text-sm font-semibold text-muted-foreground">decline</Text>
          </Pressable>
        </View>
        {/* Accepting needs a habit of your own, so the reason it is off is
            stated rather than left to be guessed at. */}
        {active.length === 0 && (
          <Text className="text-xs text-muted-foreground">
            you need a habit of your own before you can put one up.
          </Text>
        )}
      </View>

      <SheetDialog
        open={picking}
        title="which habit are you putting up?"
        body={`${display} will see whether you held it, every day, until one of you ends the pact.`}
        confirmLabel="accept the pact"
        dismissLabel="not yet"
        confirmDisabledReason={choice ? null : 'pick one of your habits first.'}
        onConfirm={async () => {
          if (!choice) return;
          setPicking(false);
          await answer.mutateAsync({ pactId: pact.id, accept: true, myHabitId: choice });
          say(`pact with ${display} is on.`);
        }}
        onDismiss={() => setPicking(false)}
      >
        <View className="mt-3 gap-2">
          {active.map((habit) => (
            <Pressable
              key={habit.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: choice === habit.id }}
              accessibilityLabel={habit.name}
              onPress={() => setChoice(habit.id)}
              className={[
                'rounded-xl border px-3.5 py-3',
                choice === habit.id ? 'border-primary bg-primary/10' : 'border-border',
              ].join(' ')}
            >
              <Text className="text-sm font-semibold text-foreground">{habit.name}</Text>
            </Pressable>
          ))}
        </View>
      </SheetDialog>
    </>
  );
}
