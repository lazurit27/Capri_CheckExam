import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { FAULT_POLL_MS } from '../constants/config';
import type { ActiveFault, CarFaultState, CarStatus } from '../types/Fault.type';
import type { Car} from '../types/Car.type';
import { useAuth } from './AuthContext';

interface CarState {
  cars: Car[];
  car: Car | null;             
  status: CarStatus;
  activeFaults: ActiveFault[];
  online: boolean;              
  reloadCars: () => Promise<void>;
  selectCar: (id: string | null) => void;
  refreshFaults: () => Promise<void>;
  runFaultTest: () => Promise<void>;
  clearFaultTest: () => Promise<void>;
}

const KEY = 'capricheck.selectedCar';
const Ctx = createContext<CarState | null>(null);

export function CarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<CarStatus>('Ok');
  const [activeFaults, setActiveFaults] = useState<ActiveFault[]>([]);
  const [online, setOnline] = useState(true);
  const selectedRef = useRef<string | null>(null);
  const setSelected = useCallback((id: string | null) => {
    selectedRef.current = id;
    setSelectedId(id);
  }, []);

  const reloadCars = useCallback(async () => {
    const list = await api.cars();
    setCars(list);
    const saved = selectedRef.current ?? (await AsyncStorage.getItem(KEY));
    const next = list.find(c => c.id === saved)?.id ?? list[0]?.id ?? null;
    setSelected(next);
  }, [setSelected]);

  
  useEffect(() => {
    setActiveFaults([]);
    setStatus('Ok');
    if (user) reloadCars().then(() => setOnline(true), () => setOnline(false));
    else { setCars([]); setSelected(null); }
  }, [user?.id, reloadCars, setSelected]);
 

  const selectCar = useCallback((id: string | null) => {
    setSelected(id);
    setActiveFaults([]);
    setStatus('Ok');
    if (id) AsyncStorage.setItem(KEY, id).catch(() => {});
    else AsyncStorage.removeItem(KEY).catch(() => {});
  }, [setSelected]);

 
  const applyState = useCallback((s: CarFaultState) => {
    if (selectedRef.current !== s.carId) return; 
    setStatus(s.status);
    setActiveFaults(s.activeFaults);
    setCars(list => list.map(c => (c.id === s.carId && c.status !== s.status ? { ...c, status: s.status } : c)));
  }, []);

  const refreshFaults = useCallback(async () => {
    const id = selectedRef.current;
    if (!id) return;
    try {
      applyState(await api.faultState(id));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [applyState]);

 
  useEffect(() => {
    if (!selectedId) return;
    refreshFaults(); 
    const t = setInterval(refreshFaults, FAULT_POLL_MS);
    return () => clearInterval(t);
  }, [selectedId, refreshFaults]);

  const runFaultTest = useCallback(async () => {
    if (!selectedRef.current) return;
    applyState(await api.runFaultTest(selectedRef.current));
  }, [applyState]);

  const clearFaultTest = useCallback(async () => {
    if (!selectedRef.current) return;
    applyState(await api.clearFaultTest(selectedRef.current));
  }, [applyState]);

  const car = useMemo(() => cars.find(c => c.id === selectedId) ?? null, [cars, selectedId]);

  const value = useMemo<CarState>(() => ({
    cars, car, status, activeFaults, online,
    reloadCars, selectCar, refreshFaults, runFaultTest, clearFaultTest,
  }), [cars, car, status, activeFaults, online, reloadCars, selectCar, refreshFaults, runFaultTest, clearFaultTest]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCars() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCars вне CarProvider');
  return v;
}
