import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { ConnectionRow } from '@/features/health/ConnectionRow';
import { backgroundHealthAccess, openHealthSettings, requestBackgroundHealth } from '@/features/health/healthConnect';

/** Existing links can opt in without being unlinked and created again. */
export function BackgroundHealthRow() {
  const { say } = useToast();
  const [access, setAccess] = useState<'unavailable' | 'allowed' | 'denied' | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { void backgroundHealthAccess().then(setAccess).catch(() => setAccess('unavailable')); }, []);
  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  const allow = async () => {
    if (busy) return;
    if (access === 'allowed') { openHealthSettings(); return; }
    setBusy(true);
    const allowed = await requestBackgroundHealth();
    refresh();
    setBusy(false);
    if (!allowed) say('allow background health access in health connect to skip completed reminders.', { label: 'open settings', onPress: openHealthSettings });
  };
  return <ConnectionRow title="check before a reminder" sub={busy ? 'asking health connect…' : access === 'allowed'
    ? 'checks health while pulsar is closed and skips reminders already completed'
    : access === 'unavailable' ? 'background health reads need a newer health connect provider'
    : 'allow background health access to skip reminders already completed'}
    onPress={access && access !== 'unavailable' ? () => { void allow(); } : undefined} />;
}
