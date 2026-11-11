import type { Level } from '../types/Fault.type';


export const LIMITS = {
  fuelPct:     { min: 0,   max: 100, warnLow: 20,  critLow: 8 },
  oilTemp:     { min: 40,  max: 150, warnLow: 60,  critLow: -999, warnHigh: 112, critHigh: 125 },
  oilPressure: { min: 0,   max: 8,   warnLow: 1.0, critLow: 0.7,  warnHigh: 5.5, critHigh: 6.5 },
  consumption: { min: 0,   max: 30,  warnHigh: 15, critHigh: 24 },
  outsideTemp: { min: -30, max: 50,  warnLow: 0,   critLow: -15,  warnHigh: 35,  critHigh: 45 },
} as const;

type Lim = { warnLow?: number; critLow?: number; warnHigh?: number; critHigh?: number };

export function levelOf(value: number, lim: Lim): Level {
  if (lim.critLow !== undefined && value <= lim.critLow) return 'crit';
  if (lim.critHigh !== undefined && value >= lim.critHigh) return 'crit';
  if (lim.warnLow !== undefined && value < lim.warnLow) return 'warn';
  if (lim.warnHigh !== undefined && value > lim.warnHigh) return 'warn';
  return 'ok';
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const ratio = (v: number, min: number, max: number) => clamp((v - min) / (max - min), 0, 1);
