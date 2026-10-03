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
 */
export type CardLayout = 'calendar' | 'tagged' | 'both';

/** How a habit checked more than once a day shows its checks: bars, or a sun and a moon. */
export type StepStyle = 'pips' | 'sunmoon';

type CardLookState = {
  layout: CardLayout;
  stepStyle: StepStyle;
  setLayout: (layout: CardLayout) => void;
  setStepStyle: (stepStyle: StepStyle) => void;
};

export const useCardLook = create<CardLookState>()(
  persist(
    (set) => ({
      layout: 'calendar',
      stepStyle: 'pips',
      setLayout: (layout) => set({ layout }),
      setStepStyle: (stepStyle) => set({ stepStyle }),
    }),
    { name: 'card-look', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);
