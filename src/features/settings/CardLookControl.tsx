import { Text, View } from 'react-native';

import { Segmented } from '@/components/ui/controls';
import { useCardLook, type CardLayout, type StepStyle } from '@/store/cardLook';

const LAYOUT_COPY: Record<CardLayout, string> = {
  calendar: 'each habit with four months of its wall under it.',
  tagged: 'one compact row per habit: what it is, when it is judged, and where it stands today.',
  both: 'the compact row, with the wall still under it.',
};

/** How habit cards are drawn on Today and Habits, and how a twice-a-day habit shows its checks. */
export function CardLookControl() {
  const { layout, stepStyle, setLayout, setStepStyle } = useCardLook();

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
      <View className="border-t border-border/50 py-4">
        <Text className="text-base font-semibold text-foreground">habits checked more than once a day</Text>
        <Text className="mb-3 text-xs text-muted-foreground">
          {stepStyle === 'pips'
            ? 'one bar per check, filled when it is in.'
            : 'round checks — a sun and a moon on a morning-and-night habit, blank on a plain one.'}
        </Text>
        <Segmented<StepStyle>
          label="how checks show"
          value={stepStyle}
          onChange={setStepStyle}
          options={[
            { value: 'pips', label: 'bars' },
            { value: 'sunmoon', label: 'sun & moon' },
          ]}
        />
      </View>
    </View>
  );
}
