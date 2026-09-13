import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import type { Profile } from '@/types/profile';

/**
 * The shared avatar — a profile picture, or initials on the raised surface.
 * One component so the fallback looks identical in the nav island, on a pact
 * card and in the friends strip.
 */
export function Avatar({
  profile,
  size = 48,
}: {
  profile: Pick<Profile, 'username' | 'displayName' | 'pfp'> | null;
  size?: number;
}) {
  const initials = (profile?.displayName || profile?.username || '?').slice(0, 2).toUpperCase();

  if (profile?.pfp) {
    return (
      <Image
        source={{ uri: profile.pfp }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      className="items-center justify-center bg-secondary"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-semibold text-muted-foreground" style={{ fontSize: size * 0.35 }}>
        {initials}
      </Text>
    </View>
  );
}
