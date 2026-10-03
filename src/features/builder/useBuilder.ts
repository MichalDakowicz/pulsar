import { useCallback, useEffect, useRef, useState } from 'react';

import { blankBuilder, blocker, clauseBlocker, nextClause, type BuilderState, type Clause } from '@/lib/builder';

/** How long a picked chip stays on screen before the next clause takes over. */
const ADVANCE_MS = 320;

/**
 * The sentence builder's state, and how it moves between clauses.
 *
 * Every change goes through `apply`, which takes one of the moves in
 * `lib/builderEdits` — so a kind, a rhythm and a reminder can never be set
 * apart from what they drag along. `choose` is the same move followed by the
 * next clause, used when an answer leaves nothing else to ask: picking "every
 * day" on a new habit has no follow-up, so the builder goes on by itself. An
 * edit never moves on its own — someone fixing one clause wants to stay on it.
 */
export function useBuilder(initial: BuilderState | undefined, editing: boolean) {
  const [state, setState] = useState<BuilderState>(() => initial ?? blankBuilder());
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (advance.current) clearTimeout(advance.current);
    },
    [],
  );

  const go = useCallback((clause: Clause) => {
    if (advance.current) clearTimeout(advance.current);
    setState((current) => ({
      ...current,
      clause,
      seen: current.seen.includes(clause) ? current.seen : [...current.seen, clause],
    }));
  }, []);

  const apply = useCallback((move: (state: BuilderState) => BuilderState) => setState(move), []);

  const choose = useCallback(
    (move: (state: BuilderState) => BuilderState) => {
      setState(move);
      if (editing) return;
      if (advance.current) clearTimeout(advance.current);
      advance.current = setTimeout(() => {
        setState((current) => {
          const next = nextClause(current.clause);
          if (!next || clauseBlocker(current, current.clause)) return current;
          return { ...current, clause: next, seen: current.seen.includes(next) ? current.seen : [...current.seen, next] };
        });
      }, ADVANCE_MS);
    },
    [editing],
  );

  const next = nextClause(state.clause);

  return {
    state,
    apply,
    choose,
    go,
    /** The clause after this one, or null on the last. */
    next,
    /** Why the current clause cannot be left. */
    stuck: clauseBlocker(state, state.clause),
    /** Why the habit cannot be saved yet. */
    blocked: blocker(state),
  };
}
