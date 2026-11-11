import React, { useEffect, useState } from 'react';
import {
  Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps,
  TextStyle, View, ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/SettingsContext';


export function Txt({ style, color, size = 14, ...rest }: TextProps & { color?: string; size?: number }) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontFamily: t.font, color: color ?? t.primary, fontSize: size, letterSpacing: 0.5 }, style]}
    />
  );
}


export function Frame({
  children, color, title, style, right,
}: {
  children?: React.ReactNode;
  color?: string;
  title?: string;
  right?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const c = color ?? t.primary;
  const corner = (pos: ViewStyle) => (
    <View pointerEvents="none" style={[styles.corner, { borderColor: c }, pos]} />
  );
  return (
    <View style={[styles.frame, { borderColor: c + '99' }, style]}>
      {corner({ top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 })}
      {corner({ top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 })}
      {corner({ bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 })}
      {corner({ bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 })}
      {(title || right) && (
        <View style={styles.titleRow}>
          {title ? <Txt size={11} color={c} style={{ backgroundColor: t.bg, paddingHorizontal: 4 }}>{title}</Txt> : <View />}
          {right ? <Txt size={11} color={c} style={{ backgroundColor: t.bg, paddingHorizontal: 4 }}>{right}</Txt> : null}
        </View>
      )}
      {children}
    </View>
  );
}


export function Sticks({
  ratio, color, count = 18, height = 22, style,
}: { ratio: number; color: string; count?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  const lit = Math.round(Math.max(0, Math.min(1, ratio)) * count);
  return (
    <View style={[styles.sticksBox, { borderColor: color + 'AA' }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            marginHorizontal: 1,
            backgroundColor: color,
            opacity: i < lit ? 1 : 0.13,
          }}
        />
      ))}
    </View>
  );
}


export function Block({ color, children, style }: { color: string; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: color, padding: 10 }, style]}>{children}</View>;
}


export function CyberButton({
  label, onPress, color, filled, disabled, small, style,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
  filled?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const c = color ?? t.primary;
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
      {({ pressed }) => (
        <View
          style={[
            styles.btn,
            small && { paddingVertical: 6, paddingHorizontal: 10 },
            { borderColor: c, backgroundColor: filled || pressed ? c : 'transparent' },
            pressed && { transform: [{ translateX: 2 }] },
          ]}
        >
          <Txt size={small ? 12 : 15} color={filled || pressed ? t.bg : c} style={{ textAlign: 'center', letterSpacing: 2 }}>
            {label}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

export function CyberInput({ label, style, ...rest }: TextInputProps & { label: string }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Txt size={11} color={focus ? t.primary : t.dim}>{'> ' + label}</Txt>
      <TextInput
        placeholderTextColor={t.dim}
        selectionColor={t.primary}
        autoCapitalize="none"
        {...rest}
        onFocus={e => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={e => { setFocus(false); rest.onBlur?.(e); }}
        style={[
          {
            fontFamily: t.font,
            color: t.value,
            fontSize: 16,
            borderBottomWidth: 1,
            borderColor: focus ? t.primary : t.dim,
            paddingVertical: 6,
          } as TextStyle,
          style,
        ]}
      />
    </View>
  );
}


export function Typewriter({ text, size = 14, color, speed = 28 }: { text: string; size?: number; color?: string; speed?: number }) {
  const [typed, setTyped] = useState({ text, n: 0 });
  if (typed.text !== text) setTyped({ text, n: 0 });
  const n = typed.text === text ? typed.n : 0;

  useEffect(() => {
    if (n >= text.length) return; 
    const id = setTimeout(() => setTyped(s => ({ ...s, n: s.n + 1 })), speed);
    return () => clearTimeout(id);
  }, [n, text, speed]);

  return <Txt size={size} color={color}>{text.slice(0, n)}<Cursor /></Txt>;
}

export function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), 500);
    return () => clearInterval(id);
  }, []);
  return <Text style={{ opacity: on ? 1 : 0 }}>_</Text>;
}


export function GlitchTitle({ text, size = 20 }: { text: string; size?: number }) {
  const t = useTheme();
  const shift = useSharedValue(0);
  useEffect(() => {
    const step = (v: number) => withTiming(v, { duration: 40 });
    shift.value = withRepeat(
      withSequence(withDelay(2500 + Math.random() * 3000, step(3)), step(-2), step(1), step(0)),
      -1,
    );
    return () => cancelAnimation(shift);
  }, [shift]);
  const ghost = useAnimatedStyle(() => ({
    opacity: interpolate(shift.value, [-2, 0, 3], [0.7, 0, 0.7]),
    transform: [{ translateX: shift.value }],
  }));
  return (
    <View>
      <Animated.Text style={[{ position: 'absolute', fontFamily: t.font, fontSize: size, color: t.crit, letterSpacing: 2 }, ghost]}>
        {text}
      </Animated.Text>
      <Txt size={size} style={{ letterSpacing: 2 }}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1, padding: 10, paddingTop: 14, marginTop: 8 },
  corner: { position: 'absolute', width: 9, height: 9 },
  titleRow: {
    position: 'absolute', top: -9, left: 8, right: 8,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  sticksBox: { flexDirection: 'row', borderWidth: 1, padding: 3, alignItems: 'flex-end' },
  btn: { borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
});
