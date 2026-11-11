import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { LocationObject } from 'expo-location';

export interface GpsState {
  speed: number | null;
  granted: boolean;
  coords: { lat: number; lon: number } | null;
}


export function useGps(): GpsState {
  const [state, setState] = useState<GpsState>({ speed: null, granted: false, coords: null });
  

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setState(s => ({ ...s, granted: true }));

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0, },
        (loc: LocationObject) => {
          const ms = loc.coords.speed;
          setState({
            granted: true,
            speed: ms == null || ms < 0 ? 0 : ms * 3.6,
            coords: { lat: loc.coords.latitude, lon: loc.coords.longitude },
          });
        },
      );
      if (cancelled) sub.remove();
    })().catch(() => {});

    return () => { cancelled = true; sub?.remove(); };
  }, []);

  return state;
}
