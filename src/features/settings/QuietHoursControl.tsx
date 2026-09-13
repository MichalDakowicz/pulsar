import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SwitchRow } from '@/components/ui/controls';
import { useHabitSettings } from '@/hooks/useHabitSettings';

/** `23` → `23:00`. Whole hours only — a quiet window does not need minutes. */
function label(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function HourPicker({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}) {
  // Wrapping rather than clamping: a window that runs 23:00 → 07:00 is the
  // normal case, so the end of the dial has to meet its beginning.
  const step = (delta: number) => onChange((value + delta + 24) % 24);

  return (
    <View className="items-center gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`later ${accessibilityLabel}`}
        onPress={() => step(1)}
        className="h-9 w-16 items-center justify-center rounded-lg bg-secondary"
      >
        <ChevronUp size={16} color="#fafafa" />
      </Pressable>
      <Text className="text-xl font-bold tracking-tight text-foreground">{label(value)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`earlier ${accessibilityLabel}`}
        onPress={() => step(-1)}
        className="h-9 w-16 items-center justify-center rounded-lg bg-secondary"
      >
        <ChevronDown size={16} color="#fafafa" />
      </Pressable>
    </View>
  );
}

/**
 * The hours no reminder may land in.
 *
 * Dropped rather than held back: Pulsar's queue is local and a habit reminder
 * has a time of day for a reason, so a nudge deferred to 07:00 is not the same
 * nudge — it is a lie about when the habit was due. The streak warning obeys it
 * too, which is the trade the copy has to be honest about.
 */
export function QuietHoursControl() {
  const { settings, updateSettings } = useHabitSettings();
  const { quietHours: on, quietStart: start, quietEnd: end } = settings;

  return (
    <View className="border-t border-border/50">
      <SwitchRow
        label="quiet hours"
        sub={on ? `nothing lands between ${label(start)} and ${label(end)}` : 'a reminder can land at any hour'}
        value={on}
        onChange={(quietHours) => void updateSettings({ quietHours })}
      />

      {on && (
        <View className="mb-4 flex-row items-center justify-center gap-6 rounded-xl border border-border p-3">
          <HourPicker
            value={start}
            accessibilityLabel="start of quiet hours"
            onChange={(quietStart) => void updateSettings({ quietStart })}
          />
          <Text className="text-sm font-semibold text-muted-foreground">to</Text>
          <HourPicker
            value={end}
            accessibilityLabel="end of quiet hours"
            onChange={(quietEnd) => void updateSettings({ quietEnd })}
          />
        </View>
      )}
    </View>
  );
}
