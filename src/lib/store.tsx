import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Crawl, Stop } from '../data/types';
import { nextFriday } from './hours';
import { newId } from './share';
import type { LatLng } from './geo';

export interface State {
  name: string;
  theme: 'light' | 'dark' | 'system';
  favorites: string[];
  visited: Record<string, number>;
  crawls: Crawl[];
  draft: Crawl;
  toasts: { id: number; text: string }[];
}

const KEY = 'mfc200:v1';

export function emptyDraft(): Crawl {
  return { id: newId(), title: 'Fredagstur', date: nextFriday(), start: '16:00', stops: [], createdAt: Date.now() };
}

function load(): State {
  const base: State = { name: '', theme: 'system', favorites: [], visited: {}, crawls: [], draft: emptyDraft(), toasts: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return { ...base, ...parsed, toasts: [], draft: parsed.draft || base.draft };
  } catch {
    return base;
  }
}

export type Action =
  | { type: 'name'; name: string }
  | { type: 'theme'; theme: State['theme'] }
  | { type: 'toggleFav'; id: string }
  | { type: 'visit'; id: string; delta: number }
  | { type: 'draft'; draft: Crawl }
  | { type: 'draftAdd'; barId: string; minutes?: number }
  | { type: 'draftRemove'; index: number }
  | { type: 'draftMove'; from: number; to: number }
  | { type: 'draftStops'; stops: Stop[] }
  | { type: 'draftReset' }
  | { type: 'saveCrawl'; crawl: Crawl }
  | { type: 'deleteCrawl'; id: string }
  | { type: 'toast'; text: string }
  | { type: 'untoast'; id: number }
  | { type: 'reset' };

let toastId = 0;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'name': return { ...s, name: a.name };
    case 'theme': return { ...s, theme: a.theme };
    case 'toggleFav': return { ...s, favorites: s.favorites.includes(a.id) ? s.favorites.filter((x) => x !== a.id) : [...s.favorites, a.id] };
    case 'visit': {
      const n = Math.max(0, (s.visited[a.id] || 0) + a.delta);
      const visited = { ...s.visited };
      if (n === 0) delete visited[a.id]; else visited[a.id] = n;
      return { ...s, visited };
    }
    case 'draft': return { ...s, draft: a.draft };
    case 'draftAdd': {
      if (s.draft.stops.some((st) => st.barId === a.barId)) return s;
      return { ...s, draft: { ...s.draft, stops: [...s.draft.stops, { barId: a.barId, minutes: a.minutes ?? 60 }] } };
    }
    case 'draftRemove': return { ...s, draft: { ...s.draft, stops: s.draft.stops.filter((_, i) => i !== a.index) } };
    case 'draftMove': {
      if (a.to < 0 || a.to >= s.draft.stops.length) return s;
      const stops = [...s.draft.stops];
      const [it] = stops.splice(a.from, 1);
      stops.splice(a.to, 0, it);
      return { ...s, draft: { ...s.draft, stops } };
    }
    case 'draftStops': return { ...s, draft: { ...s.draft, stops: a.stops } };
    case 'draftReset': return { ...s, draft: emptyDraft() };
    case 'saveCrawl': {
      const exists = s.crawls.some((c) => c.id === a.crawl.id);
      const crawls = exists ? s.crawls.map((c) => (c.id === a.crawl.id ? a.crawl : c)) : [a.crawl, ...s.crawls];
      return { ...s, crawls };
    }
    case 'deleteCrawl': return { ...s, crawls: s.crawls.filter((c) => c.id !== a.id) };
    case 'toast': return { ...s, toasts: [...s.toasts, { id: ++toastId, text: a.text }] };
    case 'untoast': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'reset': return { ...s, favorites: [], visited: {}, crawls: [], draft: emptyDraft(), name: '' };
  }
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  toast: (text: string) => void;
  pos: LatLng | null;
  posError: string | null;
  locating: boolean;
  locate: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const { toasts: _t, ...persist } = state;
    localStorage.setItem(KEY, JSON.stringify(persist));
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = state.theme === 'dark' || (state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.setAttribute('content', dark ? '#14261c' : '#1f3a2c');
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.theme]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) { setPosError('Din browser understøtter ikke lokation'); return; }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    setLocating(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setPosError(null); setLocating(false); },
      (e) => { setPosError(e.code === 1 ? 'Lokation er blokeret i browseren' : 'Kunne ikke finde din position'); setLocating(false); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 },
    );
  }, []);

  useEffect(() => {
    // Find brugeren stille hvis der allerede er givet tilladelse.
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((r) => { if (r.state === 'granted') locate(); })
        .catch(() => {});
    }
  }, [locate]);

  const toast = useCallback((text: string) => dispatch({ type: 'toast', text }), []);

  useEffect(() => {
    if (!state.toasts.length) return;
    const t = setTimeout(() => dispatch({ type: 'untoast', id: state.toasts[0].id }), 2600);
    return () => clearTimeout(t);
  }, [state.toasts]);

  const value = useMemo(() => ({ state, dispatch, toast, pos, posError, locating, locate }), [state, toast, pos, posError, locating, locate]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider mangler');
  return c;
}
