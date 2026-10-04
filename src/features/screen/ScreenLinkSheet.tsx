import { useState } from 'react';
import { Text, View } from 'react-native';

import { Chip, Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { ConnectionRow } from '@/features/health/ConnectionRow';
import type { TopApp } from '@/features/screen/usageStats';
import { LIMIT_STEPS, shortMinutes, type ScreenApp, type ScreenLink } from '@/lib/screenTime';

type ScreenLinkSheetProps = {
  open: boolean;
  current: ScreenLink | null;
  access: boolean;
  /** The week's most used apps, most first. */
  apps: TopApp[];
  saving: boolean;
  onOpenAccess: () => void;
  onSave: (link: ScreenLink | null) => void;
  onDismiss: () => void;
};

/**
 * Choosing which apps slip an avoid habit, and how long they may run first.
 * Keyed by its caller on open, so a second visit starts from the saved limit.
 */
export function ScreenLinkSheet({ open, current, access, apps, saving, onOpenAccess, onSave, onDismiss }: ScreenLinkSheetProps) {
  const [chosen, setChosen] = useState<ScreenApp[]>(current?.apps ?? []);
  const [limit, setLimit] = useState(current?.limit ?? 30);

  // The apps already on the limit stay offered even after they drop out of
  // the week's top — otherwise one could not be taken off again.
  const offered: (ScreenApp & { minutes?: number })[] = [
    ...apps,
    ...chosen.filter((app) => !apps.some((top) => top.pkg === app.pkg)),
  ];
  const isChosen = (pkg: string) => chosen.some((app) => app.pkg === pkg);
  const toggle = (app: ScreenApp) =>
    setChosen((list) => (isChosen(app.pkg) ? list.filter((item) => item.pkg !== app.pkg) : [...list, { pkg: app.pkg, label: app.label }]));

  const reason = !access
    ? 'needs usage access first'
    : saving
      ? 'saving…'
      : chosen.length === 0 && !current
        ? 'pick at least one app'
        : null;

  return (
    <SheetDialog
      open={open}
      title="slip it on screen time"
      body="pulsar checks your screen time when you open it. going over the limit logs a slip for that day — it ends the streak like one you logged."
      confirmLabel={chosen.length > 0 ? 'set the limit' : 'stop it'}
      dismissLabel="leave it"
      confirmDisabledReason={reason}
      onConfirm={() => onSave(chosen.length > 0 ? { apps: chosen, limit } : null)}
      onDismiss={onDismiss}
    >
      {!access ? (
        <View className="mt-4 gap-2">
          <Text className="text-sm text-foreground">
            pulsar needs usage access to see how long apps were open. it reads time on screen only, never what you do in an app.
          </Text>
          <ConnectionRow title="allow usage access" sub="settings → usage access → pulsar" onPress={onOpenAccess} />
        </View>
      ) : (
        <>
          <Overline className="mt-4">apps</Overline>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {offered.map((app) => (
              <Chip
                key={app.pkg}
                label={app.minutes !== undefined ? `${app.label.toLowerCase()} · ${shortMinutes(app.minutes)}` : app.label.toLowerCase()}
                selected={isChosen(app.pkg)}
                onPress={() => toggle(app)}
              />
            ))}
          </View>
          <Text className="mt-2 text-xs text-muted-foreground">
            {offered.length > 0 ? 'your most used this week, with their time.' : 'no app has been on screen this week yet.'}
          </Text>

          <Overline className="mt-4">a day, across them all</Overline>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {LIMIT_STEPS.map((step) => (
              <Chip key={step} label={`${step} min`} selected={limit === step} onPress={() => setLimit(step)} />
            ))}
          </View>
          <Text className="mt-2 text-xs text-muted-foreground">
            take a slip back from the wall and it stays taken back.
          </Text>
        </>
      )}
    </SheetDialog>
  );
}
