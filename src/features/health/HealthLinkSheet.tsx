import { useState } from 'react';
import { Text, View } from 'react-native';

import { Chip, Segmented } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import {
  ACCESS_LINES,
  ACTIVITY_GROUPS,
  ACTIVITY_LABELS,
  HEALTH_SOURCES,
  linkMisfit,
  SOURCE_LABELS,
  type ActivityGroup,
  type ActivityMode,
  type HealthAccess,
  type HealthLink,
  type HealthSource,
} from '@/lib/healthLink';
import type { Habit } from '@/types/habit';

type HealthLinkSheetProps = {
  open: boolean;
  habit: Pick<Habit, 'kind' | 'unit' | 'checksPerDay' | 'healthLink'>;
  access: HealthAccess | null;
  saving: boolean;
  onSave: (link: HealthLink | null) => void;
  onDismiss: () => void;
};

const MODES: { value: ActivityMode; label: string }[] = [
  { value: 'all', label: 'every kind' },
  { value: 'only', label: 'only' },
  { value: 'except', label: 'all but' },
];

/**
 * Choosing what fills a habit in: a source, and for exercise which kinds of
 * session count. Keyed by its caller on open, so a second visit starts from the
 * saved link rather than from whatever was picked and then cancelled.
 */
export function HealthLinkSheet({ open, habit, access, saving, onSave, onDismiss }: HealthLinkSheetProps) {
  const current = habit.healthLink ?? null;
  const [source, setSource] = useState<HealthSource | null>(current?.source ?? null);
  const [mode, setMode] = useState<ActivityMode>(current?.mode ?? 'all');
  const [activities, setActivities] = useState<ActivityGroup[]>(current?.activities ?? []);

  const misfits = HEALTH_SOURCES.map((item) => [item, linkMisfit(habit, item)] as const);
  const toggle = (group: ActivityGroup) =>
    setActivities((list) => (list.includes(group) ? list.filter((item) => item !== group) : [...list, group]));

  const ready = access === 'ready';
  // A saved link the habit has since been edited out of fitting opens selected
  // and cannot be saved again as it is — it says why rather than greying out.
  const misfit = source ? linkMisfit(habit, source) : null;
  const reason = !ready
    ? 'needs health connect on this phone'
    : saving
      ? 'saving…'
      : !source && !current
        ? 'pick what fills it in'
        : misfit
          ? `${source} ${misfit}`
          : source === 'exercise' && mode === 'only' && activities.length === 0
            ? 'pick at least one kind of session'
            : null;

  return (
    <SheetDialog
      open={open}
      title="fill it from health connect"
      body="pulsar reads it when you open the app and only ever adds to a day. it never marks a miss."
      confirmLabel={source ? 'link it' : 'fill it by hand'}
      dismissLabel="leave it"
      confirmDisabledReason={reason}
      onConfirm={() => onSave(source ? { source, mode, activities } : null)}
      onDismiss={onDismiss}
    >
      {access && access !== 'ready' && <Text className="mt-3 text-sm text-foreground">{ACCESS_LINES[access]}</Text>}

      <Text className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">filled by</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        <Chip label="you, by hand" selected={source === null} onPress={() => setSource(null)} />
        {misfits.map(([item, misfit]) => (
          <Chip key={item} label={SOURCE_LABELS[item].label} selected={source === item} disabled={!!misfit} onPress={() => setSource(item)} />
        ))}
      </View>
      <Text className="mt-2 text-xs text-muted-foreground">
        {source
          ? SOURCE_LABELS[source].sub
          : misfits
              .filter(([, misfit]) => misfit)
              .map(([item, misfit]) => `${item} ${misfit}`)
              .join(' · ') || 'any of the three can fill this habit.'}
      </Text>

      {source === 'exercise' && (
        <View className="mt-4">
          <Segmented label="which sessions count" options={MODES} value={mode} onChange={setMode} />
          {mode !== 'all' && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {ACTIVITY_GROUPS.map((group) => (
                <Chip key={group} label={ACTIVITY_LABELS[group]} selected={activities.includes(group)} onPress={() => toggle(group)} />
              ))}
            </View>
          )}
          {mode !== 'all' && (
            <Text className="mt-2 text-xs text-muted-foreground">
              narrowing it never takes a day back — clear one from the wall if it was wrong.
            </Text>
          )}
        </View>
      )}
    </SheetDialog>
  );
}
