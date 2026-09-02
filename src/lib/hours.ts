import type { Bar, Opening } from '../data/types';

export function parseLocal(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function openingRange(o: Opening): { start: Date; end: Date } {
  const start = parseLocal(o.date, o.open);
  let end = parseLocal(o.date, o.close);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

const cache = new Map<string, Opening[]>();

/** Alle åbningsdage for en bar, sorteret og uden dubletter. */
export function allOpenings(bar: Bar): Opening[] {
  const hit = cache.get(bar.id);
  if (hit) return hit;
  const byDate = new Map<string, Opening>();
  for (const o of bar.openings) byDate.set(o.date, o);
  const list = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  cache.set(bar.id, list);
  return list;
}

export function openingOn(bar: Bar, date: string): Opening | undefined {
  return allOpenings(bar).find((o) => o.date === date);
}

export interface BarStatus {
  open: boolean;
  /** Når åben: hvornår lukker den */
  closes?: Date;
  /** Næste (eller nuværende) åbning */
  next?: Opening;
  /** Næste åbningstidspunkt som Date */
  opensAt?: Date;
  /** Åbner senere i dag */
  opensToday: boolean;
}

export function barStatus(bar: Bar, now: Date = new Date()): BarStatus {
  const list = allOpenings(bar);
  for (const o of list) {
    const { start, end } = openingRange(o);
    if (now >= start && now < end) return { open: true, closes: end, next: o, opensAt: start, opensToday: false };
    if (start > now) {
      return { open: false, next: o, opensAt: start, opensToday: toDateStr(start) === toDateStr(now) };
    }
  }
  return { open: false, opensToday: false };
}

export function upcoming(bar: Bar, now: Date = new Date(), limit = 6): Opening[] {
  const today = toDateStr(now);
  return allOpenings(bar).filter((o) => o.date >= today).slice(0, limit);
}

/** Dato for førstkommende fredag (i dag hvis det er fredag). */
export function nextFriday(now: Date = new Date()): string {
  const d = new Date(now);
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

export function isWithin(o: Opening, at: Date): boolean {
  const { start, end } = openingRange(o);
  return at >= start && at < end;
}

/** Minutter til lukketid fra et tidspunkt (negativ hvis allerede lukket). */
export function minutesUntilClose(o: Opening, at: Date): number {
  const { end } = openingRange(o);
  return Math.round((end.getTime() - at.getTime()) / 60000);
}
