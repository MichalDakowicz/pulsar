import { useState } from 'react';
import { Text, View } from 'react-native';

import { Chip, Field, Overline, Segmented } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { ACTIVITY_GROUPS, ACTIVITY_LABELS, type ActivityGroup, type ActivityMode } from '@/lib/healthActivities';
import {
  ACCESS_LINES,
  BEDTIMES,
  DEFAULT_BEDTIME,
  FILTERED_SOURCES,
  HEALTH_SOURCES,
  linkMisfit,
  SOURCE_LABELS,
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
  const [bedtime, setBedtime] = useState(current?.bedtime ?? DEFAULT_BEDTIME);
  const [minimumMinutes, setMinimumMinutes] = useState(String(current?.minimumMinutes ?? ''));
  const [minimumMode, setMinimumMode] = useState<'session' | 'day'>(current?.minimumMode ?? 'session');
  const exerciseCheck = source === 'exercise' && habit.kind === 'do';
  // Sleep on a check is a bedtime; on a timer it is how long you slept.
  const byBedtime = source === 'sleep' && habit.kind === 'do';

  const misfits = HEALTH_SOURCES.map((item) => [item, linkMisfit(habit, item)] as const);
  const fitting = misfits.filter(([, reason]) => !reason).map(([item]) => SOURCE_LABELS[item].label);
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
          : exerciseCheck && minimumMinutes !== '' && (!Number.isInteger(Number(minimumMinutes)) || Number(minimumMinutes) < 1 || Number(minimumMinutes) > 1440)
            ? 'enter a minimum from 1 to 1440 minutes, or leave it empty'
          : source && FILTERED_SOURCES.includes(source) && mode === 'only' && activities.length === 0
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
      onConfirm={() => onSave(source ? { source, mode, activities, ...(byBedtime ? { bedtime } : {}),
        ...(exerciseCheck && minimumMinutes ? { minimumMinutes: Number(minimumMinutes), minimumMode } : {}) } : null)}
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
          ? byBedtime
            ? 'held if you fall asleep within 15 minutes after the time below. a sleep under three hours is a nap, not a night.'
            : SOURCE_LABELS[source].sub
          : fitting.length > 0
            ? `${fitting.join(', ')} can fill this one. the rest need a habit of another shape.`
            : 'nothing health connect holds fits this habit.'}
      </Text>

      {byBedtime && (
        <View className="mt-4">
          <Overline>asleep by</Overline>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {BEDTIMES.map((time) => (
              <Chip key={time} label={time} selected={bedtime === time} onPress={() => setBedtime(time)} />
            ))}
          </View>
        </View>
      )}

      {exerciseCheck && (
        <View className="mt-4 gap-2.5">
          <Overline>at least this many minutes</Overline>
          <Field accessibilityLabel="minimum exercise minutes" value={minimumMinutes} placeholder="any duration"
            keyboardType="number-pad" inputMode="numeric" maxLength={4}
            onChangeText={(text) => { if (/^\d*$/.test(text)) setMinimumMinutes(text); }} />
          {!!minimumMinutes && <Segmented label="how minutes count" value={minimumMode} onChange={setMinimumMode}
            options={[{ value: 'session', label: 'one session' }, { value: 'day', label: 'daily total' }]} />}
          <Text className="text-xs text-muted-foreground">leave empty to count any workout. the minimum uses only the kinds chosen below.</Text>
        </View>
      )}

      {source && FILTERED_SOURCES.includes(source) && (
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
