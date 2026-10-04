import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { View } from 'react-native';

import { ScreenTop } from '@/components/layout/ScreenTop';
import { LoadingState } from '@/components/ui/states';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLogLink } from '@/features/habits/useLogLink';
import { parseLogAmount } from '@/lib/logLink';

/**
 * `pulsar://log/<habit>` — where an NFC tag or a shortcut lands. It checks the
 * habit in and gives way to Today; this screen is only ever seen for the
 * moment the board takes to load.
 */
export default function LogFromLink() {
  const { id, amount } = useLocalSearchParams<{ id: string; amount?: string }>();
  const { user } = useAuth();
  useLogLink(id, parseLogAmount(amount));

  if (!user) return <Redirect href={'/login' as Href} />;

  return (
    <View className="flex-1 bg-background">
      <ScreenTop />
      <LoadingState label="checking it in" />
    </View>
  );
}
