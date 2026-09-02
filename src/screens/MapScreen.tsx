import { useEffect, useMemo, useState } from 'react';
import { BARS, BAR_BY_ID } from '../data/bars';
import { barStatus } from '../lib/hours';
import { fmtDistance, googleMapsDirections, walkMeters, walkMinutes } from '../lib/geo';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { MapView } from '../components/MapView';
import { AddToCrawlButton, FacChip, FavButton, StatusChip, logoUrl } from '../components/ui';

type Mode = 'alle' | 'aabne' | 'favoritter' | 'tur';

export function MapScreen({ now, focus }: { now: Date; focus?: string }) {
  const { state, pos, locate, locating, posError } = useStore();
  const [mode, setMode] = useState<Mode>('alle');
  const [sel, setSel] = useState<string | null>(focus ?? null);

  useEffect(() => { if (focus) setSel(focus); }, [focus]);

  const draftIds = state.draft.stops.map((s) => s.barId);

  const bars = useMemo(() => {
    if (mode === 'aabne') return BARS.filter((b) => barStatus(b, now).open);
    if (mode === 'favoritter') return BARS.filter((b) => state.favorites.includes(b.id));
    if (mode === 'tur') return draftIds.map((id) => BAR_BY_ID[id]).filter(Boolean);
    return BARS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, now, state.favorites, state.draft.stops]);

  const numbers = useMemo(() => {
    const o: Record<string, number> = {};
    draftIds.forEach((id, i) => { o[id] = i + 1; });
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.draft.stops]);

  const route = useMemo(() => {
    if (mode !== 'tur' || draftIds.length < 2) return null;
    return draftIds.map((id) => BAR_BY_ID[id]).filter(Boolean).map((b) => [b.lat, b.lng] as [number, number]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state.draft.stops]);

  const selected = sel ? BAR_BY_ID[sel] : null;
  const counts = {
    alle: BARS.length,
    aabne: BARS.filter((b) => barStatus(b, now).open).length,
    favoritter: state.favorites.length,
    tur: draftIds.length,
  };

  return (
    <main className="page page--flush" style={{ paddingTop: 10 }}>
      <div className="filterbar" style={{ margin: '0 0 8px', padding: '2px 16px 6px' }}>
        {([['alle', 'Alle'], ['aabne', '🟢 Åbne nu'], ['favoritter', '⭐ Favoritter'], ['tur', '🧭 Min tur']] as [Mode, string][]).map(([m, label]) => (
          <button key={m} className={'fchip' + (mode === m ? ' is-on' : '')} onClick={() => { setMode(m); setSel(null); }}>
            {label} <span style={{ opacity: .6 }}>{counts[m]}</span>
          </button>
        ))}
      </div>

      <div className="mapwrap">
        <MapView
          bars={bars}
          now={now}
          selectedId={sel}
          onSelect={setSel}
          numbers={numbers}
          route={route}
          userPos={pos}
          fitKey={mode + ':' + bars.length}
        />

        <button className="mapfab" style={{ top: 12 }} onClick={locate} aria-label="Find mig" title="Find min position">
          {locating ? '⏳' : '📍'}
        </button>

        {bars.length === 0 && (
          <div className="mapsheet center">
            <p className="small muted" style={{ margin: 0 }}>
              {mode === 'tur' ? 'Din tur er tom – tilføj barer fra listen.' : mode === 'favoritter' ? 'Ingen favoritter endnu.' : 'Ingen barer har åbent lige nu.'}
            </p>
          </div>
        )}

        {posError && !pos && (
          <div className="mapsheet" style={{ bottom: 'auto', top: 12, left: 66, right: 66, padding: 8 }}>
            <span className="tiny muted">{posError}</span>
          </div>
        )}

        {selected && (
          <div className="mapsheet">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <button
                className="row"
                style={{ alignItems: 'flex-start', flex: 1, minWidth: 0, padding: 0, textAlign: 'left' }}
                onClick={() => navigate('/bar/' + selected.id)}
              >
                <img src={logoUrl(selected)} alt="" style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'contain', background: 'var(--surface-2)', padding: 3, border: '1px solid var(--border)' }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b className="truncate" style={{ display: 'block' }}>{selected.name}</b>
                  <span className="small muted truncate" style={{ display: 'block' }}>{selected.subtitle}</span>
                  <span className="tiny muted truncate" style={{ display: 'block' }}>{selected.address.split(',')[0]}</span>
                </span>
              </button>
              <button className="iconbtn" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }} onClick={() => setSel(null)}>✕</button>
            </div>

            <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
              <StatusChip bar={selected} now={now} />
              <FacChip id={selected.faculty} />
              {pos && <span className="chip">🚶 {fmtDistance(walkMeters(pos, selected))} · {walkMinutes(walkMeters(pos, selected))} min</span>}
              {selected.price && <span className="chip">💰 {selected.price}</span>}
            </div>

            <p className="tiny muted" style={{ margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {selected.about}
            </p>
            <div className="btnrow" style={{ marginTop: 10 }}>
              <button className="btn btn--sm btn--primary" onClick={() => navigate('/bar/' + selected.id)}>Se bar</button>
              <AddToCrawlButton bar={selected} />
              <FavButton bar={selected} />
              <a className="btn btn--sm" href={googleMapsDirections(selected, pos)} target="_blank" rel="noreferrer">🧭 Rute</a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
