import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/SettingsContext';
import { CyberButton, CyberInput, Frame, GlitchTitle, Txt, Typewriter } from '../components/ui';

export default function AuthScreen() {
  const t = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [mail, setMail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(mail.trim(), password);
      else await register(name.trim(), mail.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <GlitchTitle text="CAPRICHECK" size={34} />
        <Typewriter text="// VEHICLE DIAGNOSTIC TERMINAL" size={12} color={t.dim} />

        <Frame title={mode === 'login' ? 'ACCESS::LOGIN' : 'ACCESS::REGISTER'} style={{ marginTop: 32, padding: 16, paddingTop: 22 }}>
          {mode === 'register' && (
            <CyberInput label="USERNAME" value={name} onChangeText={setName} placeholder="v_choom" />
          )}
          <CyberInput label="E-MAIL" value={mail} onChangeText={setMail} keyboardType="email-address" autoComplete="email" placeholder="user@net.city" />
          <CyberInput label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" onSubmitEditing={submit} returnKeyType="go" />

          {error && <Txt color={t.crit} size={12} style={{ marginBottom: 10 }}>{'!! ' + error}</Txt>}

          <CyberButton label={busy ? 'CONNECTING...' : mode === 'login' ? 'LOGIN' : 'CREATE AN ACCOUNT'} onPress={submit} disabled={busy} />
        </Frame>

        <View style={{ marginTop: 18, alignItems: 'center' }}>
          <Txt
            size={12}
            color={t.dim}
            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          >
            {mode === 'login' ? "> Don't have an account? Register" : '> Already have an account? Login'}
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}