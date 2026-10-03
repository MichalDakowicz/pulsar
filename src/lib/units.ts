/**
 * What a counter habit counts.
 *
 * The presets are the words people reach for first. They are plural nouns that
 * read after a number ("8 glasses a day", "5 km a week"), because the unit is
 * shown mid-sentence on the card and in the builder's read-back. Anything that
 * is not here is typed by the user and kept as they wrote it, tidied.
 */
export const UNIT_PRESETS = [
  'glasses',
  'pages',
  'reps',
  'ml',
  'times',
  'cups',
  'litres',
  'sets',
  'steps',
  'km',
  'minutes',
  'hours',
  'words',
] as const;

/** Long enough for "push-ups" and "chapters", short enough to stay on one line of a card. */
export const UNIT_MAX = 20;

export function isPresetUnit(unit: string): boolean {
  return (UNIT_PRESETS as readonly string[]).includes(unit);
}

/**
 * A typed unit, ready to store: trimmed, inner runs of space collapsed, lower
 * case like the rest of the app's voice, and capped. Empty stays empty — the
 * builder refuses to move on with it rather than inventing a unit here.
 */
export function cleanUnit(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, UNIT_MAX).trim();
}
