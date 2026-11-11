import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { api } from '../api/client';
import { CyberButton, CyberInput, Frame, Txt } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/SettingsContext';
import { SubHeader } from '../components/SubHeader';

const ALLOWED = ['png', 'jpg', 'jpeg', 'webp'];
const MIME_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function ProfileView({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<string>) => {
    setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  const pickAvatar = () => run(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('No access to the gallery');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled) return 'cancelled';
    const a = res.assets[0];
    const fromMime = a.mimeType ? MIME_EXT[a.mimeType.toLowerCase()] : undefined;
    const ext = fromMime ?? (a.fileName ?? a.uri).split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED.includes(ext)) throw new Error(`Format .${ext} is not accepted (png/jpg/webp)`);
    const mime = a.mimeType ?? (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const u = await api.uploadAvatar(a.uri, `avatar.${ext}`, mime, a.fileSize);
    setUser(u);
    return 'avatar updated';
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <SubHeader title="PROFILE" onBack={onBack} />

      <Frame title="AVATAR">
        <Txt size={11} color={t.dim} style={{ marginBottom: 10 }}>PNG / JPG / WEBP, up to 2 MB</Txt>
        <CyberButton label="PICK IMAGE" small onPress={pickAvatar} />
      </Frame>

      <Frame title="NICKNAME" style={{ marginTop: 18, paddingTop: 20 }}>
        <CyberInput label="NEW USERNAME" value={name} onChangeText={setName} />
        <CyberButton label="SAVE USERNAME" small onPress={() => run(async () => { setUser(await api.changeName(name.trim())); return 'username changed'; })} />
      </Frame>

      <Frame title="PASSWORD" style={{ marginTop: 18, paddingTop: 20 }}>
        <CyberInput label="OLD PASSWORD" value={oldPwd} onChangeText={setOldPwd} secureTextEntry />
        <CyberInput label="NEW PASSWORD" value={newPwd} onChangeText={setNewPwd} secureTextEntry />
        <CyberButton label="CHANGE PASSWORD" small onPress={() => run(async () => {
          await api.changePassword(oldPwd, newPwd);
          setOldPwd(''); setNewPwd('');
          return 'password changed';
        })} />
      </Frame>

      {msg && <Txt color={msg.ok ? t.primary : t.crit} size={12} style={{ marginTop: 14 }}>{(msg.ok ? '> ' : '!! ') + msg.text}</Txt>}
    </ScrollView>
  );
}
