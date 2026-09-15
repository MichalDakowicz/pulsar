import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/lib/mmkvStorage';
import type { RadarFace } from '@/lib/siblingStreaks';

/**
 * Which of Radar's two streaks the "elsewhere" slot is showing.
 *
 * A UI preference, so MMKV rather than the account: which side of a card you
 * last turned over is not a fact about you, and it has no business on a row
 * three other apps read. It is persisted all the same — a slot that flips back
 * to films every time Today remounts makes the swipe feel broken rather than
 * remembered.
 */

type RadarFaceState = {
  face: RadarFace | null;
  setFace: (face: RadarFace | null) => void;
};

export const useRadarFace = create<RadarFaceState>()(
  persist(
    (set) => ({
      // Null rather than 'films': the first render should take whichever face
      // is actually on offer, which is not always the film one.
      face: null,
      setFace: (face) => set({ face }),
    }),
    { name: 'radar-face', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);
