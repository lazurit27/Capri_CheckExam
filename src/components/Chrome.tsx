import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useCars } from '../context/CarContext';
import { useTheme } from '../context/SettingsContext';
import { GlitchTitle, Txt } from './ui';


export function Header() {
  const t = useTheme();
  const { car, online } = useCars();
  return (
    <View style={styles.header}>
      <GlitchTitle text="CAPRICHECK" size={22} />
      <View style={styles.right}>
        <Txt size={10} color={t.dim}>SYS v2.077</Txt>
        <Txt size={10} color={online ? t.dim : t.crit}>{online ? 'LINK::OK' : 'LINK::LOST'}</Txt>
        {car && <Txt size={10} color={t.value} numberOfLines={1}>{car.name.toUpperCase()}</Txt>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  right: { alignItems: 'flex-end', maxWidth: '45%' },
});
