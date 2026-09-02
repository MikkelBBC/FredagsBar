import { useMemo, useState } from 'react';
import { BARS, BAR_BY_ID, FACULTY_COLOR } from '../data/bars';
import type { Bar } from '../data/types';
import { allOpenings, barStatus, toDateStr } from '../lib/hours';
import { fmtDateLong, relativeDay } from '../lib/format';
import { fmtDistance, googleMapsDirections, walkMeters, walkMinutes } from '../lib/geo';
import { copyText, nativeShare } from '../lib/share';
import { back, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { MapView } from '../components/MapView';
import { AddToCrawlButton, BarCard, Empty, FavButton, StatusChip, facultyLabel, logoUrl } from '../components/ui';

function socialUrl(kind: string, value: string, bar: Bar): string {
  if (value.startsWith('http')) return value;
  const q = encodeURIComponent(bar.name + ' Aarhus');
  if (kind === 'instagram') return `https://www.instagram.com/explore/search/keyword/?q=${q}`;
  if (kind === 'facebook') return `https://www.facebook.com/search/top?q=${q}`;
  if (kind === 'tiktok') return `https://www.tiktok.com/search?q=${q}`;
  return `https://duckduckgo.com/?q=${q}`;
}

const SOCIAL_ICON: Record<string, string> = { instagram: '📸 Instagram', facebook: '👥 Facebook', tiktok: '🎵 TikTok', website: '🌐 Hjemmeside' };

export function BarDetail({ id, now }: { id: string; now: Date }) {
  const bar = BAR_BY_ID[id];
  const { state, dispatch, pos, toast } = useStore();
  const [showAll, setShowAll] = useState(false);

  const openings = useMemo(() => (bar ? allOpenings(bar) : []), [bar]);
  const today = toDateStr(now);
  const future = openings.filter((o) => o.date >= today);
  const shown = showAll ? openings : future.slice(0, 6);

  const nearby = useMemo(() => {
    if (!bar) return [];
    return BARS.filter((b) => b.id !== bar.id)
      .map((b) => ({ b, m: walkMeters(bar, b) }))
      .sort((x, y) => x.m - y.m)
      .slice(0, 3);
  }, [bar]);

  if (!bar) {
    return (
      <main className="page">
        <Empty icon="🤷" title="Baren findes ikke" action={<button className="btn btn--primary" onClick={() => navigate('/barer')}>Se alle barer</button>} />
      </main>
    );
  }

  const st = barStatus(bar, now);
  const visits = state.visited[bar.id] || 0;

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/bar/${bar.id}`;
    const ok = await nativeShare({ title: bar.name, text: `${bar.name} – ${bar.subtitle}`, url });
    if (!ok) { await copyText(url); toast('Link kopieret'); }
  };

  return (
    <main className="page stack">
      <div className="row">
        <button className="btn btn--sm" onClick={() => back('/barer')}>‹ Tilbage</button>
        <div className="spacer" />
        <button className="btn btn--sm" onClick={share}>↗ Del</button>
      </div>

      <div className="hero">
        <img className="hero__logo" src={logoUrl(bar)} alt="" />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22 }}>{bar.name}</h1>
          <p className="small" style={{ opacity: .85, margin: '4px 0 8px' }}>{bar.subtitle}</p>
          <StatusChip bar={bar} now={now} />
        </div>
      </div>

      <div className="btnrow">
        <AddToCrawlButton bar={bar} />
        <FavButton bar={bar} big />
        <a className="btn" href={googleMapsDirections(bar, pos)} target="_blank" rel="noreferrer">🧭 Vis rute</a>
        <button className="btn" onClick={() => navigate('/kort/' + bar.id)}>🗺️ På kortet</button>
      </div>

      {st.open && st.closes && (
        <div className="card card--pad" style={{ borderColor: 'color-mix(in srgb, var(--ok) 40%, var(--border))' }}>
          <div className="row">
            <span className="dot" />
            <b>Åbent nu</b>
            <div className="spacer" />
            <span className="small muted">Lukker {st.closes.getHours()}:{String(st.closes.getMinutes()).padStart(2, '0')}</span>
          </div>
        </div>
      )}

      <div className="card card--pad">
        <div className="kv">
          <div className="kv__k">Adresse</div>
          <div className="kv__v">
            <a className="link" href={googleMapsDirections(bar, pos)} target="_blank" rel="noreferrer">{bar.address}</a>
            {pos && <div className="small muted">🚶 {fmtDistance(walkMeters(pos, bar))} · ca. {walkMinutes(walkMeters(pos, bar))} min herfra</div>}
          </div>
        </div>
        <div className="kv">
          <div className="kv__k">Område</div>
          <div className="kv__v">{bar.area}</div>
        </div>
        <div className="kv">
          <div className="kv__k">Fakultet</div>
          <div className="kv__v">
            <span className="facdot" style={{ background: FACULTY_COLOR[bar.faculty], display: 'inline-block', marginRight: 6 }} />
            {facultyLabel(bar.faculty)} · {bar.institution}
          </div>
        </div>
        {bar.price && (
          <div className="kv">
            <div className="kv__k">Priser</div>
            <div className="kv__v">{bar.price}</div>
          </div>
        )}
        {bar.hoursNote && (
          <div className="kv">
            <div className="kv__k">Bemærk</div>
            <div className="kv__v">{bar.hoursNote}</div>
          </div>
        )}
      </div>

      {bar.about && (
        <div className="card card--pad">
          <h3 style={{ marginBottom: 8 }}>Om baren</h3>
          {bar.about.split('\n').map((p, i) => <p key={i} className="small" style={{ margin: '0 0 8px' }}>{p}</p>)}
          {bar.socials && (
            <div className="btnrow" style={{ marginTop: 6 }}>
              {Object.entries(bar.socials).map(([k, v]) => v && (
                <a key={k} className="btn btn--sm" href={socialUrl(k, v, bar)} target="_blank" rel="noreferrer">{SOCIAL_ICON[k] ?? k}</a>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card card--pad">
        <div className="row row--between" style={{ marginBottom: 4 }}>
          <h3>Åbningsdatoer</h3>
          <span className="small muted">{future.length} kommende</span>
        </div>
        {shown.length ? shown.map((o) => {
          const isNow = st.open && st.next?.date === o.date;
          return (
            <div key={o.date} className={'openrow' + (isNow ? ' openrow--now' : '')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b className="small">{relativeDay(o.date, now) ?? fmtDateLong(o.date)}</b>
                {o.date < today && <span className="tiny muted"> · afholdt</span>}
              </div>
              <span className="small muted nowrap">{o.open}–{o.close}</span>
            </div>
          );
        }) : <p className="small muted">Ingen kommende datoer registreret.</p>}
        {(future.length > 6 || openings.length > future.length) && (
          <button className="btn btn--sm btn--block" style={{ marginTop: 10 }} onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Vis færre' : `Vis alle ${openings.length} datoer`}
          </button>
        )}
      </div>

      <div className="card card--pad">
        <div className="row row--between">
          <div>
            <h3>Dine besøg</h3>
            <span className="small muted">{visits === 0 ? 'Du har ikke været her endnu' : `${visits} ${visits === 1 ? 'gang' : 'gange'}`}</span>
          </div>
          <div className="stepper">
            <button onClick={() => dispatch({ type: 'visit', id: bar.id, delta: -1 })} aria-label="Færre">−</button>
            <span>{visits}</span>
            <button onClick={() => { dispatch({ type: 'visit', id: bar.id, delta: 1 }); toast('Besøg registreret 🍻'); }} aria-label="Flere">+</button>
          </div>
        </div>
      </div>

      <div className="mapwrap">
        <MapView bars={[bar]} now={now} userPos={pos} className="map--card" fitKey={'detail:' + bar.id} interactive={false} />
      </div>

      <section>
        <div className="section__head"><h2>Tættest på {bar.name}</h2></div>
        <div className="stack" style={{ gap: 8 }}>
          {nearby.map(({ b, m }) => (
            <BarCard key={b.id} bar={b} now={now} action={<span className="chip nowrap">🚶 {walkMinutes(m)} min</span>} />
          ))}
        </div>
      </section>
    </main>
  );
}
