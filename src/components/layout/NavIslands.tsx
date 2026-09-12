import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavAction } from '@/components/layout/navActions';
import { DEST_HEIGHT, DEST_WIDTH, NavDestinationButton } from '@/components/layout/NavDestinationButton';
import { activeTabFor, NAV_DESTINATIONS, type NavDestination } from '@/components/layout/navDestinations';
import { Avatar } from '@/features/friends/Avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSocialAlert } from '@/features/social/useSocialAlert';
import { NAV_ISLAND_GAP, NAV_ISLAND_HEIGHT } from '@/hooks/useNavBarSpace';
import { useProfile } from '@/hooks/useProfile';
import { COLORS } from '@/theme/colors';

// Real backdrop blur on Android needs the Dimezis backend; without it BlurView
// falls back to a flat tint and the islands look painted on rather than floating.
const BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : 'none';

const DESTINATIONS = NAV_DESTINATIONS.slice(0, 4);
const PROFILE = NAV_DESTINATIONS[NAV_DESTINATIONS.length - 1];

const DEST_GAP = 2;
const PILL_PAD = 4;
const SLOT = DEST_WIDTH + DEST_GAP;

/**
 * The bottom navigation: three floating glass plates in a 1-4-1 rhythm — the
 * current screen's one action on the left, four destinations in the middle, you
 * on the right.
 *
 * Route-driven rather than wired into the tab navigator, because it also mounts
 * on routes pushed out of the tabs so the bar never disappears mid-journey.
 * Absolutely positioned on purpose: the glass is only glass if the wall scrolls
 * under it, which is why every body pads with `useNavBarSpace`.
 */
export function NavIslands() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  const activeTab = activeTabFor(pathname);
  const action = useNavAction(pathname, activeTab);
  const socialAlert = useSocialAlert();

  const activeIndex = DESTINATIONS.findIndex((destination) => destination.tabName === activeTab);
  // One marker that travels, rather than four that fade in place — the slide is
  // what tells you which way you moved.
  const offset = useSharedValue(Math.max(activeIndex, 0));
  const shown = useSharedValue(activeIndex >= 0 ? 1 : 0);

  useEffect(() => {
    if (activeIndex >= 0) offset.value = withTiming(activeIndex, { duration: 260, easing: Easing.out(Easing.cubic) });
    shown.value = withTiming(activeIndex >= 0 ? 1 : 0, { duration: 160 });
  }, [activeIndex, offset, shown]);

  const markerStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateX: offset.value * SLOT }],
  }));

  const go = useCallback((destination: NavDestination) => router.navigate(destination.href), [router]);
  const profileActive = activeTab === PROFILE.tabName;

  return (
    <View
      style={[styles.bar, { bottom: insets.bottom + NAV_ISLAND_GAP }]}
      // The row spans the screen so the islands can centre in it, but only the
      // islands themselves may swallow taps — the rest is scrolling content.
      pointerEvents="box-none"
    >
      <Island style={styles.round}>
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.roundPress}
        >
          <action.Icon size={21} color="#fafafa" strokeWidth={2.2} />
          {action.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{action.badge > 9 ? '9+' : action.badge}</Text>
            </View>
          )}
        </Pressable>
      </Island>

      <Island style={styles.pill}>
        <Animated.View style={[styles.marker, markerStyle]} pointerEvents="none" />
        {DESTINATIONS.map((destination) => (
          <NavDestinationButton
            key={destination.tabName}
            destination={destination}
            active={destination.tabName === activeTab}
            alert={destination.tabName === 'social' && socialAlert}
            onPress={() => go(destination)}
          />
        ))}
      </Island>

      {/* The plate's hairline turns accent when active — never a ring drawn
          around the avatar itself, which reads as a notification. */}
      <Island style={[styles.round, { borderColor: profileActive ? COLORS.accent : COLORS.islandEdge }]}>
        <Pressable
          onPress={() => go(PROFILE)}
          accessibilityRole="tab"
          accessibilityState={{ selected: profileActive }}
          accessibilityLabel={PROFILE.label}
          style={styles.roundPress}
        >
          <Avatar profile={profile} size={44} />
        </Pressable>
      </Island>
    </View>
  );
}

/** One glass plate: blurred backdrop, translucent fill, hairline edge. */
function Island({ children, style }: { children: ReactNode; style?: object | object[] }) {
  return (
    <View style={[styles.island, style]}>
      <BlurView
        intensity={38}
        tint="dark"
        experimentalBlurMethod={BLUR_METHOD}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  island: {
    height: NAV_ISLAND_HEIGHT,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: COLORS.islandEdge,
    backgroundColor: COLORS.islandFill,
    overflow: 'hidden',
  },
  round: { width: NAV_ISLAND_HEIGHT },
  roundPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: DEST_GAP, paddingHorizontal: PILL_PAD },
  marker: {
    position: 'absolute',
    left: PILL_PAD,
    top: (NAV_ISLAND_HEIGHT - DEST_HEIGHT) / 2 - 1,
    width: DEST_WIDTH,
    height: DEST_HEIGHT,
    borderRadius: 99,
    backgroundColor: COLORS.islandPlate,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: '#161616',
  },
  badgeText: { color: COLORS.accentInk, fontSize: 9.5, fontWeight: '700' },
});
