import { stepSizes } from '@/lib/weekTarget';

/**
 * The rules behind one habit card: what ground it sits on, what the button in
 * its corner does, and which square of its wall is outlined as the open day.
 *
 * Kept out of the component so the three can never disagree — a card painted
 * done whose button still offers "not today" is a card that has two answers.
 */

export type DayAnswer = 'held' | 'frozen' | 'repaired' | 'skipped' | 'broke' | 'due' | 'rest';

export type CardInput = {
  today: DayAnswer;
  atRisk: boolean;
  /** Whether the day's answer can be taken back for free. */
  undoable: boolean;
  /** A week-scoped counter: a logged day is a contribution, not a finish. */
  weekly: boolean;
  weekAmount: number;
  weekTarget: number;
};

/** `done` tints the card, `aside` dims it, `risk` is the one red ground. */
export type CardTone = 'open' | 'done' | 'aside' | 'risk';

export function cardTone(input: CardInput): CardTone {
  if (input.today === 'skipped') return 'aside';
  if (isDone(input)) return 'done';
  if (input.atRisk) return 'risk';
  return 'open';
}

/**
 * Whether the card reads as finished. On a weekly target the day is `held` the
 * moment anything is logged, so the week is what has to add up first.
 */
export function isDone(input: CardInput): boolean {
  if (input.weekly) return input.weekTarget > 0 && input.weekAmount >= input.weekTarget;
  return input.today === 'held' || input.today === 'repaired';
}

/**
 * The corner button on a card that is not counting.
 *
 * `skip` sets the day aside, the two undos give an answer back, and the three
 * static states show the answer without offering to change it — a freeze and a
 * repair spent a token, and a button that pretends it can refund one is a lie.
 */
export type CardAction = 'skip' | 'undo-done' | 'undo-skip' | 'undo-slip' | 'held' | 'frozen' | 'none';

export function cardAction(input: CardInput, canSkip: boolean): CardAction {
  switch (input.today) {
    case 'due':
      return canSkip ? 'skip' : 'none';
    case 'held':
    case 'repaired':
      return input.undoable ? 'undo-done' : 'held';
    case 'skipped':
      return input.undoable ? 'undo-skip' : 'none';
    case 'broke':
      return input.undoable ? 'undo-slip' : 'none';
    case 'frozen':
      return 'frozen';
    case 'rest':
      return 'none';
  }
}

/**
 * Which way the open day is outlined on the wall, or null. Only a day still
 * waiting on an answer gets the accent ring; a day set aside keeps a quiet one
 * so it is still findable, and an answered day needs no ring — its colour is
 * the answer.
 */
export function openDayRing(input: CardInput): 'accent' | 'muted' | null {
  if (input.today === 'skipped') return 'muted';
  if (input.today === 'due') return 'accent';
  if (input.weekly && !isDone(input) && input.today === 'held') return 'accent';
  return null;
}

/**
 * The line under a counter's name. The period is always said — "12 / 20" with
 * no period is the label someone reads as a day and plans a week around.
 */
export function counterLine(opts: {
  weekly: boolean;
  amount: number;
  target: number;
  weekAmount: number;
  weekTarget: number;
  unit: string;
}): string {
  if (opts.weekly) {
    const head = `${opts.weekAmount} / ${opts.weekTarget} ${opts.unit} this week`;
    return opts.amount > 0 ? `${head} · ${opts.amount} today` : head;
  }
  return `${opts.amount} / ${opts.target} ${opts.unit} today`;
}

/**
 * What a long press on the plus adds: the biggest jump the target warrants, so
 * two hundred press-ups do not take two hundred taps. One when the target is
 * too small to have a jump worth offering.
 */
export function bigStep(owed: number): number {
  const sizes = stepSizes(owed);
  return sizes[sizes.length - 1] ?? 1;
}
