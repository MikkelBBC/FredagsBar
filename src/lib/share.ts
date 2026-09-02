import type { Crawl } from '../data/types';

function toB64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Kompakt kodning af en tur til et delelink. */
export function encodeCrawl(c: Crawl): string {
  const compact = {
    v: 1,
    t: c.title,
    d: c.date,
    s: c.start,
    st: c.stops.map((s) => [s.barId, s.minutes]),
    n: c.note || undefined,
    a: c.author || undefined,
  };
  return toB64Url(JSON.stringify(compact));
}

export function decodeCrawl(code: string): Crawl | null {
  try {
    const o = JSON.parse(fromB64Url(code));
    if (!o || !Array.isArray(o.st)) return null;
    return {
      id: 'delt-' + code.slice(0, 12),
      title: String(o.t || 'Delt tur'),
      date: String(o.d),
      start: String(o.s || '16:00'),
      stops: o.st.map((s: [string, number]) => ({ barId: String(s[0]), minutes: Number(s[1]) || 60 })),
      note: o.n ? String(o.n) : undefined,
      author: o.a ? String(o.a) : undefined,
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function shareUrl(c: Crawl): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/tur/${encodeCrawl(c)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

export async function nativeShare(data: { title: string; text: string; url: string }): Promise<boolean> {
  if (navigator.share) {
    try { await navigator.share(data); return true; } catch { return false; }
  }
  return false;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
