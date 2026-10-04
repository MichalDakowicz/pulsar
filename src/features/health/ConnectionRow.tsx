import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

type ConnectionRowProps = { title: string; sub: string; onPress?: () => void };

/** A bordered row with a line under its title; a chevron only when it goes somewhere. */
export function ConnectionRow({ title, sub, onPress }: ConnectionRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}: ${sub}`}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border p-3.5 active:opacity-80"
    >
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">{sub}</Text>
      </View>
      {onPress && <ChevronRight size={18} color={COLORS.muted} />}
    </Pressable>
  );
}
