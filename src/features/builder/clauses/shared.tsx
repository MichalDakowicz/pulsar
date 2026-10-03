import { Pressable, Text } from 'react-native';

import type { BuilderState } from '@/lib/builder';

type Move = (state: BuilderState) => BuilderState;

/**
 * One clause of the builder. Each takes the whole draft: several read a field
 * another clause owns — the rhythm offers a weekly total only to a counter, and
 * the stakes speak in weeks to anything judged by the week.
 */
export type ClauseProps = {
  state: BuilderState;
  /** Make a change and stay on this clause. */
  apply: (move: Move) => void;
  /** Make a change that answers the clause, and move on if nothing else is left to ask. */
  choose: (move: Move) => void;
  editing: boolean;
};

/** The question at the top of a clause. */
export function Question({ children }: { children: string }) {
  return <Text className="text-2xl font-bold tracking-tight text-foreground">{children}</Text>;
}

/** A larger choice with a line under it, two to a row. */
export function OptionTile({
  label,
  sub,
  active,
  onPress,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      className={[
        'min-w-[47%] flex-1 rounded-xl border px-3 py-2.5 active:opacity-80',
        active ? 'border-primary bg-primary/10' : 'border-transparent bg-white/5',
      ].join(' ')}
    >
      <Text className={['text-sm font-semibold', active ? 'text-primary' : 'text-foreground'].join(' ')}>{label}</Text>
      {!!sub && <Text className="text-[11px] text-muted-foreground">{sub}</Text>}
    </Pressable>
  );
}

/** A sentence of explanation in a quiet well — what a choice means, not another choice. */
export function Note({ children }: { children: string }) {
  return <Text className="rounded-xl bg-white/5 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">{children}</Text>;
}
