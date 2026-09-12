import { supabase } from '@/lib/supabase';

/**
 * Sign-in, against the account shared with Radar, Lidar and Sonar. There is no
 * Pulsar account to create — signing up here creates the one account, and
 * signing in with an existing one brings the profile and the friend list with
 * it (docs/shared-database.md).
 */

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
}

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Supabase phrases a few of these for a developer; these are for the person. */
function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'that email and password do not match.';
  if (/user already registered/i.test(message)) return 'there is already an account on that email. sign in instead.';
  if (/password should be at least/i.test(message)) return 'passwords need at least six characters.';
  return message;
}
