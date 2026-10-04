/**
 * Kinds of workout, for links that only count some of them.
 *
 * Its own file because two sources filter by it — exercise minutes, and the
 * distance of the sessions that count — and neither owns it.
 */

/**
 * Exercise types as people say them. Health Connect has ninety-odd, down to
 * the left-arm dumbbell curl; nobody filters a habit by those. The groups are
 * what the chips offer and what a link stores, so a type Health Connect adds
 * later lands in `other` instead of being lost.
 */
export const ACTIVITY_GROUPS = [
  'walking',
  'running',
  'cycling',
  'strength',
  'classes',
  'yoga',
  'swimming',
  'hiking',
  'machines',
  'sports',
  'other',
] as const;

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number];

export const ACTIVITY_LABELS: Record<ActivityGroup, string> = {
  walking: 'walking',
  running: 'running',
  cycling: 'cycling',
  strength: 'strength',
  classes: 'hiit & classes',
  yoga: 'yoga & stretching',
  swimming: 'swimming',
  hiking: 'hiking',
  machines: 'cardio machines',
  sports: 'sports',
  other: 'anything else',
};

// Health Connect's ExerciseType numbers. Kept as numbers rather than imported
// constants so this file stays free of the native module.
const GROUP_TYPES: Record<Exclude<ActivityGroup, 'other'>, number[]> = {
  walking: [79],
  running: [56, 57],
  cycling: [8, 9],
  strength: [1, 3, 6, 7, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 30, 42, 43, 49, 67, 70, 77, 81],
  classes: [10, 12, 16, 26, 36, 40, 41],
  yoga: [33, 48, 71, 83],
  swimming: [73, 74],
  hiking: [37],
  machines: [25, 54, 68, 69],
  sports: [2, 4, 5, 11, 14, 27, 28, 29, 31, 32, 34, 35, 38, 39, 44, 46, 47, 50, 51, 52, 53, 55, 58, 59, 60, 61, 62, 63, 64, 65, 66, 72, 75, 76, 78, 80],
};

const TYPE_GROUP = new Map<number, ActivityGroup>(
  Object.entries(GROUP_TYPES).flatMap(([group, types]) => types.map((type) => [type, group as ActivityGroup] as const)),
);

export function activityGroup(exerciseType: number): ActivityGroup {
  return TYPE_GROUP.get(exerciseType) ?? 'other';
}

/** Every session, only the chosen kinds, or everything but them. */
export type ActivityMode = 'all' | 'only' | 'except';

/** Whether a session of this type counts, under a link's mode and kinds. */
export function counts(link: { mode: ActivityMode; activities: ActivityGroup[] }, exerciseType: number): boolean {
  if (link.mode === 'all') return true;
  const listed = link.activities.includes(activityGroup(exerciseType));
  return link.mode === 'only' ? listed : !listed;
}
