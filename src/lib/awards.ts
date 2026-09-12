import { TIERS, TIER_NAMES } from '@/lib/tiers';

/**
 * Achievements. Eight of them, evaluated from figures the rest of the app has
 * already computed — nothing here re-walks a calendar, so an award can never
 * disagree with the streak it is celebrating.
 */

export type AwardKey =
  | 'week'
  | 'month'
  | 'hundred'
  | 'year'
  | 'sweep'
  | 'noFreeze'
  | 'comeback'
  | 'pactKeeper';

export type Award = {
  key: AwardKey;
  name: string;
  /** What it took, or what is left to take. */
  hint: string;
  earned: boolean;
  /** 0–1 toward earning it, for the ones worth showing a bar for. */
  progress: number;
};

export type AwardInput = {
  /** Best streak on any habit, ever. The four tier awards read off this. */
  bestStreak: number;
  /** Days where every habit that was due got held. */
  perfectDays: number;
  /** Longest run of held days with no freeze token spent on it. */
  cleanRun: number;
  /** True once a habit has been rebuilt past 7 days after breaking from 7 or more. */
  rebuilt: boolean;
  /** Longest run of days a pact has been kept by both sides. */
  pactRun: number;
};

const SWEEP_TARGET = 14;
const NO_FREEZE_TARGET = 30;
const PACT_TARGET = 30;

function ratio(value: number, target: number): number {
  return Math.min(1, Math.max(0, value / target));
}

export function evaluateAwards(input: AwardInput): Award[] {
  const tiers = TIERS.map<Award>((tier) => ({
    key: (tier === 7 ? 'week' : tier === 30 ? 'month' : tier === 100 ? 'hundred' : 'year') as AwardKey,
    name: TIER_NAMES[tier],
    hint: input.bestStreak >= tier ? 'cleared' : `${tier - input.bestStreak} days to go`,
    earned: input.bestStreak >= tier,
    progress: ratio(input.bestStreak, tier),
  }));

  return [
    ...tiers,
    {
      key: 'sweep',
      name: 'clean sweep',
      hint:
        input.perfectDays >= SWEEP_TARGET
          ? `${SWEEP_TARGET} perfect days`
          : `${SWEEP_TARGET - input.perfectDays} perfect days to go`,
      earned: input.perfectDays >= SWEEP_TARGET,
      progress: ratio(input.perfectDays, SWEEP_TARGET),
    },
    {
      key: 'noFreeze',
      name: 'no freeze',
      hint:
        input.cleanRun >= NO_FREEZE_TARGET
          ? `${NO_FREEZE_TARGET} days, no token`
          : `${NO_FREEZE_TARGET} days without spending one`,
      earned: input.cleanRun >= NO_FREEZE_TARGET,
      progress: ratio(input.cleanRun, NO_FREEZE_TARGET),
    },
    {
      key: 'comeback',
      name: 'comeback',
      hint: input.rebuilt ? 'rebuilt after a break' : 'rebuild a broken streak past a week',
      earned: input.rebuilt,
      progress: input.rebuilt ? 1 : 0,
    },
    {
      key: 'pactKeeper',
      name: 'pact keeper',
      hint:
        input.pactRun >= PACT_TARGET
          ? `${PACT_TARGET} days with a partner`
          : `${PACT_TARGET} days with a partner`,
      earned: input.pactRun >= PACT_TARGET,
      progress: ratio(input.pactRun, PACT_TARGET),
    },
  ];
}

/**
 * An award nobody can reach yet is noise, not a goal. `pactKeeper` is hidden
 * until a pact exists, for the same reason the Social screen hides the pact
 * section until then — an app that shows you a locked door to a room that has
 * not been built reads as broken rather than aspirational.
 */
export function visibleAwards(awards: Award[], options: { hasPacts: boolean }): Award[] {
  return awards.filter((award) => award.key !== 'pactKeeper' || options.hasPacts || award.earned);
}

export function earnedCount(awards: Award[]): number {
  return awards.filter((award) => award.earned).length;
}
