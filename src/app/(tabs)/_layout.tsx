import { usePathname } from 'expo-router';
import { Tabs, type BottomTabBarButtonProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot } from '../../bot/Bot';
import { Header } from '../../components/Chrome';
import { Txt } from '../../components/ui';
import { useCars } from '../../context/CarContext';
import { useTheme } from '../../context/SettingsContext';

export default function TabsLayout() {
  const t = useTheme();
  const { activeFaults } = useCars();
  const pathname = usePathname();
  const isMenu = pathname === '/menu' || pathname === '/';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Header />
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarShowLabel: false,
              tabBarStyle: {
                backgroundColor: t.bg,
                borderTopWidth: 1,
                borderTopColor: t.primary,
                height: 56,
              },
            }}
          >
            <Tabs.Screen
              name="menu"
              options={{ tabBarButton: props => <TabButton {...props} label="[MENU]" active={isMenu} /> }}
            />
            <Tabs.Screen
              name="faults"
              options={{
                tabBarButton: props => (
                  <TabButton {...props} label="[ERR]" active={pathname === '/faults'} badge={activeFaults.length} />
                ),
              }}
            />
            <Tabs.Screen
              name="account"
              options={{ tabBarButton: props => <TabButton {...props} label="[ACC]" active={pathname === '/account'} /> }}
            />
          </Tabs>
        </View>
      </SafeAreaView>
      <Bot mode={isMenu ? 'fore' : 'back'} />
    </View>
  );
}

function TabButton({ label, active, onPress, badge }: BottomTabBarButtonProps & {
  label: string; active: boolean; badge?: number;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.barItem} accessibilityRole="tab" accessibilityState={{ selected: active }}>
      <Txt size={13} color={active ? t.primary : t.dim} style={{ letterSpacing: 2 }}>
        {active ? `[ ${label} ]` : label}
      </Txt>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: t.crit }]}>
          <Txt size={10} color={t.onFill}>{badge}</Txt>
        </View>
      )}
      {active && <View style={[styles.underline, { backgroundColor: t.primary }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  underline: { position: 'absolute', bottom: 0, height: 3, left: '20%', right: '20%' },
  badge: { position: 'absolute', top: 6, right: '22%', paddingHorizontal: 4, minWidth: 16, alignItems: 'center' },
});
