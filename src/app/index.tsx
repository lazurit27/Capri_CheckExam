import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/SettingsContext';

const MIN_SPLASH_MS = 1800;


export default function Index() {
  const router = useRouter();
  const t = useTheme();
  const { user, booting } = useAuth();
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMinDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!minDone || booting) return;
    router.replace(user ? '/menu' : '/auth');
  }, [minDone, booting, user, router]);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <Image source={require('../../assets/images/CapriIndex.gif')} style={styles.gif} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gif: { width: 250, height: 250 },
});
