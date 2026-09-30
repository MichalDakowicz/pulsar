import type { ReturnOutcome } from '@/lib/pingApps';

/** The toast for a sibling sign-in that did not go through, in pulsar's voice. */
export function siblingFailureCopy(outcome: Exclude<ReturnOutcome, { kind: 'token' }>): string {
  if (outcome.kind === 'stale') return 'that sign-in ran out. try again.';
  const sibling = outcome.donor.name.toLowerCase();
  if (outcome.failure === 'signed-out') return `${sibling} is not signed in either. sign in here instead.`;
  return `${sibling} could not sign you in. try again.`;
}
