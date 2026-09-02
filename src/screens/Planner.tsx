import { useEffect, useMemo, useState } from 'react';
import { BARS, BAR_BY_ID } from '../data/bars';
import type { Bar, Stop } from '../data/types';
import { openingOn, openingRange, parseLocal, nextFriday } from '../lib/hours';
import { fmtDateLong, fmtMinutes, fmtTime, addMinutes } from '../lib/format';
import { fetchWalkingRoute, fmtDistance, optimizeOrder, walkMeters, walkMinutes, type LatLng } from '../lib/geo';
import { buildTimeline, crawlAsIcs, crawlAsText, downloadFile } from '../lib/crawl';
import { copyText, nativeShare, shareUrl } from '../lib/share';
import { DEFAULT_MODES, live, liveIsShared, newSession } from '../lib/live';
import type { GameModes } from '../data/types';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { MapView } from '../components/MapView';
import { Empty, logoUrl } from '../components/ui';

const MODE_LIST: { key: keyof GameModes; ico: string; title: string; text: string }[] = [
  { key: 'wheel', ico: '🎡', title: 'Konsekvenshjul', text: 'Drej ved hver bar – hjulet giver en konsekvens. Jo sjældnere felt, jo flere XP.' },
  { key: 'rules', ico: '👑', title: 'Regelmester', text: 'Den første der tjekker ind trækker en regel der gælder alle på det stop.' },
  { key: 'missions', ico: '🕵️', title: 'Hemmelige missioner', text: 'Alle får en mission kun de selv kan se. Klarer du den i smug, giver det stort.' },
  { key: 'bingo', ico: '🔢', title: 'Bingoplade', text: 'Hver deltager får en 3x3-plade med ting der sker i løbet af aftenen.' },
  { key: 'finale', ico: '🔥', title: 'Finale', text: 'Sidste stop giver dobbelt XP – så stillingen kan væltes til sidst.' },
];

export function Planner({ now }: { now: Date }) {
  const { state, dispatch, toast, pos, locate } = useStore();
  const draft = state.draft;
  const [picker, setPicker] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [legs, setLegs] = useState<{ meters: number; seconds: number }[] | null>(null);
  const [routing, setRouting] = useState(false);
  const [modes, setModes] = useState<GameModes>(DEFAULT_MODES);
  const [starting, setStarting] = useState(false);

  const stopBars = draft.stops.map((s) => BAR_BY_ID[s.barId]).filter(Boolean) as Bar[];

  // Hent rigtig gårute når stoppene ændrer sig.
  useEffect(() => {
    let alive = true;
    if (stopBars.length < 2) { setRouteCoords(null); setLegs(null); return; }
    setRouting(true);
    fetchWalkingRoute(stopBars.map((b) => ({ lat: b.lat, lng: b.lng }))).then((r) => {
      if (!alive) return;
      setRouting(false);
      if (r) { setRouteCoords(r.coords); setLegs(r.legs); }
      else { setRouteCoords(stopBars.map((b) => [b.lat, b.lng] as [number, number])); setLegs(null); }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.stops.map((s) => s.barId).join(',')]);

  const tl = useMemo(() => buildTimeline(draft, legs), [draft, legs]);

  const numbers = useMemo(() => {
    const o: Record<string, number> = {};
    draft.stops.forEach((s, i) => { o[s.barId] = i + 1; });
    return o;
  }, [draft.stops]);

  const setDraft = (patch: Partial<typeof draft>) => dispatch({ type: 'draft', draft: { ...draft, ...patch } });

  const optimize = () => {
    if (draft.stops.length < 3) { toast('Tilføj mindst 3 stop først'); return; }
    const pts = stopBars.map((b) => ({ lat: b.lat, lng: b.lng }));
    const order = optimizeOrder(pts, false, pos);
    dispatch({ type: 'draftStops', stops: order.map((i) => draft.stops[i]) });
    toast('Rækkefølgen er optimeret 🧭');
  };

  const share = async () => {
    const url = shareUrl(draft);
    const ok = await nativeShare({ title: draft.title, text: crawlAsText(draft, tl), url });
    if (!ok) { await copyText(url); toast('Delelink kopieret – send det til vennerne'); }
  };

  const copyPlan = async () => {
    await copyText(crawlAsText(draft, tl, shareUrl(draft)));
    toast('Planen er kopieret som tekst');
  };

  const saveCrawl = () => {
    dispatch({ type: 'saveCrawl', crawl: { ...draft, createdAt: Date.now() } });
    toast('Turen er gemt under Mig');
  };

  const autoPlan = (count: number) => {
    const plan = buildAutoPlan(draft.date, draft.start, count, pos);
    if (!plan.length) { toast('Ingen barer har åbent den dag'); return; }
    dispatch({ type: 'draftStops', stops: plan });
    toast(`Foreslået tur med ${plan.length} stop ✨`);
  };

  const startSession = async () => {
    if (!draft.stops.length) { toast('Tilføj mindst ét stop først'); return; }
    setStarting(true);
    const s = newSession({ ...draft, author: draft.author || state.name }, 'host', modes);
    await live.create(s);
    setStarting(false);
    navigate('/live/' + s.code);
  };

  const totalStay = draft.stops.reduce((s, x) => s + x.minutes, 0);

  return (
    <main className="page stack">
      <div className="row row--between">
        <h1>Planlæg turen</h1>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn--sm" onClick={() => navigate('/live')}>Deltag</button>
          {draft.stops.length > 0 && (
            <button className="btn btn--sm" onClick={() => { if (confirm('Ryd hele turen?')) { dispatch({ type: 'draftReset' }); toast('Turen er ryddet'); } }}>
              Ryd
            </button>
          )}
        </div>
      </div>

      <div className="card card--pad stack" style={{ gap: 10 }}>
        <div className="field">
          <label htmlFor="p-title">Navn på turen</label>
          <input id="p-title" className="input" value={draft.title} onChange={(e) => setDraft({ title: e.target.value })} placeholder="Fredagstur" />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="p-date">Dato</label>
            <input id="p-date" className="input" type="date" value={draft.date} onChange={(e) => setDraft({ date: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="p-start">Start</label>
            <input id="p-start" className="input" type="time" value={draft.start} onChange={(e) => setDraft({ start: e.target.value })} />
          </div>
        </div>
        <div className="row row--wrap" style={{ gap: 6 }}>
          <button className="fchip" onClick={() => setDraft({ date: nextFriday(now) })}>Næste fredag</button>
          <button className="fchip" onClick={() => setDraft({ start: '15:00' })}>Start 15:00</button>
          <button className="fchip" onClick={() => setDraft({ start: '16:00' })}>16:00</button>
          <button className="fchip" onClick={() => setDraft({ start: '18:00' })}>18:00</button>
        </div>
      </div>

      {draft.stops.length === 0 ? (
        <>
          <Empty
            icon="🧭"
            title="Ingen stop endnu"
            text="Tilføj barer manuelt, eller lad appen foreslå en rute ud fra hvem der har åbent."
          />
          <div className="btnrow">
            <button className="btn btn--primary btn--block" onClick={() => setPicker(true)}>+ Tilføj barer</button>
          </div>
          <div className="btnrow">
            <button className="btn" onClick={() => autoPlan(3)}>✨ Foreslå 3 stop</button>
            <button className="btn" onClick={() => autoPlan(4)}>✨ 4 stop</button>
            <button className="btn" onClick={() => autoPlan(5)}>✨ 5 stop</button>
          </div>
        </>
      ) : (
        <>
          <div className="summary">
            <div><b>{draft.stops.length}</b><span>stop</span></div>
            <div><b>{fmtDistance(tl.totalWalkMeters)}</b><span>gang {routing ? '…' : legs ? '(rute)' : '(ca.)'}</span></div>
            <div><b>{fmtTime(tl.end)}</b><span>slut</span></div>
          </div>

          {tl.warnings > 0 && (
            <div className="card card--pad" style={{ borderColor: 'color-mix(in srgb, var(--danger) 45%, var(--border))' }}>
              <b className="small">⚠️ {tl.warnings} stop passer ikke med åbningstiderne</b>
              <p className="small muted" style={{ margin: '4px 0 0' }}>Ret starttidspunkt, opholdstid eller rækkefølge – detaljerne står ved hvert stop.</p>
            </div>
          )}

          <div className="stack" style={{ gap: 0 }}>
            {tl.items.map((it, i) => (
              <div key={it.bar.id + i}>
                {i > 0 && (
                  <div className="walkline">
                    🚶 {it.walkFromPrevMinutes} min · {fmtDistance(it.walkFromPrevMeters)}
                  </div>
                )}
                <div className={'stop' + (it.warning ? ' stop--warn' : '')}>
                  <div className="stop__n">{i + 1}</div>
                  <img src={logoUrl(it.bar)} alt="" style={{ width: 40, height: 40, borderRadius: 11, objectFit: 'contain', background: 'var(--surface-2)', padding: 3, border: '1px solid var(--border)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button className="row" style={{ padding: 0, width: '100%' }} onClick={() => navigate('/bar/' + it.bar.id)}>
                      <b className="truncate">{it.bar.name}</b>
                    </button>
                    <div className="small muted">{fmtTime(it.arrive)} – {fmtTime(it.leave)} · {fmtMinutes(it.minutes)}</div>
                    {it.opening && <div className="tiny muted">Åbent {it.opening.open}–{it.opening.close}</div>}
                    {it.warning && <div className="chip chip--warn" style={{ marginTop: 6 }}>⚠️ {it.warning}</div>}
                    <div className="row" style={{ gap: 6, marginTop: 8 }}>
                      <div className="stepper">
                        <button onClick={() => dispatch({ type: 'draftStops', stops: draft.stops.map((s, j) => j === i ? { ...s, minutes: Math.max(15, s.minutes - 15) } : s) })}>−</button>
                        <span>{fmtMinutes(it.minutes)}</span>
                        <button onClick={() => dispatch({ type: 'draftStops', stops: draft.stops.map((s, j) => j === i ? { ...s, minutes: Math.min(360, s.minutes + 15) } : s) })}>+</button>
                      </div>
                      <div className="spacer" />
                      <button className="iconbtn" style={{ background: 'var(--surface-2)', color: 'var(--muted)', width: 30, height: 30, fontSize: 14 }} disabled={i === 0} onClick={() => dispatch({ type: 'draftMove', from: i, to: i - 1 })} aria-label="Op">↑</button>
                      <button className="iconbtn" style={{ background: 'var(--surface-2)', color: 'var(--muted)', width: 30, height: 30, fontSize: 14 }} disabled={i === tl.items.length - 1} onClick={() => dispatch({ type: 'draftMove', from: i, to: i + 1 })} aria-label="Ned">↓</button>
                      <button className="iconbtn" style={{ background: 'var(--surface-2)', color: 'var(--danger)', width: 30, height: 30, fontSize: 14 }} onClick={() => dispatch({ type: 'draftRemove', index: i })} aria-label="Fjern">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="btnrow">
            <button className="btn btn--primary" onClick={() => setPicker(true)}>+ Tilføj stop</button>
            <button className="btn" onClick={optimize}>🧭 Optimér rækkefølge</button>
            {!pos && <button className="btn" onClick={locate}>📍 Brug min position</button>}
          </div>

          <div className="mapwrap">
            <MapView
              bars={stopBars}
              now={now}
              numbers={numbers}
              route={routeCoords}
              userPos={pos}
              className="map--card"
              fitKey={'plan:' + draft.stops.map((s) => s.barId).join(',')}
              onSelect={(id) => id && navigate('/bar/' + id)}
            />
          </div>

          <div className="card card--pad stack" style={{ gap: 10 }}>
            <div className="field">
              <label htmlFor="p-note">Besked til vennerne</label>
              <textarea id="p-note" className="input" value={draft.note || ''} onChange={(e) => setDraft({ note: e.target.value })} placeholder="Husk kontanter, vi mødes ved indgangen…" />
            </div>
            <div className="field">
              <label htmlFor="p-author">Planlagt af</label>
              <input id="p-author" className="input" value={draft.author ?? state.name} onChange={(e) => setDraft({ author: e.target.value })} placeholder="Dit navn" />
            </div>
          </div>

          <div className="card card--pad stack" style={{ gap: 12 }}>
            <div>
              <h3>🎉 Start fredagsspillet</h3>
              <p className="small muted" style={{ margin: '4px 0 0' }}>
                Alle får ét link, melder sig ind med navn og figur, og så kører der en live-stilling
                med XP, genstande og konsekvenser. Vælg hvilke spil der er med i aften.
              </p>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {MODE_LIST.map((m) => (
                <button
                  key={m.key}
                  className={'modecard' + (modes[m.key] ? ' is-on' : '')}
                  onClick={() => setModes((v) => ({ ...v, [m.key]: !v[m.key] }))}
                >
                  <span className="modecard__ico">{m.ico}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', fontSize: 14 }}>{m.title}</b>
                    <span className="tiny muted">{m.text}</span>
                  </span>
                  <span className="modecard__box">✓</span>
                </button>
              ))}
            </div>
            <button className="btn btn--accent btn--block" onClick={startSession} disabled={starting}>
              {starting ? 'Starter…' : '🎮 Start live-session'}
            </button>
            {!liveIsShared() && (
              <p className="tiny muted" style={{ margin: 0 }}>
                Live-deling mellem telefoner er ikke sat op endnu – lige nu virker sessionen kun i din egen browser.
              </p>
            )}
          </div>

          <div className="card card--pad stack" style={{ gap: 10 }}>
            <div>
              <h3>Del turen</h3>
              <p className="small muted" style={{ margin: '4px 0 0' }}>
                Linket indeholder hele planen – vennerne behøver ikke oprette noget.
              </p>
            </div>
            <div className="btnrow">
              <button className="btn btn--primary" onClick={share}>↗ Del link</button>
              <button className="btn" onClick={copyPlan}>📋 Kopiér som tekst</button>
              <button className="btn" onClick={() => { downloadFile(`${draft.title.replace(/[^\wæøåÆØÅ -]/g, '')}.ics`, crawlAsIcs(draft, tl, shareUrl(draft)), 'text/calendar'); toast('Kalenderfil hentet'); }}>📅 Til kalender</button>
              <button className="btn" onClick={saveCrawl}>💾 Gem tur</button>
            </div>
            <div className="tiny muted">
              I alt {fmtMinutes(totalStay)} på barerne + {fmtMinutes(tl.totalWalkMinutes)} gang · {fmtDateLong(draft.date)}
            </div>
          </div>
        </>
      )}

      {picker && <BarPicker date={draft.date} onClose={() => setPicker(false)} />}
    </main>
  );
}

/** Vælger til at tilføje stop – sorteret efter om de har åbent den valgte dag. */
function BarPicker({ date, onClose }: { date: string; onClose: () => void }) {
  const { state, dispatch, pos, toast } = useStore();
  const [q, setQ] = useState('');
  const [onlyOpenThatDay, setOnlyOpenThatDay] = useState(true);

  const chosen = state.draft.stops.map((s) => s.barId);
  const lastBar = chosen.length ? BAR_BY_ID[chosen[chosen.length - 1]] : null;
  const origin: LatLng | null = lastBar ?? pos;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return BARS
      .filter((b) => {
        if (onlyOpenThatDay && !openingOn(b, date)) return false;
        if (needle && !`${b.name} ${b.subtitle} ${b.address}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => {
        if (origin) return walkMeters(origin, a) - walkMeters(origin, b);
        return a.name.localeCompare(b.name, 'da');
      });
  }, [q, onlyOpenThatDay, date, origin]);

  const openThatDay = BARS.filter((b) => openingOn(b, date)).length;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grab" />
        <div className="row row--between" style={{ marginBottom: 10 }}>
          <h2>Tilføj stop</h2>
          <button className="btn btn--sm" onClick={onClose}>Færdig</button>
        </div>

        <div className="search" style={{ marginBottom: 10 }}>
          <span className="search__ico">🔎</span>
          <input className="input" placeholder="Søg bar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="row row--between" style={{ marginBottom: 10 }}>
          <button className={'fchip' + (onlyOpenThatDay ? ' is-on' : '')} onClick={() => setOnlyOpenThatDay((v) => !v)}>
            Kun åbne den dag ({openThatDay})
          </button>
          {origin && <span className="tiny muted">Sorteret efter afstand fra {lastBar ? lastBar.name : 'dig'}</span>}
        </div>

        {list.length === 0 && <Empty icon="🔍" title="Ingen barer" text="Prøv at slå filteret fra." />}

        <div className="stack" style={{ gap: 8 }}>
          {list.map((b) => {
            const on = chosen.includes(b.id);
            const op = openingOn(b, date);
            const m = origin ? walkMeters(origin, b) : 0;
            return (
              <div key={b.id} className="barcard">
                <img className="barcard__logo" src={logoUrl(b)} alt="" loading="lazy" />
                <div className="barcard__body">
                  <div className="barcard__name"><span className="truncate">{b.name}</span></div>
                  <div className="barcard__sub truncate">{b.subtitle}</div>
                  <div className="barcard__meta">
                    {op ? <span className="chip chip--open">{op.open}–{op.close}</span> : <span className="chip">Lukket den dag</span>}
                    {origin && <span className="chip">🚶 {walkMinutes(m)} min</span>}
                  </div>
                </div>
                <button
                  className={'btn btn--sm' + (on ? '' : ' btn--primary')}
                  onClick={() => {
                    if (on) dispatch({ type: 'draftRemove', index: chosen.indexOf(b.id) });
                    else { dispatch({ type: 'draftAdd', barId: b.id }); toast(`${b.name} tilføjet`); }
                  }}
                >
                  {on ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Bygger et forslag: start ved brugerens position (eller første åbne bar),
 * og vælg hver gang den nærmeste bar der stadig har åbent når man ankommer.
 */
function buildAutoPlan(date: string, start: string, count: number, pos: LatLng | null): Stop[] {
  const candidates = BARS.filter((b) => openingOn(b, date));
  if (!candidates.length) return [];
  const stay = 60;
  let t = parseLocal(date, start || '16:00');
  let here: LatLng = pos ?? { lat: candidates[0].lat, lng: candidates[0].lng };
  const used = new Set<string>();
  const stops: Stop[] = [];

  for (let n = 0; n < count; n++) {
    let best: { bar: Bar; arrive: Date; score: number } | null = null;
    for (const bar of candidates) {
      if (used.has(bar.id)) continue;
      const m = walkMeters(here, bar);
      const arrive = addMinutes(t, stops.length ? walkMinutes(m) : 0);
      const op = openingOn(bar, date)!;
      const { start: os, end: oe } = openingRange(op);
      const realArrive = arrive < os ? os : arrive;
      if (realArrive >= oe) continue;
      // Straf for at vente og for at gå langt.
      const wait = (realArrive.getTime() - arrive.getTime()) / 60000;
      const score = m / 80 + wait * 1.5;
      if (!best || score < best.score) best = { bar, arrive: realArrive, score };
    }
    if (!best) break;
    used.add(best.bar.id);
    stops.push({ barId: best.bar.id, minutes: stay });
    t = addMinutes(best.arrive, stay);
    here = best.bar;
  }
  return stops;
}
