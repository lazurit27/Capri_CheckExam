import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/SettingsContext';

const PITCH = 8;    
const BAND = 7;      
const ROLL_H = 190;  
const ROLL_MS = 9000;


export function Scanlines() {
  const t = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const dark = t.name === 'dark';
  const peak = dark ? 0.12 : 0.07;
  const rollPeak = dark ? 0.08 : 0.05;
  const gid = `soft-${t.name}`;
  const rid = `roll-${t.name}`;

  const rows = useMemo(() => Array.from({ length: Math.ceil(H / PITCH) + 1 }, (_, i) => i), [H]);

  const roll = useSharedValue(0);
  useEffect(() => {
    roll.value = 0;
    roll.value = withRepeat(withTiming(1, { duration: ROLL_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(roll);
  }, [roll, H]);
  const rollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -ROLL_H + roll.value * (H + ROLL_H) }],
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.primary} stopOpacity={0} />
            <Stop offset="0.5" stopColor={t.primary} stopOpacity={peak} />
            <Stop offset="1" stopColor={t.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {rows.map(i => (
          <Rect
            key={i}
            x={0}
            y={i * PITCH}
            width={W}
            height={BAND}
            fill={`url(#${gid})`}
            opacity={i % 4 === 0 ? 1 : 0.6}
          />
        ))}
      </Svg>

      <Animated.View style={[styles.roll, rollStyle]}>
        <Svg width={W} height={ROLL_H}>
          <Defs>
            <LinearGradient id={rid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.primary} stopOpacity={0} />
              <Stop offset="0.5" stopColor={t.primary} stopOpacity={rollPeak} />
              <Stop offset="1" stopColor={t.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={ROLL_H} fill={`url(#${rid})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  roll: { position: 'absolute', left: 0, top: 0, right: 0, height: ROLL_H },
});
