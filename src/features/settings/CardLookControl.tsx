import { Text, View } from 'react-native';

import { Segmented } from '@/components/ui/controls';
import { useCardLook, type CardLayout } from '@/store/cardLook';

const LAYOUT_COPY: Record<CardLayout, string> = {
  calendar: 'each habit with four months of its wall under it.',
  tagged: 'one compact row per habit: what it is, when it is judged, and where it stands today.',
  both: 'the compact row, with the wall still under it.',
};

/** How habit cards are drawn on Today and Habits. */
export function CardLookControl() {
  const { layout, setLayout } = useCardLook();

  return (
    <View className="mt-2 border-t border-border/50 px-4">
      <View className="py-4">
        <Text className="text-base font-semibold text-foreground">how habits look</Text>
        <Text className="mb-3 text-xs text-muted-foreground">{LAYOUT_COPY[layout]}</Text>
        <Segmented<CardLayout>
          label="how habits look"
          value={layout}
          onChange={setLayout}
          options={[
            { value: 'calendar', label: 'calendar' },
            { value: 'tagged', label: 'tagged' },
            { value: 'both', label: 'both' },
          ]}
        />
      </View>
    </View>
  );
}
