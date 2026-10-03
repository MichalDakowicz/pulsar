import { useState } from 'react';
import { View } from 'react-native';

import { Chip, Field } from '@/components/ui/controls';
import { isPresetUnit, UNIT_MAX, UNIT_PRESETS } from '@/lib/units';

/**
 * What a counter counts: a row of common units, and "other" for the one that
 * is not there.
 *
 * Whether the text field is showing is kept here rather than derived from the
 * unit. Derived, typing "pages" into it would match a preset, flip the picker
 * back to the chips and take the field away mid-word.
 */
export function UnitPicker({ unit, onChange }: { unit: string; onChange: (unit: string) => void }) {
  const [custom, setCustom] = useState(() => !isPresetUnit(unit));

  return (
    <View className="gap-2.5">
      <View className="flex-row flex-wrap gap-2">
        {UNIT_PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={preset}
            selected={!custom && unit === preset}
            onPress={() => {
              setCustom(false);
              onChange(preset);
            }}
          />
        ))}
        <Chip
          label="other"
          selected={custom}
          onPress={() => {
            setCustom(true);
            // Starting from the preset that was picked would leave the user
            // deleting a word before they can type their own.
            if (isPresetUnit(unit)) onChange('');
          }}
        />
      </View>
      {custom && (
        <Field
          value={unit}
          onChangeText={onChange}
          placeholder="what are you counting?"
          maxLength={UNIT_MAX}
          autoCapitalize="none"
          accessibilityLabel="unit"
        />
      )}
    </View>
  );
}
