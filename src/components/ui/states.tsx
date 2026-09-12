import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * The four shared states. A screen renders one of these rather than an ad-hoc
 * spinner, so "nothing here" always looks like a deliberate answer instead of a
 * failed load.
 */

export function LoadingState({ label = 'loading' }: { label?: string }) {
  return (
    <View className="items-center justify-center gap-3 py-16" accessibilityLabel={label}>
      <ActivityIndicator color={COLORS.accent} />
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View className="items-center gap-2 px-6 py-14">
      <Text className="text-xl font-bold text-foreground">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">{body}</Text>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          className="mt-3 rounded-full bg-primary px-5 py-3"
        >
          <Text className="text-sm font-bold text-primary-foreground">{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View className="items-center gap-2 px-6 py-14">
      <Text className="text-xl font-bold text-foreground">that did not load</Text>
      <Text className="text-center text-sm text-muted-foreground">
        {message ?? 'the connection dropped somewhere between here and the server.'}
      </Text>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="try again"
          onPress={onRetry}
          className="mt-3 rounded-full border border-border px-5 py-3"
        >
          <Text className="text-sm font-semibold text-foreground">try again</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * The heading above a section. Always a title and optionally one piece of meta
 * on the right; never a button, which belongs in the row it acts on.
 */
export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text className="text-xl font-bold text-foreground">{title}</Text>
      {!!meta && (
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {meta}
        </Text>
      )}
    </View>
  );
}

/** A number with its overline. The one way a figure is displayed in this app. */
export function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'accent' }) {
  return (
    <View className="flex-1 rounded-xl bg-secondary px-3 py-2.5">
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className={['text-xl font-bold', tone === 'accent' ? 'text-primary' : 'text-foreground'].join(' ')}>
        {value}
      </Text>
    </View>
  );
}
