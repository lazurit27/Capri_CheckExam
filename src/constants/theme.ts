import type { CarStatus, Level } from '../types/Fault.type';

export type ThemeName = 'dark' | 'light';

export interface Theme {
  name: ThemeName;
  bg: string;
  primary: string;
  dim: string;
  value: string;
  warn: string;
  crit: string;
  onFill: string;
  bot: string;
  bolt: string;
  scanline: string;
  font: string;
}

export const FONT = 'DotGothic16';

export const darkTheme: Theme = {
  name: 'dark',
  bg: '#000000',
  primary: '#00E5FF',
  dim: '#0B6E7A',
  value: '#5CF2FF',
  warn: '#FFD60A',
  crit: '#FF2E4D',
  onFill: '#000000',
  bot: '#01FE6F', 
  bolt: '#FF2E4D',
  scanline: 'rgba(0,229,255,0.05)',
  font: FONT,
};

export const lightTheme: Theme = {
  name: 'light',
  bg: '#FFFFFF',
  primary: '#0B5D3B',
  dim: '#7FA593',
  value: '#9A7400',
  warn: '#F08C00',
  crit: '#C1121F',
  onFill: '#FFFFFF',
  bot: '#078A43', // тот же зелёный, но читаемый на белом
  bolt: '#D00000',
  scanline: 'rgba(11,93,59,0.04)',
  font: FONT,
};

export const levelColor = (t: Theme, level: Level, base: 'primary' | 'value' = 'primary') =>
  level === 'crit' ? t.crit : level === 'warn' ? t.warn : t[base];

export const statusColor = (t: Theme, s: CarStatus) =>
  s === 'Critical' ? t.crit : s === 'Warning' ? t.warn : t.primary;
