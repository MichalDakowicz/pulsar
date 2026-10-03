import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * How a habit card is drawn. A UI preference, so it lives in MMKV rather than
 * on the account — which shape of card you like to look at is not a fact about
 * your habits.
 *
 * - `calendar` is the card with four months of wall underneath it.
 * - `tagged` is one compact row: the name, the type tags and a meter shaped
 *   like the habit, and no wall.
 * - `both` is the tagged row with the wall still under it.
 *
 * How a habit checked more than once a day draws its checks is not here: the
 * habit says whether it is morning and night (a sun and a moon) or plain (bars).
 */
export type CardLayout = 'calendar' | 'tagged' | 'both';

type CardLookState = {
  layout: CardLayout;
  setLayout: (layout: CardLayout) => void;
};

export const useCardLook = create<CardLookState>()(
  persist(
    (set) => ({
      layout: 'calendar',
      setLayout: (layout) => set({ layout }),
    }),
    { name: 'card-look', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);
