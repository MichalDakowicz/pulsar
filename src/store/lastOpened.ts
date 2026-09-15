import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { dateKey } from '@/lib/dates';
import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * When the app was last opened, so a gap can be told from a lazy morning.
 *
 * Two fields rather than one, and that is the whole trick: `open` rolls the
 * previous stamp into `lastOpenedOn` before writing today's. Stamping a single
 * field on launch would overwrite the very thing the backfill window is
 * measured from, and every window would come out exactly one day wide.
 *
 * Device-local on purpose — "did this phone see the app on tuesday" is a fact
 * about the phone, not about the account, and `user_settings` is Radar's table.
 */

type LastOpenedState = {
  /** The day the app was opened before this run. Null on a first ever launch. */
  lastOpenedOn: string | null;
  /** The day this run stamped. A second call on the same day is a no-op. */
  openedOn: string | null;
  open: (day?: string) => void;
};

export const useLastOpened = create<LastOpenedState>()(
  persist(
    (set, get) => ({
      lastOpenedOn: null,
      openedOn: null,
      open: (day = dateKey()) => {
        const { openedOn } = get();
        if (openedOn === day) return;
        set({ lastOpenedOn: openedOn, openedOn: day });
      },
    }),
    { name: 'last-opened', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);
