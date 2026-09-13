import { Redirect, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import GoogleIcon from '@/assets/brand/google.svg';
import Logo from '@/assets/brand/logo.svg';
import { ANDROID_METRICS } from '@/components/ui/controls';
import { useToast } from '@/components/ui/Toast';
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/features/auth/authActions';
import { useAuth } from '@/features/auth/AuthProvider';
import { MAX_W, useIsDesktop } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

// The auth archetype is shared with Radar, Lidar and Sonar (PING.md §10.G) — the
// same tile, the same card, the same four controls in the same order. Only the
// accent, the name, the tagline and Pulsar's lowercase voice differ.
export default function Login() {
  const { user } = useAuth();
  const { say } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [busy, setBusy] = useState(false);
  const isDesktop = useIsDesktop();

  if (user) return <Redirect href={'/' as Href} />;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      say(error instanceof Error ? error.message : 'that did not work.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!email || !password) {
      say('an email and a password, and you are in.');
      return;
    }
    void run(() => (mode === 'signIn' ? signInWithEmail(email, password) : signUpWithEmail(email, password)));
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerClassName="flex-grow items-center justify-center gap-10 px-6 py-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center gap-2">
            <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Logo width={48} height={48} />
            </View>
            <Text className="text-4xl font-bold tracking-tight text-foreground">pulsar</Text>
            <Text className="text-center text-muted-foreground">habits, and what it costs to drop one.</Text>
            {/* Worth saying up front: the four apps share one account, and
                someone who already has one should not make a second. */}
            <Text className="pt-1 text-center text-xs text-muted-foreground/70">
              the same account as radar, lidar and sonar — sign in with it and your profile and friends come
              with you.
            </Text>
          </View>

          {/* Capped and boxed so a wide browser shows a sign-in card rather than
              inputs stretched across the monitor. */}
          <View
            className={isDesktop ? 'w-full gap-3 rounded-2xl border border-border bg-card p-8' : 'w-full gap-3'}
            style={{ maxWidth: MAX_W.form }}
          >
            {/* Google first: it is the one most people already used to make the
                account in one of the other three apps. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="sign in with google"
              onPress={() => void run(signInWithGoogle)}
              disabled={busy}
              className="flex-row items-center justify-center gap-2 rounded-full bg-foreground py-3 active:opacity-80"
              style={{ opacity: busy ? 0.5 : 1 }}
            >
              <GoogleIcon width={18} height={18} />
              <Text className="font-medium text-background">sign in with google</Text>
            </Pressable>

            <View className="my-1 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-xs text-muted-foreground">or</Text>
              <View className="h-px flex-1 bg-border" />
            </View>

            {/* ANDROID_METRICS: Android's EditText does not vertically centre on
                its own, so without it the text sits low in the pill. */}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="rounded-full border border-border px-5 py-3 text-foreground"
              style={ANDROID_METRICS}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="password"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              secureTextEntry
              className="rounded-full border border-border px-5 py-3 text-foreground"
              style={ANDROID_METRICS}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? 'sign in with email' : 'create account'}
              onPress={submit}
              disabled={busy}
              className="flex-row items-center justify-center gap-2 rounded-full border border-border py-3 active:opacity-80"
              style={{ opacity: busy ? 0.5 : 1 }}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <Text className="font-medium text-foreground">
                  {mode === 'signIn' ? 'sign in with email' : 'create account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? 'create an account instead' : 'sign in instead'}
              onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              className="items-center py-1"
            >
              <Text className="text-sm text-muted-foreground">
                {mode === 'signIn' ? "don't have an account? sign up" : 'already have an account? sign in'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
