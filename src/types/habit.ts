import type { Phase } from '@/lib/phases';
import type { Cadence } from '@/lib/schedule';
import type { EntryState, StreakRule } from '@/lib/streak';

/**
 * How a day is judged. The distinction is not decoration: `count` and `timer`
 * habits can be *partially* done, which is a state the wall paints and the row
 * shows progress for, while `do` and `avoid` are binary.
 */
export type HabitKind = 'do' | 'avoid' | 'count' | 'timer';

/** When nudges land. `anytime` means the habit has no clock, so it has no reminder. */
export type NudgeWindow = 'exact' | 'morning' | 'evening' | 'anytime';

/** A fixed-length run, or open-ended. A finished challenge is a habit that graduated. */
export type Challenge = 'open' | '30' | '66' | '100';

export type Habit = {
  id: string;
  userId: string;
  name: string;
  /** Key into MARKS (components/marks). */
  mark: string;
  kind: HabitKind;
  /** Amount for `count`, minutes for `timer`, 1 for `do` / `avoid`. */
  target: number;
  /** Only meaningful for `count` — "glasses", "pages", "reps". */
  unit: string;
  cadence: Cadence;
  /**
   * Stretches of the past still judged by rules this habit has since changed,
   * oldest first and never overlapping. Empty on a habit whose rules have only
   * ever been corrected rather than changed — see lib/phases.
   */
  phases: Phase[];
  challenge: Challenge;
  window: NudgeWindow;
  /** `HH:MM`, sorted. Empty when the window is `anytime` — no clock, no nudge. */
  times: string[];
  escalate: boolean;
  rule: StreakRule;
  /** No freeze tokens on this habit, and a miss is always strict. */
  hard: boolean;
  /** Visible on the shelf friends can see, subject to the shared privacy switch. */
  publicShelf: boolean;
  /** The "mark my word" line, read back on the night a streak is about to break. */
  pledge: string;
  why: string;
  startedOn: string;
  archivedAt: string | null;
  sort: number;
};

export type HabitEntry = {
  habitId: string;
  day: string;
  state: EntryState;
  /** What was logged, for `count` / `timer`. 1 for a plain hold. */
  amount: number;
  at: string;
};

/** A habit as Today sees it: the rules already applied, nothing left to compute. */
export type HabitToday = {
  habit: Habit;
  state: EntryState | 'due' | 'at-risk' | 'rest';
  streak: number;
  best: number;
  rate: number;
  amount: number;
  /** 0–1 of the day's target. Drives the row fill and the partial wall cell. */
  progress: number;
  atRisk: boolean;
};
