import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * How far back Stats looks. A UI preference, so it lives in MMKV rather than on
 * the account — which range you last looked at is not a fact about you.
 */

export type StatsRange = '4w' | '12w' | '1y';

export const RANGE_WEEKS: Record<StatsRange, number> = { '4w': 4, '12w': 12, '1y': 52 };
export const RANGE_LABELS: Record<StatsRange, string> = {
  '4w': 'four weeks',
  '12w': 'twelve weeks',
  '1y': 'a year',
};

type StatsRangeState = {
  range: StatsRange;
  setRange: (range: StatsRange) => void;
};

export const useStatsRange = create<StatsRangeState>()(
  persist(
    (set) => ({
      range: '12w',
      setRange: (range) => set({ range }),
    }),
    { name: 'stats-range', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);

/**
 * The range picker is mounted once in the tabs layout so the nav island's left
 * action can open it from any route; this is the handle it registers.
 */
type SheetState = {
  present: (() => void) | null;
  setPresent: (present: (() => void) | null) => void;
};

export const useStatsRangeSheet = create<SheetState>((set) => ({
  present: null,
  setPresent: (present) => set({ present }),
}));
