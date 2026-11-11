import React, { memo, useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, Mask, Path, Polygon, Rect } from 'react-native-svg';


export type Mood = 0 | 1 | 2 | 3;
export type Wander = 'none' | 'x' | 'y' | 'both';

interface Props {
  size: number;                     
  mood?: Mood;
  speaking?: boolean;              
  look?: { x: number; y: number };  
  wander?: Wander;                 
}


const VB = { x: -145, y: -135, w: 295, h: 265 };
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
export const FACE_ASPECT = VB.h / VB.w;


const EYES_ORIGIN = `50% ${((-58 - VB.y) / VB.h) * 100}%`;   
const MOUTH_ORIGIN = `50% ${((20 - VB.y) / VB.h) * 100}%`;   
const LOOK_RANGE = 7; 

const MOUTH_BASE: Record<Mood, number> = { 0: 1, 1: 1, 2: 1.15, 3: 0.75 };

function BotFaceImpl({ size, mood = 0, speaking = false, look = { x: 0, y: 0 }, wander = 'none' }: Props) {
  const height = size * FACE_ASPECT;
  const unit = size / VB.w;
  const maskId = 'eyeCut' + useId().replace(/[^a-zA-Z0-9]/g, '');


  const baseX = useSharedValue(look.x);
  const baseY = useSharedValue(look.y);
  const wobX = useSharedValue(0);
  const wobY = useSharedValue(0);

  useEffect(() => {
    const ease = { duration: 450, easing: Easing.out(Easing.cubic) };
    baseX.value = withTiming(look.x, ease);
    baseY.value = withTiming(mood === 2 ? look.y - 0.3 : mood === 3 ? look.y + 0.3 : look.y, ease);
  }, [look.x, look.y, mood, baseX, baseY]);

  useEffect(() => {
    const swing = (sv: typeof wobX, on: boolean, period: number) => {
      cancelAnimation(sv);
      sv.value = on
        ? withRepeat(withSequence(
            withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
            withTiming(-1, { duration: period, easing: Easing.inOut(Easing.sin) }),
          ), -1, true)
        : withTiming(0, { duration: 300 });
    };
    swing(wobX, wander === 'x' || wander === 'both', 2600);
    swing(wobY, wander === 'y' || wander === 'both', 1700);
    return () => { cancelAnimation(wobX); cancelAnimation(wobY); };
  }, [wander, wobX, wobY]);


  const lid = useSharedValue(1);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      lid.value = withSequence(withTiming(0.12, { duration: 70 }), withTiming(1, { duration: 110 }));
      t = setTimeout(loop, 3200 + Math.random() * 2600);
    };
    t = setTimeout(loop, 1500 + Math.random() * 2000);
    return () => clearTimeout(t);
  }, [lid]);

 
  const mouthScaleY = useSharedValue(1);
  useEffect(() => {
    const base = MOUTH_BASE[mood];
    if (speaking) {
      mouthScaleY.value = withRepeat(
        withSequence(withTiming(base * 1.4, { duration: 120 }), withTiming(base * 0.6, { duration: 120 })),
        -1,
        true,
      );
    } else {
      mouthScaleY.value = withTiming(base, { duration: 100 });
    }
  }, [speaking, mood, mouthScaleY]);

  const eyesStyle = useAnimatedStyle(() => {
    const x = Math.max(-1, Math.min(1, baseX.value + wobX.value * 0.7));
    const y = Math.max(-1, Math.min(1, baseY.value + wobY.value * 0.7));
    return {
      transform: [
        { translateX: x * LOOK_RANGE * unit },
        { translateY: y * LOOK_RANGE * unit },
        { scaleY: lid.value },
      ],
    };
  });

  const mouthStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: mouthScaleY.value }] }));

  const layer = { width: size, height };

  return (
    <View style={layer}>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: EYES_ORIGIN }, eyesStyle]}>
        <Svg width={size} height={height} viewBox={VIEWBOX}>
          <G>
            <Ellipse cx={-85} cy={-62} rx={31} ry={34} fill="#01fe6f" />
            <Ellipse cx={-85} cy={-62} rx={27} ry={30} fill="#000000" />
            <Ellipse cx={-85} cy={-62} rx={22} ry={24} fill="#026ce2" />
            <Ellipse cx={-90} cy={-62} rx={9} ry={11} fill="#FFFFFF" stroke="#000000" strokeWidth={2} />
          </G>
          <G>
            <Ellipse cx={60} cy={-54} rx={32} ry={34} fill="#01fe6f" />
            <Ellipse cx={60} cy={-54} rx={28} ry={30} fill="#000000" />
            <Ellipse cx={60} cy={-54} rx={23} ry={24} fill="#026ce2" />
            <Ellipse cx={55} cy={-54} rx={10} ry={11} fill="#FFFFFF" stroke="#000000" strokeWidth={2} />
          </G>
        </Svg>
      </Animated.View>

  
      <Svg width={size} height={height} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id={maskId} x={-150} y={-150} width={300} height={300} maskUnits="userSpaceOnUse">
            <Rect x={-150} y={-150} width={300} height={300} fill="#FFFFFF" />
            <Path d="M -120,-98 Q -61,-125 -30,-30 Q -136,0 -120,-100 Z" fill="#000000" />
            <Path d="M -30,-98 Q -100,-80 -120,-30 Q -30,-80 -30,-98 Z" fill="#000000" />
            <Path d="M 120,-98 Q 51,-125 0,-30 Q 126,20 120,-90 Z" fill="#000000" />
            <Path d="M 0,-98 Q 80,-80 120,0 Q 0,-80 0,-98 Z" fill="#000000" />
          </Mask>
        </Defs>
        <Polygon points="-130,-120 140,-120 120,10 -130,-20" fill="#01fe6f" mask={`url(#${maskId})`} />
      </Svg>

 
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: MOUTH_ORIGIN }, mouthStyle]}>
        <Svg width={size} height={height} viewBox={VIEWBOX}>
          <Path
            d="M -90,30 L -50,23 -30,20 -40,35 30,20 20,37 80,20 Q -50,200 -90,30 Z"
            fill="#FFFFFF"
            stroke="#01fe6f"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

export const BotFace = memo(BotFaceImpl);
