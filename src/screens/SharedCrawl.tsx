import { useEffect, useMemo, useState } from 'react';
import { BAR_BY_ID } from '../data/bars';
import type { Bar } from '../data/types';
import { fetchWalkingRoute, fmtDistance, googleMapsDirections } from '../lib/geo';
import { buildTimeline, crawlAsIcs, crawlAsText, downloadFile } from '../lib/crawl';
import { copyText, decodeCrawl, nativeShare } from '../lib/share';
import { live, newSession } from '../lib/live';
import { fmtDateLong, fmtMinutes, fmtTime } from '../lib/format';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { MapView } from '../components/MapView';
import { Empty, logoUrl } from '../components/ui';

export function SharedCrawl({ code, now }: { code: string; now: Date }) {
  const { dispatch, toast, pos } = useStore();
  const crawl = useMemo(() => decodeCrawl(code), [code]);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [legs, setLegs] = useState<{ meters: number; seconds: number }[] | null>(null);
  const [starting, setStarting] = useState(false);

  const stopBars = (crawl?.stops ?? []).map((s) => BAR_BY_ID[s.barId]).filter(Boolean) as Bar[];

  useEffect(() => {
    let alive = true;
    if (stopBars.length < 2) return;
    fetchWalkingRoute(stopBars.map((b) => ({ lat: b.lat, lng: b.lng }))).then((r) => {
      if (!alive || !r) return;
      setRouteCoords(r.coords);
      setLegs(r.legs);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const tl = useMemo(() => (crawl ? buildTimeline(crawl, legs) : null), [crawl, legs]);

  if (!crawl || !tl) {
    return (
      <main className="page">
        <Empty icon="🔗" title="Linket kunne ikke læses" text="Det er måske blevet forkortet undervejs. Bed om at få det sendt igen." action={<button className="btn btn--primary" onClick={() => navigate('/')}>Til forsiden</button>} />
      </main>
    );
  }

  const numbers: Record<string, number> = {};
  crawl.stops.forEach((s, i) => { numbers[s.barId] = i + 1; });

  return (
    <main className="page stack">
      <div className="card card--pad" style={{ background: 'linear-gradient(150deg, var(--brand), var(--brand-2))', color: 'var(--on-brand)', border: 'none' }}>
        <span className="tiny" style={{ opacity: .8, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Delt tur</span>
        <h1 style={{ fontSize: 23, margin: '4px 0 6px' }}>{crawl.title}</h1>
        <p className="small" style={{ opacity: .9, margin: 0 }}>
          {fmtDateLong(crawl.date)} · start {crawl.start}
          {crawl.author ? ` · af ${crawl.author}` : ''}
        </p>
        {crawl.note && <p className="small" style={{ opacity: .9, marginTop: 10, marginBottom: 0 }}>📝 {crawl.note}</p>}
      </div>

      <div className="summary">
        <div><b>{crawl.stops.length}</b><span>stop</span></div>
        <div><b>{fmtDistance(tl.totalWalkMeters)}</b><span>gang</span></div>
        <div><b>{fmtTime(tl.end)}</b><span>slut</span></div>
      </div>

      <div className="btnrow">
        <button className="btn btn--primary" onClick={() => { dispatch({ type: 'draft', draft: { ...crawl, id: crawl.id } }); navigate('/tur'); toast('Turen er åbnet i planlæggeren'); }}>
          ✏️ Åbn i planlæggeren
        </button>
        <button className="btn" onClick={() => { downloadFile(`${crawl.title.replace(/[^\wæøåÆØÅ -]/g, '')}.ics`, crawlAsIcs(crawl, tl, location.href), 'text/calendar'); toast('Kalenderfil hentet'); }}>
          📅 Til kalender
        </button>
        <button className="btn" onClick={async () => {
          const ok = await nativeShare({ title: crawl.title, text: crawlAsText(crawl, tl), url: location.href });
          if (!ok) { await copyText(location.href); toast('Link kopieret'); }
        }}>↗ Del videre</button>
      </div>

      <div className="card card--pad stack" style={{ gap: 10 }}>
        <div>
          <h3>🎮 Kør den som et spil</h3>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            Start en live-session: alle melder sig ind, registrerer genstande og drejer lykkehjulet for udfordringer.
          </p>
        </div>
        <button className="btn btn--accent btn--block" disabled={starting} onClick={async () => {
          setStarting(true);
          const s = newSession(crawl, 'host', { wheel: true });
          await live.create(s);
          setStarting(false);
          navigate('/live/' + s.code);
        }}>
          {starting ? 'Starter…' : '🎉 Start live-session'}
        </button>
      </div>

      {tl.warnings > 0 && (
        <div className="card card--pad" style={{ borderColor: 'color-mix(in srgb, var(--danger) 45%, var(--border))' }}>
          <b className="small">⚠️ {tl.warnings} stop passer ikke med åbningstiderne</b>
          <p className="small muted" style={{ margin: '4px 0 0' }}>Åbningstiderne kan være ændret siden turen blev lavet.</p>
        </div>
      )}

      <div className="mapwrap">
        <MapView bars={stopBars} now={now} numbers={numbers} route={routeCoords} userPos={pos} className="map--card" fitKey={'shared:' + code} />
      </div>

      <div className="stack" style={{ gap: 0 }}>
        {tl.items.map((it, i) => (
          <div key={it.bar.id + i}>
            {i > 0 && <div className="walkline">🚶 {it.walkFromPrevMinutes} min · {fmtDistance(it.walkFromPrevMeters)}</div>}
            <div className={'stop' + (it.warning ? ' stop--warn' : '')}>
              <div className="stop__n">{i + 1}</div>
              <img src={logoUrl(it.bar)} alt="" style={{ width: 40, height: 40, borderRadius: 11, objectFit: 'contain', background: 'var(--surface-2)', padding: 3, border: '1px solid var(--border)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b className="truncate" style={{ display: 'block' }}>{it.bar.name}</b>
                <div className="small muted">{fmtTime(it.arrive)} – {fmtTime(it.leave)} · {fmtMinutes(it.minutes)}</div>
                <div className="tiny muted truncate">{it.bar.address.split(',')[0]}</div>
                {it.warning && <div className="chip chip--warn" style={{ marginTop: 6 }}>⚠️ {it.warning}</div>}
                <div className="btnrow" style={{ marginTop: 8 }}>
                  <button className="btn btn--sm" onClick={() => navigate('/bar/' + it.bar.id)}>Se bar</button>
                  <a className="btn btn--sm" href={googleMapsDirections(it.bar, i === 0 ? pos : tl.items[i - 1].bar)} target="_blank" rel="noreferrer">🧭 Rute hertil</a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn--block" onClick={() => navigate('/')}>Udforsk alle barer i appen</button>
    </main>
  );
}
