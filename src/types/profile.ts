/**
 * The shared `public.profiles` row, as Pulsar sees it.
 *
 * `favorites` is deliberately absent: it is Radar's column, it holds films, and
 * docs/shared-database.md puts it off limits. Not selecting it is cheaper than
 * remembering not to write it.
 */
export type Profile = {
  id: string;
  username: string;
  displayName: string | null;
  pfp: string | null;
  createdAt: string;
};
