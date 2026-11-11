import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { TELEMETRY_TICK_MS } from '../constants/config';
import { useGps } from '../hooks/useGps';
import type { Level } from '../types/Fault.type';
import { clamp, levelOf, LIMITS } from '../utils/levels';
import { useCars } from './CarContext';


export interface Telemetry {
  speed: number;
  speedSource: 'gps' | 'sim' | 'none';
  testDrive: boolean;
  fuel: number;       
  fuelMax: number;     
  fuelPct: number;     
  oilTemp: number;     
  oilPressure: number; 
  consumption: number;
  outsideTemp: number; 
  outsideSource: 'real' | 'sim';
  levels: { fuel: Level; oilTemp: Level; oilPressure: Level; consumption: Level; outsideTemp: Level };
  lastRefuelAt: number;
  setTestDrive: (v: boolean) => void;
  refuel: () => void;
}

const Ctx = createContext<Telemetry | null>(null);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const makeSim = () => ({
  speed: 0, target: 0, holdTicks: 0,
  fuel: 0, oilTemp: 25, oilPressure: 0, consumption: 0, heat: 0,
  outside: rnd(8, 26), outsideReal: false,
});

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { car } = useCars();
  const gps = useGps();
  const [testDrive, setTestDrive] = useState(false);
  const [lastRefuelAt, setLastRefuelAt] = useState(0);

  const fuelMax = car?.tankCapacity ?? 0;


  const sim = useRef(makeSim());
  const [snap, setSnap] = useState(makeSim);
  const armedAt = useRef(0);

  
  useEffect(() => {
    if (!car) return;
    sim.current.fuel = car.tankCapacity * rnd(0.25, 0.9);
    sim.current.oilTemp = rnd(70, 88);
    sim.current.oilPressure = 1.4;
    sim.current.consumption = 0;
    sim.current.heat = 0;
    armedAt.current = Date.now() + 3000; 
    setSnap({ ...sim.current });

  }, [car?.id, car?.tankCapacity]);

  const coordsKey = gps.coords ? `${gps.coords.lat.toFixed(1)},${gps.coords.lon.toFixed(1)}` : '';
  useEffect(() => {
    if (!gps.coords) return;
    const { lat, lon } = gps.coords;
    const load = () =>
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`)
        .then(r => r.json())
        .then(d => {
          const t = d?.current?.temperature_2m;
          if (typeof t === 'number') { sim.current.outside = t; sim.current.outsideReal = true; }
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
    
  }, [coordsKey]);

  const doRefuel = useCallback(() => {
    if (!car) return;
    const before = sim.current.fuel;
    const after = car.tankCapacity;
    if (after - before < 0.5) return;
    sim.current.fuel = after;
    setLastRefuelAt(Date.now());

    api.refuel(car.id, +before.toFixed(1), +after.toFixed(1)).catch(() => {});
  }, [car]);

  const gpsSpeedRef = useRef<number | null>(null);
  useEffect(() => { gpsSpeedRef.current = gps.speed; }, [gps.speed]);


  useEffect(() => {
    const dt = TELEMETRY_TICK_MS / 1000;
    const t = setInterval(() => {
      const s = sim.current;
      const prevSpeed = s.speed;

     
      if (testDrive) {
        if (s.holdTicks <= 0) {
        
          const r = Math.random();
          s.target = r < 0.15 ? 0 : r < 0.45 ? rnd(40, 80) : r < 0.8 ? rnd(80, 130) : rnd(130, 200);
          s.holdTicks = Math.round(rnd(8, 22));
        }
        s.holdTicks--;
        const accel = s.target > s.speed ? rnd(2.5, 6) : rnd(4, 9);
        s.speed = s.target > s.speed ? Math.min(s.target, s.speed + accel) : Math.max(s.target, s.speed - accel);
        s.speed = Math.max(0, s.speed + rnd(-0.6, 0.6));
      } else {
        s.speed = gpsSpeedRef.current ?? 0;
      }

      if (car) {
        const a = (s.speed - prevSpeed) / dt; 

        const base = s.speed < 3 ? 0 : 6 + Math.max(0, s.speed - 90) * 0.09;
        const target = s.speed < 3 ? 0 : base + Math.max(0, a) * 1.6 + rnd(-0.4, 0.4);
        s.consumption += (clamp(target, 0, 30) - s.consumption) * 0.35;

      
        const km = (s.speed / 3600) * dt;
        const burn = (s.consumption / 100) * km * (testDrive ? 60 : 1);
        s.fuel = Math.max(0, s.fuel - burn);
        if (testDrive && s.fuel / car.tankCapacity < 0.03) doRefuel();


        s.heat = clamp(s.heat + (s.speed > 150 ? 0.35 : -0.15), 0, 22);
        const tTarget = 84 + s.speed * 0.13 + s.heat + (s.outside - 20) * 0.1;
        s.oilTemp += (tTarget - s.oilTemp) * 0.04 + rnd(-0.15, 0.15);
        const pTarget = s.speed < 1 ? 1.4 : 1.4 + s.speed * 0.024 - Math.max(0, s.oilTemp - 115) * 0.05;
        s.oilPressure += (pTarget - s.oilPressure) * 0.25 + rnd(-0.05, 0.05);
      }

      if (!s.outsideReal) s.outside += rnd(-0.02, 0.02);
      setSnap({ ...s });
    }, TELEMETRY_TICK_MS);
    return () => clearInterval(t);
  }, [testDrive, car, doRefuel]);

  useEffect(() => { if (!testDrive) sim.current.holdTicks = 0; }, [testDrive]);

  const fuelPct = fuelMax ? (snap.fuel / fuelMax) * 100 : 0;
  const levels = {
    fuel: levelOf(fuelPct, LIMITS.fuelPct),
    oilTemp: levelOf(snap.oilTemp, LIMITS.oilTemp),
    oilPressure: levelOf(snap.oilPressure, LIMITS.oilPressure),
    consumption: levelOf(snap.consumption, LIMITS.consumption),
    outsideTemp: levelOf(snap.outside, LIMITS.outsideTemp),
  };


  const prevLevels = useRef(levels);
  useEffect(() => {
    if (!car || Date.now() < armedAt.current) { prevLevels.current = levels; return; }
    const meta: Record<keyof typeof levels, [string, number, string]> = {
      fuel: ['Топливо', fuelPct, '%'],
      oilTemp: ['Температура масла', snap.oilTemp, '°C'],
      oilPressure: ['Давление масла', snap.oilPressure, 'бар'],
      consumption: ['Расход', snap.consumption, 'л/100км'],
      outsideTemp: ['Температура за бортом', snap.outside, '°C'],
    };
    (Object.keys(levels) as (keyof typeof levels)[]).forEach(k => {
      if (levels[k] === 'crit' && prevLevels.current[k] !== 'crit') {
        const [name, value, unit] = meta[k];
        api.critical(car.id, name, +value.toFixed(1), unit).catch(() => {});
      }
    });
    prevLevels.current = levels;
  });

  const speedSource: Telemetry['speedSource'] = testDrive ? 'sim' : gps.granted ? 'gps' : 'none';

  const value = useMemo<Telemetry>(() => ({
    speed: snap.speed,
    speedSource,
    testDrive,
    fuel: snap.fuel,
    fuelMax,
    fuelPct,
    oilTemp: snap.oilTemp,
    oilPressure: snap.oilPressure,
    consumption: snap.consumption,
    outsideTemp: snap.outside,
    outsideSource: snap.outsideReal ? 'real' : 'sim',
    levels,
    lastRefuelAt,
    setTestDrive,
    refuel: doRefuel,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [snap, speedSource, testDrive, fuelMax, lastRefuelAt, doRefuel]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTelemetry() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTelemetry вне TelemetryProvider');
  return v;
}
