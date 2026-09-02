const daFull = new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
const daShort = new Intl.DateTimeFormat('da-DK', { weekday: 'short', day: 'numeric', month: 'short' });

function toLocal(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function fmtDateLong(date: string): string {
  const s = daFull.format(toLocal(date));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtDateShort(date: string): string {
  const s = daShort.format(toLocal(date)).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeDay(date: string, now: Date = new Date()): string | null {
  const target = toLocal(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return null;
}

export function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} t ${m} min` : `${h} t`;
}

export function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60000);
}

export function isFriday(date: string): boolean {
  return toLocal(date).getDay() === 5;
}
