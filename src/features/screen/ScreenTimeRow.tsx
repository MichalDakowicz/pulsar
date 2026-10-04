import { useState } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { ConnectionRow } from '@/features/health/ConnectionRow';
import { ScreenLinkSheet } from '@/features/screen/ScreenLinkSheet';
import { useScreenLink } from '@/features/screen/useScreenLink';
import { screenSummary } from '@/lib/screenTime';
import type { Habit } from '@/types/habit';

/** The screen-time row on an avoid habit's page, and the sheet that sets its limit. */
export function ScreenTimeRow({ habit }: { habit: Habit }) {
  const [open, setOpen] = useState(false);
  const screen = useScreenLink(habit, open);
  const { say } = useToast();
  const link = habit.screenLink ?? null;
  const onPhone = Platform.OS === 'android';

  const sub = !link
    ? 'slip it when apps go over a daily limit'
    : !onPhone
      ? `${screenSummary(link)} · read on your phone`
      : screen.access
        ? screenSummary(link)
        : `${screenSummary(link)} · usage access is off`;

  return (
    <>
      <ConnectionRow title="screen time" sub={sub} onPress={onPhone ? () => setOpen(true) : undefined} />
      {onPhone && (
        <ScreenLinkSheet
          key={open ? 'open' : 'closed'}
          open={open}
          current={link}
          access={screen.access}
          apps={screen.apps}
          saving={screen.saving}
          onOpenAccess={screen.openAccess}
          onDismiss={() => setOpen(false)}
          onSave={async (next) => {
            try {
              await screen.save(next);
            } catch {
              say('the limit did not save. try again in a moment.');
              return;
            }
            setOpen(false);
            say(next ? `${habit.name} slips past ${next.limit} min a day.` : `${habit.name} has no screen-time limit now.`);
          }}
        />
      )}
    </>
  );
}
