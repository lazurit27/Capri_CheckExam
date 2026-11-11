import { useCallback, useEffect, useRef, useState } from 'react';
import { useCars } from '../context/CarContext';
import { useTelemetry } from '../context/TelemetryContext';
import type { Mood } from './BotFace';
import phrases from './phrases.json';

type Key = Exclude<keyof typeof phrases, '_moods'>;
export interface Speech { id: number; text: string; mood: Mood; }

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];


export function useBotBrain(active: boolean) {
  const tel = useTelemetry();
  const { car, activeFaults } = useCars();
  const [speech, setSpeech] = useState<Speech | null>(null);

  const busyUntil = useRef(0);
  const curPrio = useRef(0);
  const lastSaid = useRef<Partial<Record<Key, number>>>({});
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const say = useCallback((key: Key, prio = 1, cooldown = 15000) => {
    const now = Date.now();
    if (now - (lastSaid.current[key] ?? 0) < cooldown) return;
    if (now < busyUntil.current && prio < curPrio.current) return;

    const p = pick(phrases[key] as { text: string; mood: number }[]);
    const duration = p.text.length * 45 + 2800;
    lastSaid.current[key] = now;
    busyUntil.current = now + duration;
    curPrio.current = prio;
    setSpeech({ id: ++counter.current, text: p.text, mood: p.mood as Mood });

    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { setSpeech(null); curPrio.current = 0; }, duration);
  }, []);

  
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  
  useEffect(() => {
    if (!active) busyUntil.current = 0;
  }, [active]);

 
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => say('greeting', 1, 120000), 1200);
    return () => clearTimeout(t);
  }, [active, say]);

 
  const prev = useRef({ fuelPct: 100, fast: false, levels: tel.levels, test: false, refuel: 0, faults: 0 });
  useEffect(() => {
    const p = prev.current;
    if (active && car) {
      if (tel.fuelPct < 20 && p.fuelPct >= 20) say('lowFuel', 2, 60000);

      const lv = tel.levels;
      const keys = Object.keys(lv) as (keyof typeof lv)[];
      if (keys.some(k => lv[k] === 'crit' && p.levels[k] !== 'crit')) say('critical', 3, 20000);
      else if (keys.some(k => lv[k] === 'warn' && p.levels[k] === 'ok')) say('warning', 1, 40000);

      if (tel.lastRefuelAt !== p.refuel && tel.lastRefuelAt > 0) say('refuel', 2, 5000);
    }
    if (active) {
      if (tel.speed > 110 && !p.fast) say('speeding', 2, 20000);
      if (tel.testDrive && !p.test) say('testDrive', 2, 10000);
    }
    prev.current = {
      fuelPct: tel.fuelPct,
      fast: tel.speed > 110 ? true : tel.speed < 90 ? false : p.fast,
      levels: tel.levels,
      test: tel.testDrive,
      refuel: tel.lastRefuelAt,
      faults: p.faults,
    };
  }, [tel, active, car, say]);

 
  useEffect(() => {
    const before = prev.current.faults;
    if (active && activeFaults.length > before) say('fault', 3, 8000);
    if (active && activeFaults.length === 0 && before > 0) say('allClear', 2, 8000);
    prev.current.faults = activeFaults.length;
  }, [activeFaults.length, active, say]);

 
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      if (Date.now() > busyUntil.current && Math.random() < 0.5) say('idle', 0, 20000);
    }, 30000);
    return () => clearInterval(t);
  }, [active, say]);

  const poke = useCallback(() => say('idle', 1, 0), [say]);

  return { speech: active ? speech : null, poke };
}
