import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { Scanlines } from '../components/Scanlines';
import { fonts } from '../constants/fonts';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CarProvider } from '../context/CarContext';
import { SettingsProvider, useSettings } from '../context/SettingsContext';
import { TelemetryProvider } from '../context/TelemetryContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

 
  if (!loaded && !error) return null;

  return (
    <SettingsProvider>
      <AuthProvider>
        <CarProvider>
          <TelemetryProvider>
            <ThemedNavigation />
          </TelemetryProvider>
        </CarProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

function ThemedNavigation() {
  const { theme } = useSettings();
  const dark = theme.name === 'dark';


  const navTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: theme.bg, card: theme.bg, text: theme.primary, primary: theme.primary, border: theme.dim },
    };
  }, [dark, theme]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <AuthGate />
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="account/profile" />
          <Stack.Screen name="account/cars" />
          <Stack.Screen name="account/notes" />
          <Stack.Screen name="account/settings" />
        </Stack>
        {/* размытые линии поверх всех экранов, касаний не перехватывают */}
        <Scanlines />
      </View>
    </ThemeProvider>
  );
}


function AuthGate() {
  const { user, booting } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] as string | undefined;

  useEffect(() => {
    if (booting || first === undefined) return;
    if (!user && first !== 'auth') router.replace('/auth');
    else if (user && first === 'auth') router.replace('/menu');
  }, [user, booting, first, router]);

  return null;
}
