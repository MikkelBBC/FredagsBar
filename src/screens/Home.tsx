import { useMemo } from 'react';
import { BARS, BAR_BY_ID } from '../data/bars';
import { barStatus, nextFriday, openingOn, toDateStr } from '../lib/hours';
import { fmtDateLong, relativeDay } from '../lib/format';
import { walkMeters, fmtDistance } from '../lib/geo';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { BarCard, SectionHead, AddToCrawlButton, Empty } from '../components/ui';

function greeting(now: Date, name: string): string {
  const h = now.getHours();
  const g = h < 5 ? 'Godnat' : h < 10 ? 'Godmorgen' : h < 14 ? 'Goddag' : h < 18 ? 'God eftermiddag' : 'Godaften';
  return name ? `${g}, ${name}` : g;
}

export function Home({ now }: { now: Date }) {
  const { state, pos, locate, locating, posError, dispatch } = useStore();

  const openNow = useMemo(
    () => BARS.filter((b) => barStatus(b, now).open).sort((a, b) => a.name.localeCompare(b.name, 'da')),
    [now],
  );

  const todayStr = toDateStr(now);
  const friday = nextFriday(now);

  const fridayBars = useMemo(
    () => BARS.filter((b) => openingOn(b, friday)).sort((a, b) => (openingOn(a, friday)!.open < openingOn(b, friday)!.open ? -1 : 1)),
    [friday],
  );

  const soonToday = useMemo(() => {
    return BARS.filter((b) => {
      const st = barStatus(b, now);
      return !st.open && st.opensToday;
    }).sort((a, b) => (barStatus(a, now).opensAt!.getTime() - barStatus(b, now).opensAt!.getTime()));
  }, [now]);

  const nearest = useMemo(() => {
    if (!pos) return [];
    return [...BARS]
      .map((b) => ({ b, m: walkMeters(pos, b) }))
      .sort((x, y) => x.m - y.m)
      .slice(0, 3);
  }, [pos]);

  const favs = state.favorites.map((id) => BAR_BY_ID[id]).filter(Boolean);
  const draftBars = state.draft.stops.map((s) => BAR_BY_ID[s.barId]).filter(Boolean);

  const daysToFriday = Math.round(
    (new Date(+friday.slice(0, 4), +friday.slice(5, 7) - 1, +friday.slice(8, 10), 12).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) / 86400000,
  );

  return (
    <main className="page stack">
      <div>
        <h1>{greeting(now, state.name)} 👋</h1>
        <p className="muted small" style={{ marginTop: 2 }}>{fmtDateLong(todayStr)}</p>
      </div>

      {/* Statusbanner */}
      <div className="card card--pad" style={{ background: 'linear-gradient(150deg, var(--brand), var(--brand-2))', color: 'var(--on-brand)', border: 'none' }}>
        {openNow.length > 0 ? (
          <>
            <div className="row" style={{ gap: 8 }}>
              <span className="dot" />
              <b>{openNow.length} {openNow.length === 1 ? 'bar har' : 'barer har'} åbent lige nu</b>
            </div>
            <p className="small" style={{ opacity: .85, marginTop: 6, marginBottom: 12 }}>
              {openNow.slice(0, 3).map((b) => b.name).join(', ')}
              {openNow.length > 3 ? ` og ${openNow.length - 3} mere` : ''}.
            </p>
          </>
        ) : (
          <>
            <b>{daysToFriday === 0 ? 'Det er fredag! 🍻' : daysToFriday === 1 ? 'I morgen er det fredag' : `${daysToFriday} dage til fredag`}</b>
            <p className="small" style={{ opacity: .85, marginTop: 6, marginBottom: 12 }}>
              {fridayBars.length > 0
                ? `${fridayBars.length} barer har åbent ${relativeDay(friday, now)?.toLowerCase() ?? fmtDateLong(friday).toLowerCase()}.`
                : 'Ingen registrerede åbninger den dag – tjek kalenderen.'}
            </p>
          </>
        )}
        <div className="btnrow">
          <button className="btn btn--accent btn--sm" onClick={() => navigate('/tur')}>🧭 Planlæg turen</button>
          <button className="btn btn--sm" style={{ background: 'rgba(255,255,255,.15)', borderColor: 'transparent', color: 'inherit' }} onClick={() => navigate('/kort')}>
            🗺️ Se kortet
          </button>
        </div>
      </div>

      {/* Din tur i gang */}
      {draftBars.length > 0 && (
        <div className="card card--pad">
          <div className="row row--between">
            <div style={{ minWidth: 0 }}>
              <b className="truncate">{state.draft.title}</b>
              <div className="small muted">{draftBars.length} stop · {fmtDateLong(state.draft.date)}</div>
            </div>
            <button className="btn btn--sm btn--primary" onClick={() => navigate('/tur')}>Åbn</button>
          </div>
          <div className="row row--wrap" style={{ gap: 6, marginTop: 10 }}>
            {draftBars.map((b, i) => (
              <span key={b.id} className="chip">{i + 1}. {b.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Åbent nu */}
      {openNow.length > 0 && (
        <section>
          <SectionHead title="Åbent lige nu" linkText="Alle" onLink={() => navigate('/barer?abne=1')} />
          <div className="hscroll">
            {openNow.map((b) => <BarCard key={b.id} bar={b} now={now} horizontal />)}
          </div>
        </section>
      )}

      {/* Åbner senere i dag */}
      {soonToday.length > 0 && (
        <section>
          <SectionHead title="Åbner senere i dag" />
          <div className="hscroll">
            {soonToday.map((b) => <BarCard key={b.id} bar={b} now={now} horizontal />)}
          </div>
        </section>
      )}

      {/* Tættest på dig */}
      <section>
        <SectionHead title="Tættest på dig" linkText={pos ? 'Kort' : undefined} onLink={() => navigate('/kort')} />
        {pos ? (
          <div className="stack" style={{ gap: 8 }}>
            {nearest.map(({ b, m }) => (
              <BarCard key={b.id} bar={b} now={now} action={<span className="chip">{fmtDistance(m)}</span>} />
            ))}
          </div>
        ) : (
          <div className="card card--pad center">
            <p className="small muted">Slå lokation til for at se hvilke barer der er tættest på dig.</p>
            <div className="btnrow" style={{ justifyContent: 'center' }}>
              <button className="btn btn--primary btn--sm" onClick={locate} disabled={locating}>
                {locating ? 'Finder dig…' : '📍 Find min position'}
              </button>
              <button className="btn btn--sm" onClick={() => navigate('/kort?vaelg=1')}>✋ Sæt den selv</button>
            </div>
            {posError && <p className="tiny muted" style={{ margin: '8px 0 0' }}>{posError}</p>}
          </div>
        )}
      </section>

      {/* Næste fredag */}
      <section>
        <SectionHead title={daysToFriday === 0 ? 'Åbent i dag' : `Fredag ${fmtDateLong(friday).split(' ').slice(1).join(' ')}`} linkText="Kalender" onLink={() => navigate('/kalender')} />
        {fridayBars.length ? (
          <div className="stack" style={{ gap: 8 }}>
            {fridayBars.slice(0, 5).map((b) => (
              <BarCard key={b.id} bar={b} now={now} action={<AddToCrawlButton bar={b} />} />
            ))}
            {fridayBars.length > 5 && (
              <button className="btn btn--block" onClick={() => navigate('/kalender')}>
                Se alle {fridayBars.length} barer den dag
              </button>
            )}
          </div>
        ) : (
          <Empty icon="📅" title="Ingen åbninger registreret" text="Kig i kalenderen efter næste dato." />
        )}
      </section>

      {/* Favoritter */}
      {favs.length > 0 && (
        <section>
          <SectionHead title="Dine favoritter" linkText="Mig" onLink={() => navigate('/mig')} />
          <div className="hscroll">
            {favs.map((b) => <BarCard key={b.id} bar={b} now={now} horizontal />)}
          </div>
        </section>
      )}

      {/* Genveje */}
      <section>
        <SectionHead title="Genveje" />
        <div className="btnrow">
          <button className="btn" onClick={() => navigate('/kalender')}>📅 Semesterkalender</button>
          <button className="btn" onClick={() => navigate('/barer')}>🔎 Alle {BARS.length} barer</button>
          <button className="btn" onClick={() => { dispatch({ type: 'draftReset' }); navigate('/tur'); }}>✨ Ny tur</button>
          <button className="btn btn--accent" onClick={() => navigate('/live')}>🎮 Deltag med kode</button>
        </div>
      </section>
    </main>
  );
}
