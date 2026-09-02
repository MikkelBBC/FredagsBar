import type { Bar, Crawl, Opening } from '../data/types';
import { BAR_BY_ID } from '../data/bars';
import { openingOn, openingRange, parseLocal } from './hours';
import { walkMeters, walkMinutes, type LatLng } from './geo';
import { addMinutes, fmtTime } from './format';

export interface TimelineItem {
  bar: Bar;
  index: number;
  arrive: Date;
  leave: Date;
  minutes: number;
  walkFromPrevMeters: number;
  walkFromPrevMinutes: number;
  opening?: Opening;
  warning?: string;
  ok: boolean;
}

export interface Timeline {
  items: TimelineItem[];
  totalWalkMeters: number;
  totalWalkMinutes: number;
  start: Date;
  end: Date;
  totalMinutes: number;
  warnings: number;
}

/**
 * Regner ankomst/afgang for hvert stop ud fra starttid, gåtid og opholdstid.
 * legOverrides: rigtige gåtider fra ruteservice (ét element pr. ben mellem stops).
 */
export function buildTimeline(crawl: Crawl, legOverrides?: { meters: number; seconds: number }[] | null): Timeline {
  const start = parseLocal(crawl.date, crawl.start || '16:00');
  let t = new Date(start);
  let prev: LatLng | null = null;
  const items: TimelineItem[] = [];
  let totalWalkMeters = 0, totalWalkMinutes = 0, warnings = 0;

  crawl.stops.forEach((stop, i) => {
    const bar = BAR_BY_ID[stop.barId];
    if (!bar) return;
    let wm = 0, wmin = 0;
    if (prev) {
      const ov = legOverrides?.[items.length - 1];
      if (ov) { wm = ov.meters; wmin = Math.max(1, Math.round(ov.seconds / 60)); }
      else { wm = walkMeters(prev, bar); wmin = walkMinutes(wm); }
      t = addMinutes(t, wmin);
      totalWalkMeters += wm; totalWalkMinutes += wmin;
    }
    const arrive = new Date(t);
    const leave = addMinutes(arrive, stop.minutes);
    const opening = openingOn(bar, crawl.date);
    let warning: string | undefined;
    if (!opening) {
      warning = 'Ingen registreret åbning denne dag';
    } else {
      const { start: os, end: oe } = openingRange(opening);
      if (arrive < os) warning = `Åbner først kl. ${fmtTime(os)}`;
      else if (arrive >= oe) warning = `Lukkede kl. ${fmtTime(oe)}`;
      else if (leave > oe) warning = `Lukker kl. ${fmtTime(oe)} – før I går videre`;
    }
    if (warning) warnings++;
    items.push({ bar, index: i, arrive, leave, minutes: stop.minutes, walkFromPrevMeters: wm, walkFromPrevMinutes: wmin, opening, warning, ok: !warning });
    t = leave;
    prev = bar;
  });

  const end = items.length ? items[items.length - 1].leave : start;
  return {
    items,
    totalWalkMeters,
    totalWalkMinutes,
    start,
    end,
    totalMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
    warnings,
  };
}

export function crawlAsText(crawl: Crawl, tl: Timeline, url?: string): string {
  const lines: string[] = [];
  const date = new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseLocal(crawl.date, '12:00'));
  lines.push(`🍻 ${crawl.title} – ${date}`);
  if (crawl.author) lines.push(`Planlagt af ${crawl.author}`);
  lines.push('');
  tl.items.forEach((it, i) => {
    if (i > 0) lines.push(`   🚶 ${it.walkFromPrevMinutes} min`);
    lines.push(`${i + 1}. ${fmtTime(it.arrive)}–${fmtTime(it.leave)}  ${it.bar.name}  (${it.bar.address.split(',')[0]})${it.warning ? '  ⚠️ ' + it.warning : ''}`);
  });
  lines.push('');
  lines.push(`Slut ca. ${fmtTime(tl.end)} · ${(tl.totalWalkMeters / 1000).toFixed(1).replace('.', ',')} km gang`);
  if (crawl.note) lines.push(`📝 ${crawl.note}`);
  if (url) { lines.push(''); lines.push(`Åbn i appen: ${url}`); }
  return lines.join('\n');
}

function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

export function crawlAsIcs(crawl: Crawl, tl: Timeline, url?: string): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MikkelFredagsCafe200//DA', 'CALSCALE:GREGORIAN'];
  tl.items.forEach((it, i) => {
    out.push('BEGIN:VEVENT');
    out.push(`UID:${crawl.id}-${i}@mikkelfredagscafe200`);
    out.push(`DTSTAMP:${icsDate(new Date())}`);
    out.push(`DTSTART:${icsDate(it.arrive)}`);
    out.push(`DTEND:${icsDate(it.leave)}`);
    out.push(`SUMMARY:${esc(`${i + 1}/${tl.items.length} ${it.bar.name} – ${crawl.title}`)}`);
    out.push(`LOCATION:${esc(it.bar.address)}`);
    out.push(`DESCRIPTION:${esc(it.bar.subtitle + (url ? `\n${url}` : ''))}`);
    out.push(`GEO:${it.bar.lat};${it.bar.lng}`);
    out.push('END:VEVENT');
  });
  out.push('END:VCALENDAR');
  return out.join('\r\n');
}

export function downloadFile(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
