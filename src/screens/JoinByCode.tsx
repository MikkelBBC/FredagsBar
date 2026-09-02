import { useState } from 'react';
import { live, liveIsShared } from '../lib/live';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';

export function JoinByCode() {
  const { toast } = useStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { toast('Koden er på 5 tegn'); return; }
    setBusy(true);
    const s = await live.get(c);
    setBusy(false);
    if (!s) { toast('Ingen session med den kode'); return; }
    navigate('/live/' + c);
  };

  return (
    <main className="page stack">
      <h1>Deltag i en tur</h1>
      <div className="card card--pad stack" style={{ gap: 12 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Skriv koden fra din ven – eller åbn linket de har sendt.
        </p>
        <input
          className="input"
          style={{ fontSize: 26, fontWeight: 900, letterSpacing: '.2em', textAlign: 'center', textTransform: 'uppercase' }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
          placeholder="ABC12"
          maxLength={5}
          autoCapitalize="characters"
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
        <button className="btn btn--primary btn--block" onClick={go} disabled={busy || code.length < 4}>
          {busy ? 'Leder…' : 'Hop med'}
        </button>
        {!liveIsShared() && (
          <p className="tiny muted" style={{ margin: 0 }}>
            Live-deling mellem telefoner er ikke slået til endnu – lige nu virker sessioner kun i din egen browser.
          </p>
        )}
      </div>
      <button className="btn btn--block" onClick={() => navigate('/tur')}>Eller planlæg din egen tur</button>
    </main>
  );
}
