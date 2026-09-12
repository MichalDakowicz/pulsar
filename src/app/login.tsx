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
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Field } from '@/components/ui/controls';
import { useToast } from '@/components/ui/Toast';
import { signInWithEmail, signUpWithEmail } from '@/features/auth/authActions';
import { useAuth } from '@/features/auth/AuthProvider';
import { MAX_W, useIsDesktop } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

export default function Login() {
  const { user } = useAuth();
  const { say } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [busy, setBusy] = useState(false);
  const isDesktop = useIsDesktop();

  if (user) return <Redirect href={'/' as Href} />;

  const submit = async () => {
    if (!email || !password) {
      say('an email and a password, and you are in.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signIn') await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
    } catch (error) {
      say(error instanceof Error ? error.message : 'that did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerClassName="flex-grow items-center justify-center gap-10 px-6 py-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center gap-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <View className="h-5 w-5 rounded-full bg-primary" />
            </View>
            <Text className="text-4xl font-bold tracking-tight text-foreground">pulsar</Text>
            <Text className="text-sm text-muted-foreground">habits, and what it costs to drop one.</Text>
            {/* Worth saying up front: the four apps share one account, and
                someone who already has one should not make a second. */}
            <Text className="pt-1 text-center text-xs text-muted-foreground/70">
              the same account as radar, lidar and sonar — sign in with it and your profile and friends
              come with you.
            </Text>
          </View>

          <View
            className={isDesktop ? 'w-full gap-3 rounded-2xl border border-border bg-card p-8' : 'w-full gap-3'}
            style={{ maxWidth: MAX_W.form }}
          >
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="password"
              autoCapitalize="none"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              secureTextEntry
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? 'sign in' : 'create the account'}
              onPress={submit}
              disabled={busy}
              className="items-center rounded-full bg-primary py-3.5"
              style={{ opacity: busy ? 0.6 : 1 }}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.accentInk} />
              ) : (
                <Text className="text-sm font-bold text-primary-foreground">
                  {mode === 'signIn' ? 'sign in' : 'create the account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'signIn' ? 'create an account instead' : 'sign in instead'}
              onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              hitSlop={8}
              className="items-center py-2"
            >
              <Text className="text-xs text-muted-foreground">
                {mode === 'signIn' ? 'no account yet? create one' : 'already have one? sign in'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
