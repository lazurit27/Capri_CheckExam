import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';
import { Cursor, Txt } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { BotFace, FACE_ASPECT, Wander } from './BotFace';
import { Speech, useBotBrain } from './useBotBrain';

const BOT_W = 76;
const BOT_H = BOT_W * FACE_ASPECT;
const BUBBLE_W = 210;
const TYPE_MS = 38;
const START_P = 0.08;
const ZERO = { x: 0, y: 0 };


export function Bot({ mode }: { mode: 'fore' | 'back' }) {
  const { botEnabled, theme } = useSettings();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const active = botEnabled && mode === 'fore';
  const { speech, poke } = useBotBrain(active);


  const box = useMemo(() => {
    const left = 6;
    const right = W - BOT_W - 6;
    const top = insets.top + 54;
    const bottom = H - insets.bottom - 64 - BOT_H;
    const w = right - left;
    const h = bottom - top;
    const L = 2 * w + 2 * h;
    const c = [0, w / L, (w + h) / L, (2 * w + h) / L, 1];
    const input = [...c, ...c.slice(1).map(v => v + 1)];
    const xs = [left, right, right, left, left, right, right, left, left];
    const ys = [top, top, bottom, bottom, top, top, bottom, bottom, top];
    return { top, bottom, input, xs, ys };
  }, [W, H, insets.top, insets.bottom]);

  
  const [restP, setRestP] = useState(START_P);
  const spot = {
    x: interpolate(restP, box.input, box.xs),
    y: interpolate(restP, box.input, box.ys),
  };


  const p = useSharedValue(START_P);
  const pNow = useRef(START_P);
  const [moving, setMoving] = useState(false);

  const speakingRef = useRef(false);
  useEffect(() => { speakingRef.current = !!speech; }, [speech]);

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const hop = () => {
      if (speakingRef.current) { timer = setTimeout(hop, 2000); return; }
      const to = pNow.current + 0.12 + Math.random() * 0.35;
      const duration = 700 + (to - pNow.current) * 1800;
      setMoving(true);
      p.value = withTiming(to, { duration, easing: Easing.inOut(Easing.cubic) });
      timer = setTimeout(() => {
        const norm = to % 1;
        p.value = norm;
        pNow.current = norm;
        setRestP(norm);
        setMoving(false);
        timer = setTimeout(hop, 6000 + Math.random() * 9000);
      }, duration);
    };
    timer = setTimeout(hop, 4000);
    return () => {
      clearTimeout(timer);
      cancelAnimation(p);
      const norm = ((p.value % 1) + 1) % 1;
      p.value = norm;
      pNow.current = norm;
      setRestP(norm);
      setMoving(false);
    };
  }, [active, p]);

  const { input, xs, ys } = box;
  const flyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, input, xs) },
      { translateY: interpolate(p.value, input, ys) },
    ],
  }));

  const [typedId, setTypedId] = useState(-1);
  const typing = !!speech && typedId !== speech.id;

  const onLeft = spot.x < W / 2;
  const onTopOrBottom = Math.abs(spot.y - box.top) < 2 || Math.abs(spot.y - box.bottom) < 2;
  const look = useMemo(
    () => (onTopOrBottom ? { x: 0, y: spot.y < H / 2 ? 0.8 : -0.8 } : { x: onLeft ? 0.9 : -0.9, y: 0 }),
    [onTopOrBottom, onLeft, spot.y, H],
  );
  const wander: Wander = moving ? 'none' : onTopOrBottom ? 'x' : 'y';

  if (!botEnabled || mode === 'back') return null;


  const bubbleLeft = Math.max(8, Math.min(W - BUBBLE_W - 8, onLeft ? spot.x + BOT_W + 4 : spot.x - BUBBLE_W - 4));
  const bubbleTop = Math.max(insets.top + 50, Math.min(H - 220, spot.y - 10));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.bot, flyStyle]}>
        {moving && <Lightning color={theme.bolt} />}
        <Pressable onPress={poke} hitSlop={10}>
          <BotFace size={BOT_W} mood={speech ? speech.mood : 0} speaking={typing} look={look} wander={wander} />
        </Pressable>
      </Animated.View>

      {speech && !moving && (
        <Bubble key={speech.id} left={bubbleLeft} top={bubbleTop} speech={speech} onDone={setTypedId} />
      )}
    </View>
  );
}

export function BotBackdrop() {
  const { botEnabled, theme } = useSettings();
  const { width: W } = useWindowDimensions();
  if (!botEnabled) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backWrap]}>
      <View style={{ opacity: theme.name === 'dark' ? 0.09 : 0.07 }}>
        <BotFace size={Math.min(W * 0.9, 420)} look={ZERO} wander="both" />
      </View>
    </View>
  );
}

function Lightning({ color }: { color: string }) {
  const [bolts, setBolts] = useState(makeBolts);
  useEffect(() => {
    const id = setInterval(() => setBolts(makeBolts()), 70);
    return () => clearInterval(id);
  }, []);
  return (
    <View pointerEvents="none" style={styles.lightning}>
      <Svg width={BOT_W + 40} height={BOT_H + 40}>
        {bolts.map((pts, i) => (
          <Polyline key={i} points={pts} stroke={color} strokeWidth={i % 2 ? 1 : 1.8} fill="none" opacity={0.9} />
        ))}
      </Svg>
    </View>
  );
}

function makeBolts() {
  const w = BOT_W + 40;
  const h = BOT_H + 40;
  return Array.from({ length: 4 }, () => {
    const a = Math.random() * Math.PI * 2;
    let x = w / 2, y = h / 2;
    const pts = [`${x},${y}`];
    for (let i = 0; i < 5; i++) {
      x += Math.cos(a) * 7 + (Math.random() - 0.5) * 10;
      y += Math.sin(a) * 6 + (Math.random() - 0.5) * 10;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  });
}


function Bubble({ left, top, speech, onDone }: {
  left: number; top: number; speech: Speech; onDone: (id: number) => void;
}) {
  const { theme } = useSettings();
  const [n, setN] = useState(0);
  const done = n >= speech.text.length;

  useEffect(() => {
    if (done) { onDone(speech.id); return; }
    const id = setTimeout(() => setN(v => v + 1), TYPE_MS);
    return () => clearTimeout(id);
  }, [n, done, onDone, speech.id]);

  const appear = useSharedValue(0);
  useEffect(() => {
    appear.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2)) });
  }, [appear]);
  const appearStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.6 + 0.4 * appear.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bubble, { left, top, borderColor: theme.bot, backgroundColor: theme.bg }, appearStyle]}
    >
      <Txt size={10} color={theme.bot} style={{ marginBottom: 2 }}>{'CAPRI://VOICE'}</Txt>
      <Txt size={13} color={theme.bot}>{speech.text.slice(0, n)}{!done && <Cursor />}</Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bot: { position: 'absolute', left: 0, top: 0, width: BOT_W, height: BOT_H },
  lightning: { position: 'absolute', left: -20, top: -20 },
  bubble: { position: 'absolute', width: BUBBLE_W, borderWidth: 1, padding: 8 },
  backWrap: { alignItems: 'center', justifyContent: 'center' },
});
