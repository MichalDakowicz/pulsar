import { useColorScheme } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

function cachedTheme(): ThemePref {
  const stored = storage.getString(THEME_KEY);
  return stored === 'dark' || stored === 'light' || stored === 'system' ? stored : DEFAULT_THEME;
}

/**
 * The theme, shared with the three sibling apps through `user_settings.theme` —
 * picking light here picks light in Radar too, on purpose
 * (docs/shared-database.md).
 *
 * The server row is the value, not a copy of it: `useUserSettings` updates its
 * cache optimistically, so a tap is instant without this holding state of its
 * own. MMKV is only consulted for the first frame, because the row arrives a
 * round trip after the first paint and a cold start that flashes dark before
 * settling on light is worse than a cache one session out of date.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { settings, loading, updateSettings } = useUserSettings();
  const [initial] = useState(cachedTheme);

  const theme: ThemePref = loading ? initial : settings.theme;

  useEffect(() => {
    setColorScheme(theme);
    storage.set(THEME_KEY, theme);
  }, [theme, setColorScheme]);

  const setTheme = useCallback(
    (next: ThemePref) => {
      storage.set(THEME_KEY, next);
      void updateSettings({ theme: next });
    },
    [updateSettings],
  );

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

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

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
