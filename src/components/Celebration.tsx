import { useEffect, useRef, useState } from 'react';
import type { Announce } from '../data/types';

const KIND: Record<Announce['kind'], { ico: string; head: string; color: string }> = {
  omgang: { ico: '🍻', head: 'OMGANG!', color: 'var(--accent)' },
  skaal: { ico: '🥂', head: 'SKÅL!', color: '#7fd4a2' },
  bingo: { ico: '🔢', head: 'BINGO!', color: '#8ab4f8' },
};

/**
 * Fuldskærms-fejring der popper op hos alle i sessionen når nogen gør
 * noget der fortjener det. Forsvinder af sig selv efter et par sekunder.
 */
export function Celebration({ announce }: { announce?: Announce }) {
  const [shown, setShown] = useState<Announce | null>(null);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!announce?.id || announce.id === seen.current) return;
    // Spring gamle beskeder over, fx når man åbner appen igen bagefter.
    if (Date.now() - announce.t > 30000) { seen.current = announce.id; return; }
    seen.current = announce.id;
    setShown(announce);
    const t = setTimeout(() => setShown(null), 6000);
    return () => clearTimeout(t);
  }, [announce?.id, announce?.t, announce]);

  if (!shown) return null;
  const meta = KIND[shown.kind] ?? KIND.omgang;

  return (
    <div className="celebrate" onClick={() => setShown(null)}>
      <div className="celebrate__confetti" aria-hidden>
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 4.6) % 100}%`, animationDelay: `${(i % 7) * 0.13}s` }}>
            {['🍺', '🎉', '✨', '🍻'][i % 4]}
          </span>
        ))}
      </div>
      <div className="celebrate__card">
        <div className="celebrate__ico">{meta.ico}</div>
        <b className="celebrate__head" style={{ color: meta.color }}>{meta.head}</b>
        <p className="celebrate__who">{shown.emoji} {shown.name}</p>
        <p className="celebrate__text">{shown.text}</p>
        <span className="tiny muted">Tryk for at lukke</span>
      </div>
    </div>
  );
}
