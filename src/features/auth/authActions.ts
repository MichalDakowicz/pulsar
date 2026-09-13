import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

/**
 * Sign-in, against the account shared with Radar, Lidar and Sonar. There is no
 * Pulsar account to create — signing up here creates the one account, and
 * signing in with an existing one brings the profile and the friend list with
 * it (docs/shared-database.md).
 */

// Closes the auth popup on web once the redirect lands.
WebBrowser.maybeCompleteAuthSession();

/**
 * Browser-based OAuth through expo-web-browser + PKCE, the same path Radar
 * takes, rather than the native Google SDK. The native SDK gives a tighter
 * sheet but needs its own Google Cloud client (web client id, iOS client id,
 * Android SHA-1); this path needs only the Google provider already enabled on
 * the shared Supabase project — which it is, because Radar uses it.
 */
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(friendly(error.message));
  if (!data.url) throw new Error('google did not hand back a sign-in link.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  // Dismissed or cancelled is not a failure — the user closed the sheet.
  if (result.type !== 'success' || !result.url) return;

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code as string | undefined;
  if (!code) return;

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new Error(friendly(exchangeError.message));
}

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
  if (/provider is not enabled/i.test(message)) return 'google sign-in is not switched on for this project yet.';
  return message;
}
