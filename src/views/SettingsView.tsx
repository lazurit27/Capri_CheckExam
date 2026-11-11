import React from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { CyberButton, Frame, Txt } from '../components/ui';
import { api } from '../api/client';
import { FAULT_POLL_MS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { SubHeader } from '../components/SubHeader';

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { theme: t, themeName, setThemeName, botEnabled, setBotEnabled } = useSettings();
  const { logout } = useAuth();
  const reset = () => Alert.alert('Reset all data?', 'All users, cars and records on this device will be deleted.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: async () => { await api.resetAll(); logout(); } },
  ]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <SubHeader title="Settings" onBack={onBack} />

      <Frame title="THEME">
        <View style={{ flexDirection: 'row' }}>
          <CyberButton label="Dark" small filled={themeName === 'dark'} onPress={() => setThemeName('dark')} style={{ flex: 1 }} />
          <CyberButton label="Light" small filled={themeName === 'light'} onPress={() => setThemeName('light')} style={{ flex: 1, marginLeft: 10 }} />
        </View>
      </Frame>

      <Frame title="CAPRI BOT" style={{ marginTop: 18 }}>
        <Txt size={12} color={t.dim} style={{ marginBottom: 10 }}>
          A flying assistant on the main screen. Can be disabled completely.
        </Txt>
        <CyberButton
          label={botEnabled ? 'BOT: ON' : 'BOT: OFF'}
          small
          filled={botEnabled}
          color={botEnabled ? t.bot : t.dim}
          onPress={() => setBotEnabled(!botEnabled)}
        />
      </Frame>

      <Frame title="SYSTEM" color={t.dim} style={{ marginTop: 18 }}>
        <Txt size={11} color={t.dim}>mode: LOCAL SIMULATION (no server)</Txt>
        <Txt size={11} color={t.dim}>error polling: every {FAULT_POLL_MS / 1000} seconds</Txt>
        <CyberButton label="RESET ALL DATA" small color={t.crit} onPress={reset} style={{ marginTop: 10 }} />
      </Frame>
    </ScrollView>
  );
}
