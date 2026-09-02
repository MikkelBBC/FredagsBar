import { useMemo } from 'react';
import { BARS, BAR_BY_ID, FACULTIES } from '../data/bars';
import { fmtDateLong } from '../lib/format';
import { buildTimeline, crawlAsText } from '../lib/crawl';
import { copyText, nativeShare, shareUrl } from '../lib/share';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { BarCard, Empty, SectionHead } from '../components/ui';

interface Badge {
  id: string;
  ico: string;
  label: string;
  test: (visits: number, favs: number, unique: number, faculties: number) => boolean;
}

const BADGES: Badge[] = [
  { id: 'first', ico: '🍺', label: 'Første bar', test: (v) => v >= 1 },
  { id: 'five', ico: '🖐️', label: '5 besøg', test: (v) => v >= 5 },
  { id: 'ten', ico: '🔟', label: '10 besøg', test: (v) => v >= 10 },
  { id: 'fav', ico: '⭐', label: '5 favoritter', test: (_v, f) => f >= 5 },
  { id: 'explorer', ico: '🗺️', label: '10 forskellige', test: (_v, _f, u) => u >= 10 },
  { id: 'half', ico: '🏅', label: 'Halvvejs', test: (_v, _f, u) => u >= Math.ceil(BARS.length / 2) },
  { id: 'all', ico: '👑', label: 'Alle barer', test: (_v, _f, u) => u >= BARS.length },
  { id: 'faculties', ico: '🎓', label: 'Alle fakulteter', test: (_v, _f, _u, fac) => fac >= FACULTIES.length },
];

export function Profile({ now }: { now: Date }) {
  const { state, dispatch, toast, posSource, posError, accuracy, locate, locating } = useStore();

  const visitedIds = Object.keys(state.visited);
  const totalVisits = Object.values(state.visited).reduce((a, b) => a + b, 0);
  const uniqueBars = visitedIds.length;
  const facultiesVisited = new Set(visitedIds.map((id) => BAR_BY_ID[id]?.faculty).filter(Boolean)).size;
  const pct = Math.round((uniqueBars / BARS.length) * 100);

  const favs = state.favorites.map((id) => BAR_BY_ID[id]).filter(Boolean);

  const topBars = useMemo(
    () => visitedIds
      .map((id) => ({ bar: BAR_BY_ID[id], n: state.visited[id] }))
      .filter((x) => x.bar)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5),
    [state.visited, visitedIds],
  );

  return (
    <main className="page stack">
      <h1>Mig</h1>

      <div className="card card--pad stack" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="me-name">Dit navn</label>
          <input id="me-name" className="input" value={state.name} onChange={(e) => dispatch({ type: 'name', name: e.target.value })} placeholder="Fx Mikkel" />
        </div>
        <div className="field">
          <label>Udseende</label>
          <div className="segment">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button key={t} className={state.theme === t ? 'is-on' : ''} onClick={() => dispatch({ type: 'theme', theme: t })}>
                {t === 'light' ? '☀️ Lys' : t === 'dark' ? '🌙 Mørk' : '⚙️ System'}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Lokation</label>
          <div className="btnrow">
            <button className="btn" onClick={locate} disabled={locating}>
              {locating ? 'Finder dig…' : posSource === 'gps' ? '📍 GPS aktiv – opdatér' : '📍 Brug GPS'}
            </button>
            <button className="btn" onClick={() => navigate('/kort?vaelg=1')}>✋ Sæt på kortet</button>
            {posSource === 'manuel' && (
              <button className="btn btn--danger" onClick={() => { dispatch({ type: 'manualPos', pos: null }); toast('Manuel position fjernet'); }}>
                Ryd manuel
              </button>
            )}
          </div>
          <span className="tiny muted">
            {posSource === 'manuel'
              ? '✋ Du har selv sat din position på kortet. Den bruges frem for GPS.'
              : posSource === 'gps'
                ? `📍 GPS aktiv${accuracy ? ` · ca. ±${accuracy} m` : ''}`
                : posError || 'Bruges til afstande og "tættest på dig". Er GPS blokeret, kan du sætte den manuelt.'}
          </span>
        </div>
      </div>

      <div className="card card--pad stack" style={{ gap: 12 }}>
        <div className="row row--between">
          <h3>Din fredagsstatistik</h3>
          <span className="small muted">{pct}%</span>
        </div>
        <div className="progress"><div style={{ width: pct + '%' }} /></div>
        <div className="summary">
          <div><b>{uniqueBars}</b><span>barer besøgt</span></div>
          <div><b>{totalVisits}</b><span>besøg i alt</span></div>
          <div><b>{favs.length}</b><span>favoritter</span></div>
        </div>
        <div className="badgegrid">
          {BADGES.map((b) => {
            const on = b.test(totalVisits, favs.length, uniqueBars, facultiesVisited);
            return (
              <div key={b.id} className={'badge' + (on ? ' is-on' : '')}>
                <div className="badge__ico">{b.ico}</div>
                <b>{b.label}</b>
              </div>
            );
          })}
        </div>
      </div>

      {topBars.length > 0 && (
        <section>
          <SectionHead title="Dine mest besøgte" />
          <div className="stack" style={{ gap: 8 }}>
            {topBars.map(({ bar, n }) => (
              <BarCard key={bar.id} bar={bar} now={now} action={<span className="chip nowrap">{n}×</span>} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHead title="Favoritter" linkText="Find flere" onLink={() => navigate('/barer')} />
        {favs.length ? (
          <div className="stack" style={{ gap: 8 }}>
            {favs.map((b) => <BarCard key={b.id} bar={b} now={now} />)}
          </div>
        ) : (
          <Empty icon="⭐" title="Ingen favoritter endnu" text="Tryk på stjernen på en bar for at gemme den her." />
        )}
      </section>

      <section>
        <SectionHead title="Gemte ture" linkText="Ny tur" onLink={() => { dispatch({ type: 'draftReset' }); navigate('/tur'); }} />
        {state.crawls.length ? (
          <div className="stack" style={{ gap: 8 }}>
            {state.crawls.map((c) => {
              const tl = buildTimeline(c);
              return (
                <div key={c.id} className="card card--pad">
                  <div className="row row--between">
                    <div style={{ minWidth: 0 }}>
                      <b className="truncate">{c.title}</b>
                      <div className="small muted">{fmtDateLong(c.date)} · {c.stops.length} stop · start {c.start}</div>
                    </div>
                    <span className="chip nowrap">{Math.round(tl.totalWalkMeters / 100) / 10} km</span>
                  </div>
                  <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
                    {c.stops.map((s, i) => (
                      <span key={s.barId + i} className="chip">{i + 1}. {BAR_BY_ID[s.barId]?.name ?? '?'}</span>
                    ))}
                  </div>
                  <div className="btnrow" style={{ marginTop: 10 }}>
                    <button className="btn btn--sm btn--primary" onClick={() => { dispatch({ type: 'draft', draft: { ...c } }); navigate('/tur'); }}>Åbn</button>
                    <button className="btn btn--sm" onClick={async () => {
                      const url = shareUrl(c);
                      const ok = await nativeShare({ title: c.title, text: crawlAsText(c, buildTimeline(c)), url });
                      if (!ok) { await copyText(url); toast('Link kopieret'); }
                    }}>↗ Del</button>
                    <button className="btn btn--sm btn--danger" onClick={() => { if (confirm(`Slet "${c.title}"?`)) dispatch({ type: 'deleteCrawl', id: c.id }); }}>Slet</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty icon="🧭" title="Ingen gemte ture" text="Planlæg en tur og tryk Gem, så ligger den her." action={<button className="btn btn--primary" onClick={() => navigate('/tur')}>Planlæg en tur</button>} />
        )}
      </section>

      <div className="card card--pad">
        <h3>Om appen</h3>
        <p className="small muted" style={{ margin: '6px 0 10px' }}>
          MikkelFredagsCafe200 samler {BARS.length} fredagsbarer og studenterbarer i Aarhus med åbningstider,
          kort og en turplanlægger. Alt gemmes kun i din egen browser – der er ingen konto og ingen server.
          Åbningstider er indsamlet manuelt; tjek altid barens egne kanaler før I går.
        </p>
        <button className="btn btn--danger btn--block" onClick={() => {
          if (confirm('Nulstil favoritter, besøg og gemte ture?')) { dispatch({ type: 'reset' }); toast('Alt er nulstillet'); }
        }}>Nulstil mine data</button>
      </div>
    </main>
  );
}
