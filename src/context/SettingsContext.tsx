import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { darkTheme, lightTheme, Theme, ThemeName } from '../constants/theme';

interface Settings {
  themeName: ThemeName;
  theme: Theme;
  botEnabled: boolean;
  setThemeName: (t: ThemeName) => void;
  setBotEnabled: (v: boolean) => void;
}

const KEY = 'capricheck.settings';
const Ctx = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('dark');
  const [botEnabled, setBotEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.themeName === 'light' || s.themeName === 'dark') setThemeName(s.themeName);
        if (typeof s.botEnabled === 'boolean') setBotEnabled(s.botEnabled);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify({ themeName, botEnabled })).catch(() => {});
  }, [themeName, botEnabled, loaded]);

  const value = useMemo<Settings>(() => ({
    themeName,
    theme: themeName === 'dark' ? darkTheme : lightTheme,
    botEnabled,
    setThemeName,
    setBotEnabled,
  }), [themeName, botEnabled]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings вне SettingsProvider');
  return v;
}

export const useTheme = () => useSettings().theme;
