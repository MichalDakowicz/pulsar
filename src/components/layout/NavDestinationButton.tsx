import { Pressable, View } from 'react-native';

import type { NavDestination } from '@/components/layout/navDestinations';
import { COLORS } from '@/theme/colors';

export const DEST_WIDTH = 46;
export const DEST_HEIGHT = 42;

const ICON_ON = '#fafafa';
const ICON_OFF = '#a3a3a3';

/**
 * One slot in the centre island: a glyph and nothing else.
 *
 * No caption under the icon, no word beside it — the destination's name exists
 * only as its accessibility label. Four captions across the island is the one
 * change that turns the bar back into a stock tab bar (PING.md 8.3).
 */
export function NavDestinationButton({
  destination,
  active,
  alert,
  onPress,
}: {
  destination: NavDestination;
  active: boolean;
  alert?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={destination.label}
      onPress={onPress}
      style={{ width: DEST_WIDTH, height: DEST_HEIGHT, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
    >
      {destination.icon(active ? ICON_ON : ICON_OFF, 20)}
      {alert && (
        <View
          style={{
            position: 'absolute',
            top: 7,
            right: 9,
            width: 8,
            height: 8,
            borderRadius: 99,
            backgroundColor: COLORS.accent,
            borderWidth: 1.5,
            borderColor: '#161616',
          }}
        />
      )}
    </Pressable>
  );
}
