import { builderTarget, type BuilderState, type Clause } from '@/lib/builder';
import { rhythmOf, strictnessOf, type Strictness } from '@/lib/builderEdits';
import { cadenceLabel } from '@/lib/schedule';
import { cleanUnit } from '@/lib/units';

/** The builder's draft in words: the sentence it is drawn as, and the pledge it offers. */

/** What each stop does, at the unit the habit is judged in — weeks for a weekly one. */
export function strictnessCaption(level: Strictness, week: boolean): string {
  switch (level) {
    case 'gentle':
      return week ? 'a short week takes three days off the count, not everything.' : 'a miss takes three days off the count, not everything.';
    case 'fair':
      return week
        ? 'a short week after a kept one is forgiven. two short weeks in a row break it.'
        : 'the first miss of each week is forgiven automatically.';
    case 'strict':
      return 'one miss and the streak is gone. a freeze token can still cover a day you know you will lose.';
    case 'hard':
      return 'strict, and no freeze token can save it.';
  }
}

/* ── the sentence ────────────────────────────────────────────────────────── */

function nudgeWords(state: BuilderState): string {
  if (state.window === 'anytime' || state.times.length === 0) return 'no nudges';
  if (state.window === 'morning') return 'nudged in the morning';
  if (state.window === 'evening') return 'nudged in the evening';
  const times = state.times.length > 2 ? `${state.times[0]} +${state.times.length - 1}` : state.times.join(' & ');
  return `nudged at ${times}`;
}

function stakesWords(state: BuilderState): string {
  const week = rhythmOf(state) === 'total' || state.cadence.kind === 'weekly';
  switch (strictnessOf(state)) {
    case 'gentle':
      return week ? 'a short week costs three days' : 'a miss costs three days';
    case 'fair':
      return week ? 'one short week forgiven' : 'one miss a week forgiven';
    case 'strict':
      return week ? 'a short week ends it' : 'a miss ends it';
    case 'hard':
      return 'a miss ends it, no freezes';
  }
}

/** Each clause of the sentence, in words. The screen draws these as the tabs. */
export function sentence(state: BuilderState): Record<Clause, string> {
  const unit = cleanUnit(state.unit) || '…';
  const measure =
    state.kind === 'avoid'
      ? 'stay off it'
      : state.kind === 'count'
        ? `${builderTarget(state)} ${unit}`
        : state.kind === 'timer'
          ? `${builderTarget(state)} min`
          : state.checksPerDay === 2
            ? 'twice a day'
            : state.checksPerDay === 3
              ? 'three times a day'
              : 'check it off';
  return {
    name: state.name.trim() || 'name it',
    measure,
    rhythm: rhythmOf(state) === 'total' ? 'over the week' : cadenceLabel(state.cadence),
    nudge: nudgeWords(state),
    stakes: stakesWords(state),
  };
}

/**
 * The pledge, written for you when you have not written your own. A sentence
 * about your word, read back on the night a streak is about to break.
 */
export function suggestedPledge(state: BuilderState): string {
  const name = state.name.trim() || 'this habit';
  const verb = state.kind === 'avoid' ? 'stay off' : 'do';
  const when = rhythmOf(state) === 'total' ? `${builderTarget(state)} ${state.kind === 'timer' ? 'min' : cleanUnit(state.unit)} a week` : cadenceLabel(state.cadence);
  const consequence =
    strictnessOf(state) === 'hard' || strictnessOf(state) === 'strict'
      ? 'and if i miss one, it goes back to zero and i start again'
      : strictnessOf(state) === 'fair'
        ? 'and i get one forgiven miss, not two'
        : 'and a miss costs me three days off the count';
  return `i will ${verb} ${name} ${when}, ${consequence}.`;
}
