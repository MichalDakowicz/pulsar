import { Text, View } from 'react-native';

/** Past this many, segments are too thin to count and the bar is drawn solid. */
const MAX_SEGMENTS = 12;

type CounterBarProps = {
  amount: number;
  target: number;
  /** What is being counted, said beside the bar — "glasses today", "km this week". */
  caption?: string;
};

/**
 * Where a counter stands, as a bar with its number on it.
 *
 * "3 / 8 glasses today" in grey text was the only sign a counter had moved, and
 * it read the same at one glass as at seven. A bar shows how far is left before
 * the number is read; the unit sits beside it so the bar never has to be
 * decoded. Up to twelve it is drawn in segments, one per glass, so the count
 * is visible as well as the share.
 */
export function CounterBar({ amount, target, caption }: CounterBarProps) {
  const owed = Math.max(1, target);
  const share = Math.min(1, Math.max(0, amount / owed));
  const segmented = owed <= MAX_SEGMENTS;

  return (
    <View className="flex-row items-center gap-2" accessibilityLabel={`${amount} of ${owed}${caption ? ` ${caption}` : ''}`}>
      <View className="h-[18px] max-w-[160px] flex-1 justify-center overflow-hidden rounded-full bg-white/10">
        {segmented ? (
          <View className="absolute bottom-[3px] left-[3px] right-[3px] top-[3px] flex-row gap-[2px]">
            {Array.from({ length: owed }, (_, index) => (
              <View key={index} className={['flex-1 rounded-sm', index < amount ? 'bg-primary' : 'bg-white/10'].join(' ')} />
            ))}
          </View>
        ) : (
          <View className="absolute bottom-0 left-0 top-0 bg-primary" style={{ width: `${share * 100}%` }} />
        )}
        <View className="items-center">
          <Text className="rounded-full bg-black/60 px-1.5 text-[10px] font-bold text-white">
            {amount}/{owed}
          </Text>
        </View>
      </View>
      {!!caption && (
        <Text className="shrink text-xs text-muted-foreground" numberOfLines={1}>
          {caption}
        </Text>
      )}
    </View>
  );
}
