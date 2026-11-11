import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setApiToken, setUnauthorizedHandler } from '../api/client';
import type { User } from '../types/User.type';

const TOKEN_KEY = 'capricheck.token';


const store = {
  get: async (k: string) => { try { return await SecureStore.getItemAsync(k); } catch { return AsyncStorage.getItem(k); } },
  set: async (k: string, v: string) => { try { await SecureStore.setItemAsync(k, v); } catch { await AsyncStorage.setItem(k, v); } },
  del: async (k: string) => { try { await SecureStore.deleteItemAsync(k); } catch { await AsyncStorage.removeItem(k); } },
};

interface Auth {
  user: User | null;
  booting: boolean;
  login: (mail: string, password: string) => Promise<void>;
  register: (name: string, mail: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const logout = useCallback(() => {
    setApiToken(null);
    setUser(null);
    store.del(TOKEN_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      const t = await store.get(TOKEN_KEY);
      if (t) {
        setApiToken(t);
        try { setUser(await api.me()); } catch { setApiToken(null); }
      }
      setBooting(false);
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const accept = async (token: string, u: User) => {
    setApiToken(token);
    await store.set(TOKEN_KEY, token);
    setUser(u);
  };

  const value = useMemo<Auth>(() => ({
    user,
    booting,
    login: async (mail, password) => { const r = await api.login(mail, password); await accept(r.token, r.user); },
    register: async (name, mail, password) => { const r = await api.register(name, mail, password); await accept(r.token, r.user); },
    logout,
    setUser,
  }), [user, booting, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth вне AuthProvider');
  return v;
}
