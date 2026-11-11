import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/SettingsContext';
import { Txt } from './ui';

const MAX = 240;
const BARS_COUNT = 24; 


export function Speedometer({ speed, source }: { speed: number; source: 'gps' | 'sim' | 'none' }) {
  const t = useTheme();
  

  const clampedSpeed = Math.min(speed, MAX);
  const activeBars = Math.round((clampedSpeed / MAX) * BARS_COUNT);
  
  const color = speed > 180 ? t.crit : speed > 130 ? t.warn : t.primary;
  const sourceLabel = source === 'gps' ? 'GPS::LIVE' : source === 'sim' ? 'SIM::TEST' : 'GPS::NO SIGNAL';

  return (
    <View style={styles.container}>
      <View style={styles.digitalContainer}>
        <Txt size={56} color={color} style={{ letterSpacing: 2 }}>
          {Math.round(speed).toString().padStart(3, '0')}
        </Txt>
        <Txt size={12} color={t.dim}>KM/H</Txt>
        <Txt size={10} color={source === 'none' ? t.warn : t.dim} style={{ marginTop: 2 }}>
          {sourceLabel}
        </Txt>
      </View>

      <View style={styles.barsContainer}>
        {Array.from({ length: BARS_COUNT }).map((_, index) => {
          const isActive = index < activeBars;
          
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  backgroundColor: isActive ? color : t.dim,
                  opacity: isActive ? 1 : 0.3,
                  height: 12 + (index / BARS_COUNT) * 16, 
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  digitalContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end', 
    justifyContent: 'space-between',
    width: '85%',
    height: 35,
  },
  bar: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 2,
  },
});