import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Crawl, Stop } from '../data/types';
import { nextFriday } from './hours';
import { newId } from './share';
import type { LatLng } from './geo';

export interface State {
  name: string;
  /** Manuelt sat position, brugt hvis GPS er blokeret eller upålidelig */
  manualPos: LatLng | null;
  /** Live-ture man har været med i, nyeste først */
  recent: { code: string; title: string; at: number }[];
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
  const base: State = { name: '', manualPos: null, recent: [], theme: 'system', favorites: [], visited: {}, crawls: [], draft: emptyDraft(), toasts: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return { ...base, ...parsed, toasts: [], recent: parsed.recent || [], draft: parsed.draft || base.draft };
  } catch {
    return base;
  }
}

export type Action =
  | { type: 'name'; name: string }
  | { type: 'manualPos'; pos: LatLng | null }
  | { type: 'rememberSession'; code: string; title: string }
  | { type: 'forgetSession'; code: string }
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
  | { type: 'toast'; id: number; text: string }
  | { type: 'untoast'; id: number }
  | { type: 'reset' };

let toastId = 0;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'name': return { ...s, name: a.name };
    case 'manualPos': return { ...s, manualPos: a.pos };
    case 'rememberSession': {
      const rest = (s.recent || []).filter((r) => r.code !== a.code);
      return { ...s, recent: [{ code: a.code, title: a.title, at: Date.now() }, ...rest].slice(0, 10) };
    }
    case 'forgetSession': return { ...s, recent: (s.recent || []).filter((r) => r.code !== a.code) };
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
    case 'toast': {
      const last = s.toasts[s.toasts.length - 1];
      // Samme besked igen? Tæl op i stedet for at stable dem oven på hinanden.
      if (last && last.text.replace(/ ×\d+$/, '') === a.text) {
        const n = Number(last.text.match(/ ×(\d+)$/)?.[1] ?? 1) + 1;
        return { ...s, toasts: [...s.toasts.slice(0, -1), { id: last.id, text: `${a.text} ×${n}` }] };
      }
      return { ...s, toasts: [...s.toasts, { id: a.id, text: a.text }].slice(-3) };
    }
    case 'untoast': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case 'reset': return { ...s, favorites: [], visited: {}, crawls: [], draft: emptyDraft(), name: '', manualPos: null, recent: [] };
  }
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  toast: (text: string) => void;
  /** Den position appen regner med: manuelt sat hvis der er en, ellers GPS. */
  pos: LatLng | null;
  posSource: 'manuel' | 'gps' | null;
  posError: string | null;
  locating: boolean;
  /** Unøjagtighed i meter på seneste position */
  accuracy: number | null;
  locate: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [gpsPos, setPos] = useState<LatLng | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
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

  /**
   * GPS er langsom og upålidelig indendørs – især på mobil. Derfor:
   * først et hurtigt bud med høj præcision, så et nyt forsøg uden hvis det
   * timer ud, og til sidst en watch der holder positionen frisk.
   */
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setPosError('Din browser understøtter ikke lokation'); return; }
    setLocating(true);
    setPosError(null);

    const onOk = (p: GeolocationPosition) => {
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
      setAccuracy(Math.round(p.coords.accuracy));
      setPosError(null);
      setLocating(false);
    };

    const startWatch = () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = navigator.geolocation.watchPosition(
        onOk,
        () => { /* enkelte fejl i en watch er normale – vi beholder sidste kendte position */ },
        { enableHighAccuracy: true, maximumAge: 20000, timeout: 45000 },
      );
    };

    const onFail = (e: GeolocationPositionError) => {
      if (e.code === e.PERMISSION_DENIED) {
        setPosError('Lokation er blokeret – tillad det i browserens indstillinger og prøv igen');
        setLocating(false);
        return;
      }
      // Andet forsøg: uden høj præcision og med længere frist (virker typisk indendørs).
      navigator.geolocation.getCurrentPosition(
        (p) => { onOk(p); startWatch(); },
        (e2) => {
          setPosError(e2.code === e2.TIMEOUT
            ? 'GPS svarer ikke lige nu – prøv igen, gerne tæt på et vindue eller udenfor'
            : 'Kunne ikke finde din position');
          setLocating(false);
        },
        { enableHighAccuracy: false, maximumAge: 120000, timeout: 30000 },
      );
    };

    navigator.geolocation.getCurrentPosition(
      (p) => { onOk(p); startWatch(); },
      onFail,
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 12000 },
    );
  }, []);

  // Stop med at følge positionen når appen lukkes.
  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  useEffect(() => {
    // Find brugeren stille hvis der allerede er givet tilladelse.
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((r) => { if (r.state === 'granted') locate(); })
        .catch(() => {});
    }
  }, [locate]);

  // Hver toast har sin egen nedtælling, så en ny besked ikke forlænger de andre.
  const toast = useCallback((text: string) => {
    const id = ++toastId;
    dispatch({ type: 'toast', id, text });
    setTimeout(() => dispatch({ type: 'untoast', id }), 2600);
  }, []);

  // Manuel position vinder over GPS – den har brugeren selv peget ud.
  const pos = state.manualPos ?? gpsPos;
  const posSource: 'manuel' | 'gps' | null = state.manualPos ? 'manuel' : gpsPos ? 'gps' : null;

  const value = useMemo(
    () => ({ state, dispatch, toast, pos, posSource, posError, locating, accuracy, locate }),
    [state, toast, pos, posSource, posError, locating, accuracy, locate],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider mangler');
  return c;
}
