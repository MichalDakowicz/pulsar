import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useToast } from '@/components/ui/Toast';
import { signOut } from '@/features/auth/authActions';
import { RemindersControl } from '@/features/settings/RemindersControl';
import { SiblingGoalControl } from '@/features/settings/SiblingGoalControl';
import { useHabitSettings } from '@/hooks/useHabitSettings';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { FriendsVisibility, ThemePref } from '@/lib/userSettings';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Settings. The two shared rows say so out loud: theme and privacy are the same
 * values Radar, Lidar and Sonar read, and changing one here changes it there.
 * Telling someone that after the fact is how you lose their trust in a switch.
 */
export default function Settings() {
  const router = useRouter();
  const { settings, updateSettings } = useUserSettings();
  const { settings: habitSettings, updateSettings: updateHabitSettings } = useHabitSettings();
  const { theme, setTheme } = useTheme();
  const { say } = useToast();
  const bottom = useNavBarSpace();
  const [signingOut, setSigningOut] = useState(false);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">settings</Text>
        </View>

        <View className="gap-3 px-4 pt-6">
          <Overline>who can see your habits</Overline>
          <Segmented<FriendsVisibility>
            label="who can see your habits"
            value={settings.friendsVisibility}
            onChange={(value) => void updateSettings({ friendsVisibility: value })}
            options={[
              { value: 'public', label: 'anyone' },
              { value: 'friends', label: 'friends' },
              { value: 'noone', label: 'no one' },
            ]}
          />
          <Text className="text-xs text-muted-foreground">
            this is the same switch as in radar, lidar and sonar — it gates the film shelf, the bookshelf,
            the record shelf and your habit wall together. only habits you put on the shelf are affected;
            a pact partner still sees the habit you both agreed on.
          </Text>
        </View>

        <View className="gap-3 px-4 pt-7">
          <Overline>theme</Overline>
          <Segmented<ThemePref>
            label="theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: 'dark' },
              { value: 'light', label: 'light' },
              { value: 'system', label: 'system' },
            ]}
          />
          <Text className="text-xs text-muted-foreground">shared with the other three apps, same as above.</Text>
        </View>

        <RemindersControl />

        <View className="mt-7 border-t border-border/50 px-4">
          <SwitchRow
            label="streaks from the other apps"
            sub="show your radar and lidar streaks on today"
            value={habitSettings.showSiblingStreaks}
            onChange={(value) => void updateHabitSettings({ showSiblingStreaks: value })}
          />
          {/* The reading goal only matters when the strip that uses it is on. */}
          {habitSettings.showSiblingStreaks && <SiblingGoalControl />}
        </View>

        <View className="mt-2 border-t border-border/50 px-4">
          <View className="py-4">
            <Text className="text-base font-semibold text-foreground">checking off a habit</Text>
            <Text className="mb-3 text-xs text-muted-foreground">
              a swipe is quicker; a hold is harder to do by accident.
            </Text>
            <Segmented
              label="how to check off a habit"
              value={habitSettings.checkinMode}
              onChange={(value) => void updateHabitSettings({ checkinMode: value })}
              options={[
                { value: 'swipe', label: 'swipe' },
                { value: 'hold', label: 'hold' },
              ]}
            />
          </View>
        </View>

        <View className="mt-2 border-t border-border/50 px-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="replay the walkthrough"
            onPress={() => router.navigate('/onboarding')}
            className="border-b border-border/50 py-4"
          >
            <Text className="text-base font-semibold text-foreground">replay the walkthrough</Text>
            <Text className="text-xs text-muted-foreground">the first-run tour, again</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-7">
          <Overline>about</Overline>
          <Text className="mt-2 text-sm text-muted-foreground">pulsar {version}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            one account across radar, lidar, sonar and pulsar. signing out here signs you out of this app
            only.
          </Text>
        </View>

        <View className="px-4 py-7">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="sign out"
            hitSlop={8}
            onPress={() => setSigningOut(true)}
          >
            <Text className="text-sm font-semibold text-destructive-foreground">sign out</Text>
          </Pressable>
        </View>
      </ContentShell>

      <SheetDialog
        open={signingOut}
        title="sign out?"
        body="your habits and streaks stay where they are. the same account signs back in."
        confirmLabel="sign out"
        dismissLabel="stay"
        tone="destructive"
        onConfirm={async () => {
          setSigningOut(false);
          try {
            await signOut();
          } catch (error) {
            say(error instanceof Error ? error.message : 'that did not work.');
          }
        }}
        onDismiss={() => setSigningOut(false)}
      />
    </ScrollView>
  );
}
