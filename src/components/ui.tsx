import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Bar } from '../data/types';
import { FACULTY_COLOR, FACULTIES } from '../data/bars';
import { barStatus, upcoming } from '../lib/hours';
import { fmtDateShort, fmtTime, relativeDay } from '../lib/format';
import { fmtDistance, walkMeters, walkMinutes, type LatLng } from '../lib/geo';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';

export const logoUrl = (bar: Bar) => `${import.meta.env.BASE_URL}logos/${bar.logo}`;

export function facultyLabel(id: string): string {
  return FACULTIES.find((f) => f.id === id)?.label ?? id;
}

/** Ticker der får statusvisninger til at opdatere sig selv hvert minut. */
export function useNow(everyMs = 60000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export function StatusChip({ bar, now }: { bar: Bar; now: Date }) {
  const st = useMemo(() => barStatus(bar, now), [bar, now]);
  if (st.open && st.closes) {
    const mins = Math.round((st.closes.getTime() - now.getTime()) / 60000);
    return (
      <span className="chip chip--open">
        <span className="dot" /> Åbent · lukker {mins < 90 ? `om ${mins} min` : fmtTime(st.closes)}
      </span>
    );
  }
  if (st.next && st.opensAt) {
    const rel = relativeDay(st.next.date, now);
    if (st.opensToday) return <span className="chip chip--soon">Åbner {fmtTime(st.opensAt)}</span>;
    return <span className="chip">{rel ?? fmtDateShort(st.next.date)} kl. {st.next.open}</span>;
  }
  return <span className="chip">Ingen datoer</span>;
}

export function FacChip({ id }: { id: string }) {
  return (
    <span className="chip chip--fac">
      <span className="facdot" style={{ background: FACULTY_COLOR[id] || '#888' }} />
      {id}
    </span>
  );
}

export function DistanceChip({ bar, pos }: { bar: Bar; pos: LatLng | null }) {
  if (!pos) return null;
  const m = walkMeters(pos, bar);
  return <span className="chip">🚶 {fmtDistance(m)} · {walkMinutes(m)} min</span>;
}

export function BarCard({ bar, now, horizontal, action }: { bar: Bar; now: Date; horizontal?: boolean; action?: ReactNode }) {
  const { pos, state } = useStore();
  const fav = state.favorites.includes(bar.id);
  return (
    <div
      className={'barcard' + (horizontal ? ' barcard--h' : '')}
      role="button"
      tabIndex={0}
      onClick={() => navigate('/bar/' + bar.id)}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/bar/' + bar.id)}
    >
      <img className="barcard__logo" src={logoUrl(bar)} alt="" loading="lazy" />
      <div className="barcard__body">
        <div className="barcard__name">
          <span className="truncate">{bar.name}</span>
          {fav && <span aria-label="favorit">⭐</span>}
        </div>
        <div className="barcard__sub truncate">{bar.subtitle}</div>
        <div className="barcard__meta">
          <StatusChip bar={bar} now={now} />
          {!horizontal && <FacChip id={bar.faculty} />}
          {!horizontal && <DistanceChip bar={bar} pos={pos} />}
        </div>
      </div>
      {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
    </div>
  );
}

export function AddToCrawlButton({ bar }: { bar: Bar }) {
  const { state, dispatch, toast } = useStore();
  const inCrawl = state.draft.stops.some((s) => s.barId === bar.id);
  return (
    <button
      className={'btn btn--sm' + (inCrawl ? '' : ' btn--primary')}
      onClick={() => {
        if (inCrawl) {
          dispatch({ type: 'draftRemove', index: state.draft.stops.findIndex((s) => s.barId === bar.id) });
          toast(`${bar.name} fjernet fra turen`);
        } else {
          dispatch({ type: 'draftAdd', barId: bar.id });
          toast(`${bar.name} tilføjet til turen`);
        }
      }}
    >
      {inCrawl ? '✓ På turen' : '+ Tur'}
    </button>
  );
}

export function FavButton({ bar, big }: { bar: Bar; big?: boolean }) {
  const { state, dispatch, toast } = useStore();
  const fav = state.favorites.includes(bar.id);
  return (
    <button
      className={'btn' + (big ? '' : ' btn--sm')}
      aria-pressed={fav}
      onClick={() => {
        dispatch({ type: 'toggleFav', id: bar.id });
        toast(fav ? 'Fjernet fra favoritter' : `${bar.name} er nu favorit`);
      }}
    >
      {fav ? '⭐' : '☆'} {big ? (fav ? 'Favorit' : 'Gem') : ''}
    </button>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__ico">{icon}</div>
      <h3>{title}</h3>
      {text && <p className="small" style={{ marginTop: 6 }}>{text}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ title, linkText, onLink }: { title: string; linkText?: string; onLink?: () => void }) {
  return (
    <div className="section__head">
      <h2>{title}</h2>
      {linkText && <button className="section__link" onClick={onLink}>{linkText} ›</button>}
    </div>
  );
}

export function NextOpenings({ bar, now, limit = 4 }: { bar: Bar; now: Date; limit?: number }) {
  const list = upcoming(bar, now, limit);
  if (!list.length) return <p className="small muted">Ingen kommende datoer registreret.</p>;
  return (
    <div>
      {list.map((o) => {
        const open = barStatus(bar, now).open && barStatus(bar, now).next?.date === o.date;
        return (
          <div key={o.date} className={'openrow' + (open ? ' openrow--now' : '')}>
            <div style={{ flex: 1 }}>
              <b className="small">{relativeDay(o.date, now) ?? fmtDateShort(o.date)}</b>
            </div>
            <span className="small muted">{o.open}–{o.close}</span>
          </div>
        );
      })}
    </div>
  );
}
