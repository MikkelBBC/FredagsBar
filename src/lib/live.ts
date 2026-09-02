import type { Crawl, FeedEvent, GameModes, Member, Session } from '../data/types';
import { FIREBASE_CONFIG, firebaseReady } from './firebaseConfig';
import { newId } from './share';

/* ---------------------------------------------------------------------------
 * Et lille synkroniseringslag med to bagender:
 *   - firebase: rigtig live-deling mellem telefoner (når nøglen er sat)
 *   - local:    localStorage + BroadcastChannel, virker på tværs af faner
 * Resten af appen kender kun dette interface.
 * ------------------------------------------------------------------------- */

export type Backend = 'firebase' | 'local';

export interface LiveApi {
  backend: Backend;
  create(session: Session): Promise<void>;
  get(code: string): Promise<Session | null>;
  subscribe(code: string, cb: (s: Session | null) => void): () => void;
  setPath(code: string, path: string, value: unknown): Promise<void>;
  pushFeed(code: string, ev: Omit<FeedEvent, 'id'>): Promise<void>;
}

export const SESSION_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newSessionCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += SESSION_CODE_CHARS[Math.floor(Math.random() * SESSION_CODE_CHARS.length)];
  return s;
}

export const DEFAULT_MODES: GameModes = { wheel: true, rules: true, missions: true, bingo: false, finale: true };

export function newSession(crawl: Crawl, hostId: string, modes: Partial<GameModes> = {}): Session {
  return {
    code: newSessionCode(),
    crawl,
    hostId,
    createdAt: Date.now(),
    modes: { ...DEFAULT_MODES, ...modes },
    rules: {},
    members: {},
    feed: {},
  };
}

export function newMember(name: string, emoji: string): Member {
  return {
    id: newId(),
    name: name.trim() || 'Anonym',
    emoji,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    drinks: 0,
    water: 0,
    xp: 0,
    stop: -1,
    done: [],
  };
}

/* ---------------- lokal bagende ---------------- */

const LKEY = (code: string) => `mfc200:session:${code}`;

function readLocal(code: string): Session | null {
  try {
    const raw = localStorage.getItem(LKEY(code));
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeLocal(s: Session) {
  localStorage.setItem(LKEY(s.code), JSON.stringify(s));
  try { new BroadcastChannel('mfc200:live').postMessage({ code: s.code }); } catch { /* ingen kanal */ }
}

function setDeep(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('/').filter(Boolean);
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  if (value === null) delete cur[parts[parts.length - 1]];
  else cur[parts[parts.length - 1]] = value;
}

const localApi: LiveApi = {
  backend: 'local',
  async create(session) { writeLocal(session); },
  async get(code) { return readLocal(code); },
  subscribe(code, cb) {
    cb(readLocal(code));
    const onStorage = (e: StorageEvent) => { if (e.key === LKEY(code)) cb(readLocal(code)); };
    window.addEventListener('storage', onStorage);
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('mfc200:live');
      ch.onmessage = (e) => { if (e.data?.code === code) cb(readLocal(code)); };
    } catch { /* ingen kanal */ }
    const poll = setInterval(() => cb(readLocal(code)), 4000);
    return () => {
      window.removeEventListener('storage', onStorage);
      ch?.close();
      clearInterval(poll);
    };
  },
  async setPath(code, path, value) {
    const s = readLocal(code);
    if (!s) return;
    setDeep(s as unknown as Record<string, unknown>, path, value);
    writeLocal(s);
  },
  async pushFeed(code, ev) {
    const s = readLocal(code);
    if (!s) return;
    const id = newId();
    s.feed = { ...s.feed, [id]: { ...ev, id } };
    writeLocal(s);
  },
};

/* ---------------- firebase-bagende ---------------- */

type FbMod = typeof import('firebase/database');
let fbCache: { db: unknown; mod: FbMod } | null = null;

async function fb(): Promise<{ db: any; mod: FbMod }> {
  if (fbCache) return fbCache as { db: any; mod: FbMod };
  const [{ initializeApp, getApps }, mod] = await Promise.all([
    import('firebase/app'),
    import('firebase/database'),
  ]);
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  const db = mod.getDatabase(app);
  fbCache = { db, mod };
  return { db, mod };
}

/** Firebase kan ikke lide undefined – ryd op før skrivning. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)));
}

const firebaseApi: LiveApi = {
  backend: 'firebase',
  async create(session) {
    const { db, mod } = await fb();
    await mod.set(mod.ref(db, `sessions/${session.code}`), clean(session));
  },
  async get(code) {
    const { db, mod } = await fb();
    const snap = await mod.get(mod.ref(db, `sessions/${code}`));
    return snap.exists() ? (snap.val() as Session) : null;
  },
  subscribe(code, cb) {
    let off: (() => void) | null = null;
    let cancelled = false;
    fb().then(({ db, mod }) => {
      if (cancelled) return;
      const r = mod.ref(db, `sessions/${code}`);
      const unsub = mod.onValue(
        r,
        (snap) => {
          const val = snap.val() as Session | null;
          if (!val) { cb(null); return; }
          cb({ ...val, members: val.members || {}, feed: val.feed || {} });
        },
        () => cb(null),
      );
      off = unsub;
    });
    return () => { cancelled = true; off?.(); };
  },
  async setPath(code, path, value) {
    const { db, mod } = await fb();
    await mod.set(mod.ref(db, `sessions/${code}/${path}`), clean(value));
  },
  async pushFeed(code, ev) {
    const { db, mod } = await fb();
    const r = mod.push(mod.ref(db, `sessions/${code}/feed`));
    await mod.set(r, clean({ ...ev, id: r.key }));
  },
};

export const live: LiveApi = firebaseReady() ? firebaseApi : localApi;

export const liveIsShared = () => live.backend === 'firebase';

/* ---------------- pointsystem ---------------- */

export const XP = {
  join: 10,
  checkin: 25,
  /** Bonus til den foerste der tjekker ind paa et stop */
  first: 15,
  drink: 5,
  water: 8,
  cheers: 5,
  bingoLine: 75,
} as const;

export function memberList(s: Session | null): Member[] {
  if (!s) return [];
  return Object.values(s.members || {}).sort((a, b) => b.xp - a.xp || a.joinedAt - b.joinedAt);
}

export function feedList(s: Session | null, limit = 40): FeedEvent[] {
  if (!s) return [];
  return Object.values(s.feed || {}).sort((a, b) => b.t - a.t).slice(0, limit);
}

export function sessionUrl(code: string): string {
  return `${location.origin}${location.pathname}#/live/${code}`;
}
