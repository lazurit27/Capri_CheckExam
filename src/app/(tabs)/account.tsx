import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { avatarUri } from '../../api/client';
import { BotBackdrop } from '../../bot/Bot';
import { CyberButton, Frame, Txt } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCars } from '../../context/CarContext';
import { useTheme } from '../../context/SettingsContext';

export default function AccountTab() {
  const t = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { car, cars } = useCars();

  const uri = avatarUri(user);

  const items = [
    { key: 'profile', label: '[PROFILE]', hint: '[username] · [password] · [pfp]', path: '/account/profile' },
    { key: 'cars', label: '[GARAGE]', hint: `${cars.length} [car] · [active]: ${car?.name ?? '—'}`, path: '/account/cars' },
    { key: 'notes', label: '[NOTES]', hint: '[car notes] · [your notes]', path: '/account/notes' },
    { key: 'settings', label: '[SETTINGS]', hint: '[theme] · [bot]', path: '/account/settings' },
  ] as const;

  return (
    <View style={{ flex: 1 }}>
      <BotBackdrop />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Frame title="USER://PROFILE">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 72, height: 72, borderWidth: 1, borderColor: t.primary, padding: 3 }}>
              {uri ? (
                <Image source={{ uri }} style={{ flex: 1 }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={28}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Txt>
                </View>
              )}
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Txt size={20} color={t.value}>{user?.name}</Txt>
              <Txt size={12} color={t.dim}>{user?.mail}</Txt>
            </View>
          </View>
        </Frame>

        {items.map(i => (
          <Pressable key={i.key} onPress={() => router.push(i.path as any)}>
            {({ pressed }) => (
              <Frame style={{ marginTop: 14, opacity: pressed ? 0.6 : 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Txt size={16} style={{ letterSpacing: 2 }}>{i.label}</Txt>
                    <Txt size={11} color={t.dim}>{i.hint}</Txt>
                  </View>
                  <Txt size={18}>{'>'}</Txt>
                </View>
              </Frame>
            )}
          </Pressable>
        ))}

        <CyberButton label="[EXIT]" color={t.crit} onPress={logout} style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}