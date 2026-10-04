import { create } from 'zustand';

import type { HealthSource } from '@/lib/healthLink';

/**
 * How the last Health Connect read went, for the habit's page to say. Not
 * persisted: it describes this run of the app, and a stale "read 2 days ago"
 * from a previous launch would be a claim about a sync that is not happening.
 */

type HealthStatusState = {
  /** When a read last finished, ms. */
  lastRead: number | null;
  /** Linked sources Health Connect is not sharing — the link is there, the permission is not. */
  missing: HealthSource[];
  /** Bumped to ask for a read now, past the throttle. */
  nudge: number;
  requestRead: () => void;
  finished: (missing: HealthSource[]) => void;
};

export const useHealthStatus = create<HealthStatusState>()((set) => ({
  lastRead: null,
  missing: [],
  nudge: 0,
  requestRead: () => set((state) => ({ nudge: state.nudge + 1 })),
  finished: (missing) => set({ lastRead: Date.now(), missing }),
}));
