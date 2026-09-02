import { useMemo, useState } from 'react';
import { AREAS, BARS, FACULTIES } from '../data/bars';
import type { Bar } from '../data/types';
import { barStatus } from '../lib/hours';
import { walkMeters } from '../lib/geo';
import { useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { AddToCrawlButton, BarCard, Empty, facultyLabel } from '../components/ui';

type Sort = 'aabner' | 'navn' | 'afstand';

export function Explore({ now }: { now: Date }) {
  const route = useRoute();
  const { pos, state, locate } = useStore();
  const [q, setQ] = useState('');
  const [facs, setFacs] = useState<string[]>([]);
  const [area, setArea] = useState<string>('');
  const [onlyOpen, setOnlyOpen] = useState(route.query.get('abne') === '1');
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<Sort>(pos ? 'afstand' : 'aabner');
  const [showFilters, setShowFilters] = useState(false);

  const toggleFac = (id: string) => setFacs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = BARS.filter((b) => {
      if (facs.length && !facs.includes(b.faculty)) return false;
      if (area && b.area !== area) return false;
      if (onlyFav && !state.favorites.includes(b.id)) return false;
      if (onlyOpen && !barStatus(b, now).open) return false;
      if (needle) {
        const hay = `${b.name} ${b.subtitle} ${b.address} ${b.about} ${b.area} ${b.faculty} ${b.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    const key = (b: Bar) => {
      const st = barStatus(b, now);
      if (st.open) return 0;
      return st.opensAt ? st.opensAt.getTime() : Number.MAX_SAFE_INTEGER;
    };

    if (sort === 'navn') out = out.sort((a, b) => a.name.localeCompare(b.name, 'da'));
    else if (sort === 'afstand' && pos) out = out.sort((a, b) => walkMeters(pos, a) - walkMeters(pos, b));
    else out = out.sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name, 'da'));

    return out;
  }, [q, facs, area, onlyOpen, onlyFav, sort, now, pos, state.favorites]);

  const activeFilters = facs.length + (area ? 1 : 0) + (onlyOpen ? 1 : 0) + (onlyFav ? 1 : 0);

  return (
    <main className="page stack">
      <div className="search">
        <span className="search__ico">🔎</span>
        <input
          className="input"
          placeholder="Søg bar, studie eller adresse…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {q && <button className="search__clear" onClick={() => setQ('')}>✕</button>}
      </div>

      <div className="filterbar">
        <button className={'fchip' + (onlyOpen ? ' is-on' : '')} onClick={() => setOnlyOpen((v) => !v)}>🟢 Åbne nu</button>
        <button className={'fchip' + (onlyFav ? ' is-on' : '')} onClick={() => setOnlyFav((v) => !v)}>⭐ Favoritter</button>
        {FACULTIES.map((f) => (
          <button key={f.id} className={'fchip' + (facs.includes(f.id) ? ' is-on' : '')} onClick={() => toggleFac(f.id)}>
            {f.id}
          </button>
        ))}
        <button className={'fchip' + (area ? ' is-on' : '')} onClick={() => setShowFilters(true)}>⚙️ Mere</button>
      </div>

      <div className="row row--between" style={{ marginTop: -4 }}>
        <span className="small muted">
          {list.length} {list.length === 1 ? 'bar' : 'barer'}
          {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters === 1 ? '' : 'e'}`}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {activeFilters > 0 && (
            <button className="btn btn--sm" onClick={() => { setFacs([]); setArea(''); setOnlyOpen(false); setOnlyFav(false); }}>
              Nulstil
            </button>
          )}
          <select className="input" style={{ width: 'auto', padding: '7px 10px', borderRadius: 999 }} value={sort} onChange={(e) => {
            const v = e.target.value as Sort;
            if (v === 'afstand' && !pos) locate();
            setSort(v);
          }}>
            <option value="aabner">Åbner først</option>
            <option value="navn">Navn A–Å</option>
            <option value="afstand">Afstand</option>
          </select>
        </div>
      </div>

      {sort === 'afstand' && !pos && (
        <button className="btn btn--block" onClick={locate}>📍 Slå lokation til for at sortere efter afstand</button>
      )}

      {list.length ? (
        <div className="stack grid-cards" style={{ gap: 8 }}>
          {list.map((b) => <BarCard key={b.id} bar={b} now={now} action={<AddToCrawlButton bar={b} />} />)}
        </div>
      ) : (
        <Empty icon="🫗" title="Ingen barer matcher" text="Prøv at fjerne et filter eller søge på noget andet." />
      )}

      {showFilters && (
        <div className="sheet-backdrop" onClick={() => setShowFilters(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__grab" />
            <h2>Filtrér</h2>

            <h3 style={{ margin: '16px 0 8px' }}>Område</h3>
            <div className="row row--wrap" style={{ gap: 8 }}>
              <button className={'fchip' + (area === '' ? ' is-on' : '')} onClick={() => setArea('')}>Alle</button>
              {AREAS.map((a) => (
                <button key={a} className={'fchip' + (area === a ? ' is-on' : '')} onClick={() => setArea(a)}>{a}</button>
              ))}
            </div>

            <h3 style={{ margin: '18px 0 8px' }}>Fakultet</h3>
            <div className="row row--wrap" style={{ gap: 8 }}>
              {FACULTIES.map((f) => (
                <button key={f.id} className={'fchip' + (facs.includes(f.id) ? ' is-on' : '')} onClick={() => toggleFac(f.id)}>
                  <span className="facdot" style={{ background: f.color, marginRight: 6 }} />
                  {facultyLabel(f.id)}
                </button>
              ))}
            </div>

            <div className="btnrow" style={{ marginTop: 20 }}>
              <button className="btn btn--primary btn--block" onClick={() => setShowFilters(false)}>Vis {list.length} barer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
