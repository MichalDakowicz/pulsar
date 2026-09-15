import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { ReminderSync } from '@/features/notifications/ReminderSync';
import { queryClient } from '@/lib/queryClient';
import { useLastOpened } from '@/store/lastOpened';
import { ThemeProvider } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const open = useLastOpened((state) => state.open);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Stamped once auth resolves rather than on import: it is what the backfill
  // window on a habit's wall is measured from, and a signed-out launch has
  // nothing to fill in.
  useEffect(() => {
    if (!loading) open();
  }, [loading, open]);

  // Nothing mounts until auth resolves, so no screen ever renders a signed-out
  // shape and then swaps.
  if (loading) return null;

  return <>{children}</>;
}

/**
 * The shell, top to bottom. There is no header anywhere in this app — the nav
 * islands are the only chrome, and every screen starts with its own ScreenTop.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <AuthGate>
                  <ReminderSync />
                  <Stack screenOptions={{ headerShown: false }} />
                </AuthGate>
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
