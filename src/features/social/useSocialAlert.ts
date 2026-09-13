import { useNudges } from '@/features/social/useNudges';
import { usePendingPacts } from '@/features/social/usePacts';

/**
 * Whether the Social destination should carry its alert dot.
 *
 * Two things earn it and nothing else: a pact invite waiting on you, and a nudge
 * you have not seen. A friend simply holding their habit does not — a dot that
 * lights up for other people's routine activity is a dot you learn to ignore,
 * and then it cannot tell you the thing that mattered.
 */
export function useSocialAlert(): boolean {
  const { pending } = usePendingPacts();
  const { unseen } = useNudges();
  return pending.length > 0 || unseen.length > 0;
}
