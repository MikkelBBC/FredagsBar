import { useEffect, useRef, useState } from 'react';
import { CATEGORY_META, RARITY_META, type Challenge } from '../data/challenges';

interface Props {
  slices: Challenge[];
  onResult: (c: Challenge) => void;
  size?: number;
  spinLabel?: string;
}

const SPIN_MS = 4200;

export function Wheel({ slices, onResult, size = 260, spinLabel = 'DREJ' }: Props) {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const n = slices.length;
  if (!n) return null;
  const seg = 360 / n;
  const r = size / 2;

  const spin = () => {
    if (spinning) return;
    const idx = Math.floor(Math.random() * n);
    // Viseren peger opad (0°). Midten af felt idx skal ende der.
    const target = 360 * 6 - (idx * seg + seg / 2) + (Math.random() * seg * 0.6 - seg * 0.3);
    setSpinning(true);
    setAngle((a) => a + target);
    timer.current = window.setTimeout(() => {
      setSpinning(false);
      onResult(slices[idx]);
    }, SPIN_MS + 80);
  };

  const arc = (i: number) => {
    const a0 = ((i * seg - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
    const x0 = r + r * Math.cos(a0), y0 = r + r * Math.sin(a0);
    const x1 = r + r * Math.cos(a1), y1 = r + r * Math.sin(a1);
    return `M ${r} ${r} L ${x0} ${y0} A ${r} ${r} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
  };

  return (
    <div className="wheelbox" style={{ width: size }}>
      <div className="wheel__pin" />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="wheel"
        style={{
          transform: `rotate(${angle}deg)`,
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.16,.84,.24,1)` : 'none',
        }}
      >
        {slices.map((c, i) => {
          const meta = RARITY_META[c.rarity];
          const mid = ((i + 0.5) * seg - 90) * (Math.PI / 180);
          const tx = r + r * 0.66 * Math.cos(mid);
          const ty = r + r * 0.66 * Math.sin(mid);
          return (
            <g key={c.id + i}>
              <path d={arc(i)} fill={meta.color} stroke="rgba(0,0,0,.22)" strokeWidth="1.5" />
              <g transform={`translate(${tx} ${ty})`}>
                <text textAnchor="middle" y="-3" fontSize="18">{CATEGORY_META[c.category].ico}</text>
                <text textAnchor="middle" y="15" fontSize="11.5" fontWeight="800" fill="#fff">{c.points}</text>
              </g>
            </g>
          );
        })}
        <circle cx={r} cy={r} r={r * 0.99} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="3" />
      </svg>
      <button className="wheel__go" onClick={spin} disabled={spinning} style={{ width: size * 0.3, height: size * 0.3 }}>
        {spinning ? '…' : spinLabel}
      </button>
    </div>
  );
}

export function ChallengeCard({ c, children }: { c: Challenge; children?: React.ReactNode }) {
  const meta = RARITY_META[c.rarity];
  return (
    <div className="challenge" style={{ ['--rar' as string]: meta.color }}>
      <div className="row row--between">
        <span className="chip" style={{ background: meta.color, borderColor: meta.color, color: '#fff' }}>
          {CATEGORY_META[c.category].ico} {meta.label}
        </span>
        <b style={{ color: meta.color }}>+{c.points} XP</b>
      </div>
      <p style={{ margin: '10px 0 0', fontWeight: 700, fontSize: 15.5 }}>{c.text}</p>
      {children}
    </div>
  );
}
