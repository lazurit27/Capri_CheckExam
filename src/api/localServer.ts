import AsyncStorage from '@react-native-async-storage/async-storage';
import type {  Car, CarStatus,} from '../types/Car.type';
import type { Note, NoteType} from '../types/Note.type';
import type {ActiveFault, CarFaultState, FaultCode, Severity, } from '../types/Fault.type';
import type { AuthResponse, User,} from '../types/User.type';



export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}


interface UserRow { id: string; name: string; mail: string; passwordHash: string; salt: string; avatarUrl: string | null; }
interface CarRow { id: string; name: string; tankCapacity: number; userId: string; status: CarStatus; }
interface NoteRow {
  id: string; carId: string; description: string; price: number | null; fuelAdded: number | null;
  date: string; type: NoteType;
}
interface CarFaultRow { carId: string; faultCodeId: number; isActive: boolean; isTest: boolean; detectedAt: string; }

interface Db { users: UserRow[]; cars: CarRow[]; notes: NoteRow[]; carFaults: CarFaultRow[]; }


export const FAULT_LIBRARY: FaultCode[] = [
  { id: 1, code: 'P0300', description: 'Случайные/множественные пропуски зажигания', severity: 'Critical' },
  { id: 2, code: 'P0301', description: 'Пропуски зажигания в цилиндре 1', severity: 'Medium' },
  { id: 3, code: 'P0171', description: 'Слишком бедная смесь (банк 1)', severity: 'Medium' },
  { id: 4, code: 'P0420', description: 'Низкая эффективность катализатора', severity: 'Low' },
  { id: 5, code: 'P0128', description: 'Температура ОЖ ниже рабочей (термостат)', severity: 'Low' },
  { id: 6, code: 'P0217', description: 'Перегрев двигателя', severity: 'Critical' },
  { id: 7, code: 'P0520', description: 'Неисправность датчика давления масла', severity: 'Critical' },
  { id: 8, code: 'P0562', description: 'Низкое напряжение бортовой сети', severity: 'Medium' },
  { id: 9, code: 'P0455', description: 'Большая утечка в системе EVAP', severity: 'Low' },
  { id: 10, code: 'P0335', description: 'Датчик положения коленвала — нет сигнала', severity: 'Critical' },
  { id: 11, code: 'P0113', description: 'Датчик температуры впуска — высокий сигнал', severity: 'Low' },
  { id: 12, code: 'C0035', description: 'Датчик скорости колеса (ПЛ) — неисправность', severity: 'Medium' },
];

const TEST_FAULT_LIFETIME_MS = 30_000;
const CRITICAL_THROTTLE_MS = 60_000;
const STORAGE_KEY = 'capricheck.localdb.v1';

let db: Db = { users: [], cars: [], notes: [], carFaults: [] };
let loaded: Promise<void> | null = null;

const ensureLoaded = () => {
  if (!loaded) {
    loaded = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw: string | null) => {
        if (!raw) return;
        db = { ...db, ...JSON.parse(raw) };
        // Миграция: раньше объём бака хранился в поле с ошибочным именем oilMax.
        for (const c of db.cars as (CarRow & { oilMax?: number })[]) {
          if (c.tankCapacity == null && c.oilMax != null) c.tankCapacity = c.oilMax;
          delete c.oilMax;
        }
      })
      .catch(() => {});
  }
  return loaded;
};
const persist = () => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db)).catch(() => {});

// ---------------- Утилиты ----------------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Простой хеш (FNV-1a, 2 прохода) — для симуляции. Пароли в открытом виде не хранятся. */
function hash(password: string, salt: string) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = salt + ':' + password;
  for (let r = 0; r < 500; r++) {
    for (let i = 0; i < s.length; i++) {
      h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ (s.charCodeAt(i) + r), 2246822519) >>> 0;
    }
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

const normalizeMail = (m: string) => (m ?? '').trim().toLowerCase();
const MAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const toUser = (u: UserRow): User => ({ id: u.id, name: u.name, mail: u.mail, avatarUrl: u.avatarUrl });
const toCar = (c: CarRow): Car => ({ id: c.id, name: c.name, tankCapacity: c.tankCapacity, status: c.status });
const toNote = (n: NoteRow): Note => ({
  ...n,
  carName: db.cars.find(c => c.id === n.carId)?.name ?? '',
  editable: n.type === 'Owner',
});

function validatePassword(p?: string) {
  if (!p || p.trim().length < 6) throw new ApiError(400, 'Пароль должен быть не короче 6 символов.');
}
function validateName(n: string) {
  if (n.length < 2 || n.length > 32) throw new ApiError(400, 'Ник должен быть от 2 до 32 символов.');
}

// ---------------- «Сессия» ----------------
let currentUserId: string | null = null;

/** Токен = id пользователя (это симуляция). */
export async function setSession(token: string | null) {
  currentUserId = token;
}

async function me(): Promise<UserRow> {
  await ensureLoaded();
  await delay(120); // имитация сети
  const u = db.users.find(x => x.id === currentUserId);
  if (!u) throw new ApiError(401, 'Сессия недействительна, войдите снова.');
  return u;
}

async function ownedCar(carId: string) {
  const u = await me();
  const car = db.cars.find(c => c.id === carId);
  if (!car) throw new ApiError(404, 'Автомобиль не найден.');
  if (car.userId !== u.id) throw new ApiError(403, 'Это не ваш автомобиль.');
  return car;
}

function addNote(carId: string, type: NoteType, description: string, extra?: Partial<NoteRow>): NoteRow {
  const n: NoteRow = { id: uid(), carId, type, description, price: null, fuelAdded: null, date: nowIso(), ...extra };
  db.notes.push(n);
  return n;
}

const SEV_RANK: Record<Severity, number> = { Low: 1, Medium: 2, Critical: 3 };

function recalcStatus(car: CarRow) {
  const worst = db.carFaults
    .filter(f => f.carId === car.id && f.isActive)
    .map(f => SEV_RANK[FAULT_LIBRARY.find(l => l.id === f.faultCodeId)!.severity])
    .reduce((a, b) => Math.max(a, b), 0);
  car.status = worst === 3 ? 'Critical' : worst > 0 ? 'Warning' : 'Ok';
}

function faultState(car: CarRow): CarFaultState {
  const activeFaults: ActiveFault[] = db.carFaults
    .filter(f => f.carId === car.id && f.isActive)
    .map(f => {
      const l = FAULT_LIBRARY.find(x => x.id === f.faultCodeId)!;
      return { faultCodeId: l.id, code: l.code, description: l.description, severity: l.severity, isTest: f.isTest, detectedAt: f.detectedAt };
    })
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
  return { carId: car.id, status: car.status, activeFaults };
}

// ================== «ЭНДПОИНТЫ» ==================
export const local = {
  // ---------- auth ----------
  async register(name: string, mail: string, password: string): Promise<AuthResponse> {
    await ensureLoaded();
    await delay(250);
    name = (name ?? '').trim();
    mail = normalizeMail(mail);
    validateName(name);
    if (!MAIL_RE.test(mail)) throw new ApiError(400, 'Некорректный e-mail.');
    validatePassword(password);
    // Правило: одинаковые e-mail запрещены.
    if (db.users.some(u => u.mail === mail)) throw new ApiError(409, 'Пользователь с таким e-mail уже существует.');

    const salt = uid();
    const u: UserRow = { id: uid(), name, mail, salt, passwordHash: hash(password, salt), avatarUrl: null };
    db.users.push(u);
    await persist();
    return { token: u.id, user: toUser(u) };
  },

  async login(mail: string, password: string): Promise<AuthResponse> {
    await ensureLoaded();
    await delay(250);
    const u = db.users.find(x => x.mail === normalizeMail(mail));
    if (!u || u.passwordHash !== hash(password ?? '', u.salt)) throw new ApiError(401, 'Неверный e-mail или пароль.');
    return { token: u.id, user: toUser(u) };
  },

  // ---------- user ----------
  async me(): Promise<User> { return toUser(await me()); },

  async changeName(name: string): Promise<User> {
    const u = await me();
    name = (name ?? '').trim();
    validateName(name);
    u.name = name;
    await persist();
    return toUser(u);
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const u = await me();
    if (u.passwordHash !== hash(oldPassword ?? '', u.salt)) throw new ApiError(400, 'Старый пароль указан неверно.');
    validatePassword(newPassword);
    u.salt = uid();
    u.passwordHash = hash(newPassword, u.salt);
    await persist();
  },

  async uploadAvatar(uri: string, fileName: string, mimeType: string, size?: number): Promise<User> {
    const u = await me();
    // Правило: только правильный формат.
    const ext = (fileName.split('.').pop() ?? '').toLowerCase();
    const allowed: Record<string, string[]> = {
      png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], webp: ['image/webp'],
    };
    if (!allowed[ext] || !allowed[ext].includes((mimeType ?? '').toLowerCase()))
      throw new ApiError(400, 'Разрешены только PNG, JPG/JPEG или WEBP.');
    if (size != null && size > 2 * 1024 * 1024) throw new ApiError(400, 'Размер аватарки — до 2 МБ.');
    u.avatarUrl = uri;
    await persist();
    return toUser(u);
  },

  // ---------- cars ----------
  async cars(): Promise<Car[]> {
    const u = await me();
    return db.cars.filter(c => c.userId === u.id).sort((a, b) => a.name.localeCompare(b.name)).map(toCar);
  },

  async createCar(name: string, tankCapacity: number): Promise<Car> {
    const u = await me();
    validateCar(name, tankCapacity);
    const c: CarRow = { id: uid(), name: name.trim(), tankCapacity, userId: u.id, status: 'Ok' };
    db.cars.push(c);
    await persist();
    return toCar(c);
  },

  async updateCar(id: string, name: string, tankCapacity: number): Promise<Car> {
    const c = await ownedCar(id);
    validateCar(name, tankCapacity);
    c.name = name.trim();
    c.tankCapacity = tankCapacity;
    await persist();
    return toCar(c);
  },

  async deleteCar(id: string): Promise<void> {
    const c = await ownedCar(id);
    db.cars = db.cars.filter(x => x.id !== c.id);
    db.notes = db.notes.filter(n => n.carId !== c.id);       // каскадное удаление
    db.carFaults = db.carFaults.filter(f => f.carId !== c.id);
    await persist();
  },

  // ---------- notes ----------
  async myNotes(type?: NoteType): Promise<Note[]> {
    const u = await me();
    const myCars = new Set(db.cars.filter(c => c.userId === u.id).map(c => c.id));
    return db.notes
      .filter(n => myCars.has(n.carId) && (!type || n.type === type))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 300)
      .map(toNote);
  },

  async carNotes(carId: string, type?: NoteType): Promise<Note[]> {
    await ownedCar(carId);
    return db.notes
      .filter(n => n.carId === carId && (!type || n.type === type))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(toNote);
  },

  async createNote(carId: string, description: string, price: number | null): Promise<Note> {
    await ownedCar(carId);
    validateNote(description, price);
    const n = addNote(carId, 'Owner', description.trim(), { price });
    await persist();
    return toNote(n);
  },

  async updateNote(id: string, description: string, price: number | null): Promise<Note> {
    const n = await editableNote(id);
    validateNote(description, price);
    n.description = description.trim();
    n.price = price;
    await persist();
    return toNote(n);
  },

  async deleteNote(id: string): Promise<void> {
    const n = await editableNote(id);
    db.notes = db.notes.filter(x => x.id !== n.id);
    await persist();
  },

  // ---------- faults ----------
  async faultLibrary(): Promise<FaultCode[]> {
    await me();
    return [...FAULT_LIBRARY].sort((a, b) => a.code.localeCompare(b.code));
  },

  /** Поллинг. Заодно снимает просроченные тестовые ошибки. */
  async faultState(carId: string): Promise<CarFaultState> {
    const car = await ownedCar(carId);
    const limit = Date.now() - TEST_FAULT_LIFETIME_MS;
    const expired = db.carFaults.filter(f => f.carId === carId && f.isTest && Date.parse(f.detectedAt) < limit);
    if (expired.length) {
      db.carFaults = db.carFaults.filter(f => !expired.includes(f));
      const codes = expired.map(e => FAULT_LIBRARY.find(l => l.id === e.faultCodeId)!.code).join(', ');
      addNote(carId, 'Test', `TEST: тестовые ошибки сняты (${codes})`);
    }
    const before = car.status;
    recalcStatus(car);
    if (expired.length || before !== car.status) await persist();
    return faultState(car);
  },

  /** Тест: намеренно активирует 1–2 ошибки (в журнале — TEST). */
  async runFaultTest(carId: string): Promise<CarFaultState> {
    const car = await ownedCar(carId);
    const active = new Set(db.carFaults.filter(f => f.carId === carId && f.isActive).map(f => f.faultCodeId));
    const candidates = FAULT_LIBRARY.filter(f => !active.has(f.id)).sort(() => Math.random() - 0.5);
    const picked = candidates.slice(0, Math.min(candidates.length, 1 + Math.floor(Math.random() * 2)));
    for (const f of picked) {
      db.carFaults.push({ carId, faultCodeId: f.id, isActive: true, isTest: true, detectedAt: nowIso() });
      addNote(carId, 'Test', `TEST: ${f.code} — ${f.description} [${f.severity}]`);
    }
    recalcStatus(car);
    await persist();
    return faultState(car);
  },

  async clearFaultTest(carId: string): Promise<CarFaultState> {
    const car = await ownedCar(carId);
    const had = db.carFaults.some(f => f.carId === carId && f.isTest);
    db.carFaults = db.carFaults.filter(f => !(f.carId === carId && f.isTest));
    if (had) addNote(carId, 'Test', 'TEST: тестовые ошибки сброшены вручную');
    recalcStatus(car);
    await persist();
    return faultState(car);
  },

  // ---------- telemetry ----------
  async refuel(carId: string, fuelBefore: number, fuelAfter: number): Promise<Note> {
    const car = await ownedCar(carId);
    const added = Math.round((fuelAfter - fuelBefore) * 10) / 10;
    if (added <= 0) throw new ApiError(400, 'Уровень топлива не вырос — это не заправка.');
    if (fuelAfter > car.tankCapacity + 0.5) throw new ApiError(400, 'Больше, чем объём бака.');
    const n = addNote(carId, 'Refuel',
      `Заправка: +${added.toFixed(1)} л (${fuelBefore.toFixed(1)} → ${fuelAfter.toFixed(1)} л)`, { fuelAdded: added });
    await persist();
    return toNote(n);
  },

  async critical(carId: string, parameter: string, value: number, unit: string): Promise<Note | undefined> {
    await ownedCar(carId);
    const prefix = `CRITICAL: ${parameter}`;
    const recent = db.notes.some(n => n.carId === carId && n.type === 'Critical'
      && n.description.startsWith(prefix) && Date.now() - Date.parse(n.date) < CRITICAL_THROTTLE_MS);
    if (recent) return undefined; // не спамим
    const n = addNote(carId, 'Critical', `${prefix} = ${Math.round(value * 10) / 10} ${unit}`);
    await persist();
    return toNote(n);
  },

  /** Полный сброс локальных данных (кнопка в настройках). */
  async resetAll(): Promise<void> {
    db = { users: [], cars: [], notes: [], carFaults: [] };
    currentUserId = null;
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
};

// ---------------- валидация ----------------
function validateCar(name: string, tankCapacity: number) {
  if (!name?.trim() || name.trim().length > 40) throw new ApiError(400, 'Название авто: от 1 до 40 символов.');
  if (!Number.isFinite(tankCapacity) || tankCapacity < 5 || tankCapacity > 300) throw new ApiError(400, 'Объём бака должен быть от 5 до 300 л.');
}
function validateNote(description: string, price: number | null) {
  if (!description?.trim() || description.length > 500) throw new ApiError(400, 'Текст записи: от 1 до 500 символов.');
  if (price != null && (!Number.isFinite(price) || price < 0)) throw new ApiError(400, 'Некорректная цена.');
}
async function editableNote(id: string) {
  const u = await me();
  const n = db.notes.find(x => x.id === id);
  if (!n) throw new ApiError(404, 'Запись не найдена.');
  const car = db.cars.find(c => c.id === n.carId);
  if (!car || car.userId !== u.id) throw new ApiError(403, 'Это не ваша запись.');
  // Правило: системные записи менять нельзя.
  if (n.type !== 'Owner') throw new ApiError(403, 'Системные записи нельзя изменять или удалять.');
  return n;
}
