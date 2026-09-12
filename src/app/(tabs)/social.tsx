import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { EmptyState, LoadingState, SectionHeader } from '@/components/ui/states';
import { ActivePactCard } from '@/features/social/ActivePactCard';
import { FriendStrip } from '@/features/social/FriendStrip';
import { useFriends } from '@/features/social/useFriends';
import { useNudges } from '@/features/social/useNudges';
import { usePacts } from '@/features/social/usePacts';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import { sharesAnything } from '@/lib/userSettings';

/**
 * Social. Three sections, and each one disappears when it has nothing to say
 * rather than rendering an empty shell — the design showed pacts, friends and a
 * feed unconditionally, which on a new account is three headings over nothing.
 */
export default function SocialScreen() {
  const router = useRouter();
  const { active, pending, loading } = usePacts();
  const { friends, loading: friendsLoading } = useFriends();
  const { unseen } = useNudges();
  const { settings } = useUserSettings();
  const bottom = useNavBarSpace();

  const incoming = pending.filter((pact) => pact.incoming);

  if (loading || friendsLoading) {
    return (
      <View className="flex-1 bg-background">
        <ScreenTop />
        <LoadingState />
      </View>
    );
  }

  // With the shared privacy switch closed nothing here can work, and saying so
  // beats four empty sections and a silent failure to share.
  if (!sharesAnything(settings)) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: bottom }}>
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <EmptyState
            title="your profile is private"
            body="nothing of yours is visible to anyone, in any of the four apps, so pacts and shared walls are off. change it in settings whenever you want."
            action={{ label: 'open settings', onPress: () => router.navigate('/settings') }}
          />
        </ContentShell>
      </ScrollView>
    );
  }

  if (friends.length === 0) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: bottom }}>
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <EmptyState
            title="nobody is watching yet"
            body="friends are shared across radar, lidar, sonar and pulsar — add someone in any of them and they show up here."
          />
        </ContentShell>
      </ScrollView>
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
          <Text className="text-2xl font-bold tracking-tight text-foreground">who is watching</Text>
          <Text className="mt-1.5 text-sm text-muted-foreground">
            {active.length === 0
              ? 'no pacts running. a pact is one habit each, both sides visible.'
              : `${active.length} ${active.length === 1 ? 'pact' : 'pacts'} running.`}
          </Text>
        </View>

        {/* Invites and nudges are actionable, so they sit above everything that
            is merely informative. */}
        {(incoming.length > 0 || unseen.length > 0) && (
          <View className="mt-4 px-4">
            <View className="gap-2 rounded-xl border border-primary/35 bg-primary/10 p-3.5">
              {incoming.length > 0 && (
                <Text className="text-sm font-semibold text-foreground">
                  {incoming.length} pact {incoming.length === 1 ? 'invite' : 'invites'} waiting on you.
                </Text>
              )}
              {unseen.length > 0 && (
                <Text className="text-sm font-semibold text-foreground">
                  {unseen.length} {unseen.length === 1 ? 'nudge' : 'nudges'} today.
                </Text>
              )}
              <Text className="text-xs text-muted-foreground">open the inbox from the bar on the left.</Text>
            </View>
          </View>
        )}

        {active.length > 0 && (
          <View className="px-4 pt-5">
            <SectionHeader title="your pacts" />
            <View className="mt-3.5 gap-2">
              {active.map((pact) => (
                <ActivePactCard key={pact.id} pact={pact} />
              ))}
            </View>
          </View>
        )}

        <View className="mt-5 border-t border-border/50 px-4 py-5">
          <SectionHeader title="today" meta="friends" />
          <FriendStrip friends={friends} />
        </View>
      </ContentShell>
    </ScrollView>
  );
}
