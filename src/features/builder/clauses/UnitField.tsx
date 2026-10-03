import { Text, View } from 'react-native';

import { Chip, Field } from '@/components/ui/controls';
import { cleanUnit, UNIT_MAX, UNIT_PRESETS } from '@/lib/units';

/**
 * What a counter counts: a field you can type anything into, with the common
 * words underneath to tap instead. The field is always there — a unit that is
 * not on the list should not need a detour through "other" to be written.
 */
export function UnitField({ unit, onChange }: { unit: string; onChange: (unit: string) => void }) {
  const typed = cleanUnit(unit);
  const preset = (UNIT_PRESETS as readonly string[]).includes(typed);
  // Typing narrows the list; a picked preset or an empty field shows the rest.
  const suggestions = !typed || preset ? UNIT_PRESETS.filter((word) => word !== typed) : UNIT_PRESETS.filter((word) => word.includes(typed));

  return (
    <View className="gap-2.5">
      <Field
        value={unit}
        onChangeText={onChange}
        placeholder="push-ups, pages, cigarettes…"
        maxLength={UNIT_MAX}
        autoCapitalize="none"
        accessibilityLabel="what you are counting"
      />
      {suggestions.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {suggestions.slice(0, 8).map((word) => (
            <Chip key={word} label={word} selected={false} onPress={() => onChange(word)} />
          ))}
        </View>
      )}
      {!!typed && !preset && (
        <Text className="text-xs text-muted-foreground">“{typed}” is yours — kept as you wrote it.</Text>
      )}
    </View>
  );
}
