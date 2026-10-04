import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addDays, dateKey } from '@/lib/dates';
import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * The days screen time has already slipped, per habit.
 *
 * It is the memory that makes a slip taken back stay taken back: the sync
 * writes a day once, and if you clear it from the wall the usage is still
 * over the limit, so without this the next foreground would slip it again.
 *
 * Device-local, because the usage it describes is this phone's. Pruned to two
 * weeks — the sync never reads back further than one.
 */

const KEEP_DAYS = 14;

type ScreenSlipsState = {
  written: Record<string, string[]>;
  mark: (habitId: string, days: string[]) => void;
};

export const useScreenSlips = create<ScreenSlipsState>()(
  persist(
    (set) => ({
      written: {},
      mark: (habitId, days) =>
        set((state) => {
          const floor = addDays(dateKey(), -KEEP_DAYS);
          const next = [...new Set([...(state.written[habitId] ?? []), ...days])].filter((day) => day >= floor).sort();
          return { written: { ...state.written, [habitId]: next } };
        }),
    }),
    { name: 'screen-slips', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);
