import type { User } from '../types/User.type';
import { ApiError, local, setSession } from './localServer';
export { ApiError };

let onUnauthorized: (() => void) | null = null;

export const setApiToken = (t: string | null) => { setSession(t); };
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };


const call = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, isLogin = false) =>
  async (...a: A): Promise<R> => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401 && !isLogin) onUnauthorized?.();
      throw e;
    }
  };


export const avatarUri = (u: User | null) => u?.avatarUrl ?? null;

export const api = {
  register: call(local.register),
  login: call(local.login, true),

  me: call(local.me),
  changeName: call(local.changeName),
  changePassword: call(local.changePassword),
  uploadAvatar: call(local.uploadAvatar),

  cars: call(local.cars),
  createCar: call(local.createCar),
  updateCar: call(local.updateCar),
  deleteCar: call(local.deleteCar),

  myNotes: call(local.myNotes),
  carNotes: call(local.carNotes),
  createNote: call(local.createNote),
  updateNote: call(local.updateNote),
  deleteNote: call(local.deleteNote),

  faultLibrary: call(local.faultLibrary),
  faultState: call(local.faultState),
  runFaultTest: call(local.runFaultTest),
  clearFaultTest: call(local.clearFaultTest),

  refuel: call(local.refuel),
  critical: call(local.critical),

  resetAll: local.resetAll,
};
