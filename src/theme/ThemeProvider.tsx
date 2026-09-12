import { useColorScheme } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

import { useUserSettings } from '@/hooks/useUserSettings';
import type { ThemePref } from '@/lib/userSettings';

import { rawThemeVars, themeVars } from './colors';

const storage = createMMKV({ id: 'pulsar-theme' });
const THEME_KEY = 'theme_preference';
const DEFAULT_THEME: ThemePref = 'dark';

type ThemeContextValue = {
  theme: ThemePref;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemePref) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  resolvedTheme: 'dark',
  setTheme: () => {},
});

/**
 * The theme, which is shared with the three sibling apps through
 * `user_settings.theme` — picking light here picks light in Radar too, on
 * purpose (docs/shared-database.md).
 *
 * MMKV still holds a copy, and it is not redundant: the server row arrives a
 * network round-trip after the first paint, and a cold start that flashes dark
 * before settling on light is worse than a cache that is occasionally a session
 * out of date.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { settings, updateSettings } = useUserSettings();
  const [theme, setThemeState] = useState<ThemePref>(() => {
    const stored = storage.getString(THEME_KEY);
    return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : DEFAULT_THEME;
  });

  // The server row wins once it lands, because it is the one the other three
  // apps read.
  useEffect(() => {
    if (settings.theme === theme) return;
    storage.set(THEME_KEY, settings.theme);
    setThemeState(settings.theme);
    // Only the shared row may drive this effect; adding `theme` would make the
    // local pick immediately fight the stale server value it has not saved yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.theme]);

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  const setTheme = (next: ThemePref) => {
    storage.set(THEME_KEY, next);
    setThemeState(next);
    void updateSettings({ theme: next });
  };

  const resolvedTheme: 'dark' | 'light' = colorScheme === 'light' ? 'light' : 'dark';

  // react-native-web portals a Modal to a node appended to document.body,
  // outside the themed View below. CSS custom properties cascade through DOM
  // ancestry, not React context, so a dialog would otherwise render with no
  // --card and no --background at all.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    for (const [name, value] of Object.entries(rawThemeVars[resolvedTheme])) {
      document.documentElement.style.setProperty(name, value);
    }
  }, [resolvedTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={themeVars[resolvedTheme]} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
