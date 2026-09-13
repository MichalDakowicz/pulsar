import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Status-bar clearance. There is no header anywhere in a Ping app, so every
 * screen owns its own inset — this is the first line of every screen body.
 *
 * `extra` is the breathing room above the screen's first control — pass 0 on a
 * screen whose first element is meant to run to the top.
 */
export function ScreenTop({ extra = 8 }: { extra?: number }) {
  const insets = useSafeAreaInsets();
  return <View style={{ height: insets.top + extra }} />;
}
