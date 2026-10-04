import { Text, View } from 'react-native';

/** A small uppercase pill over a habit's name: holding, comeback, hard mode. */
export function StatusChip({ label, tone }: { label: string; tone: 'accent' | 'muted' }) {
  return (
    <View
      className={[
        'rounded-full border px-2.5 py-1',
        tone === 'accent' ? 'border-primary/40 bg-primary/10' : 'border-border',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[10px] font-semibold uppercase tracking-widest',
          tone === 'accent' ? 'text-primary' : 'text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </Text>
    </View>
  );
}
