import { useState } from 'react';
import { View } from 'react-native';

import { SheetDialog } from '@/components/ui/SheetDialog';
import { useToast } from '@/components/ui/Toast';
import { signOut, type SignOutScope } from '@/features/auth/authActions';
import { SignOutScopePicker } from '@/features/auth/SignOutScopePicker';

type SignOutSheetProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * The sign-out sheet and the question it asks: just pulsar, or every ping app.
 * Closing puts it back on "just pulsar", so the reach-everywhere answer is
 * always a choice someone made, never one left over from last time.
 */
export function SignOutSheet({ open, onClose }: SignOutSheetProps) {
  const { say } = useToast();
  const [scope, setScope] = useState<SignOutScope>('local');

  const close = () => {
    setScope('local');
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      title="sign out?"
      body="your habits and streaks stay where they are. the same account signs back in."
      confirmLabel={scope === 'local' ? 'sign out of pulsar' : 'sign out everywhere'}
      dismissLabel="stay"
      tone="destructive"
      onConfirm={async () => {
        const chosen = scope;
        close();
        try {
          await signOut(chosen);
        } catch (error) {
          say(error instanceof Error ? error.message : 'that did not work.');
        }
      }}
      onDismiss={close}
    >
      <View className="mt-4">
        <SignOutScopePicker value={scope} onChange={setScope} />
      </View>
    </SheetDialog>
  );
}
