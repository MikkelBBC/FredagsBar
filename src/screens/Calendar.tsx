import { useMemo, useState } from 'react';
import { BARS } from '../data/bars';
import type { Bar, Opening } from '../data/types';
import { allOpenings, openingOn, toDateStr } from '../lib/hours';
import { fmtDateLong, fmtDateShort, isFriday, relativeDay } from '../lib/format';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { AddToCrawlButton, BarCard, Empty, SectionHead } from '../components/ui';

interface Day { date: string; bars: { bar: Bar; op: Opening }[] }

export function CalendarScreen({ now }: { now: Date }) {
  const { state, dispatch, toast } = useStore();
  const today = toDateStr(now);
  const [onlyFridays, setOnlyFridays] = useState(false);

  const days: Day[] = useMemo(() => {
    const map = new Map<string, { bar: Bar; op: Opening }[]>();
    for (const bar of BARS) {
      for (const op of allOpenings(bar)) {
        if (op.date < today) continue;
        if (!map.has(op.date)) map.set(op.date, []);
        map.get(op.date)!.push({ bar, op });
      }
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, bars]) => ({ date, bars: bars.sort((x, y) => (x.op.open < y.op.open ? -1 : 1)) }));
  }, [today]);

  const visible = onlyFridays ? days.filter((d) => isFriday(d.date)) : days;
  const [sel, setSel] = useState<string>(() => visible[0]?.date ?? today);
  const day = visible.find((d) => d.date === sel) ?? visible[0];

  const planThisDay = () => {
    dispatch({ type: 'draft', draft: { ...state.draft, date: day.date } });
    navigate('/tur');
    toast(`Turen er sat til ${fmtDateShort(day.date)}`);
  };

  if (!days.length) {
    return (
      <main className="page">
        <Empty icon="📅" title="Ingen kommende åbninger" text="Semesteret er slut – eller datoerne mangler at blive opdateret." />
      </main>
    );
  }

  return (
    <main className="page stack">
      <div className="row row--between">
        <h1>Kalender</h1>
        <button className={'fchip' + (onlyFridays ? ' is-on' : '')} onClick={() => setOnlyFridays((v) => !v)}>Kun fredage</button>
      </div>

      <div className="datestrip">
        {visible.slice(0, 30).map((d) => {
          const dt = new Date(+d.date.slice(0, 4), +d.date.slice(5, 7) - 1, +d.date.slice(8, 10));
          const wd = new Intl.DateTimeFormat('da-DK', { weekday: 'short' }).format(dt).replace('.', '');
          return (
            <button key={d.date} className={'dcard' + (d.date === day?.date ? ' is-on' : '')} onClick={() => setSel(d.date)}>
              <span>{wd}</span>
              <b>{dt.getDate()}</b>
              <i>{d.bars.length} bar{d.bars.length === 1 ? '' : 'er'}</i>
            </button>
          );
        })}
      </div>

      {day && (
        <>
          <div className="card card--pad">
            <div className="row row--between">
              <div>
                <b>{relativeDay(day.date, now) ?? fmtDateLong(day.date)}</b>
                <div className="small muted">{day.bars.length} barer har åbent</div>
              </div>
              <button className="btn btn--sm btn--primary" onClick={planThisDay}>🧭 Planlæg</button>
            </div>
          </div>

          <SectionHead title="Åbent denne dag" />
          <div className="stack grid-cards" style={{ gap: 8 }}>
            {day.bars.map(({ bar, op }) => (
              <BarCard
                key={bar.id}
                bar={bar}
                now={now}
                action={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <span className="chip nowrap">{op.open}–{op.close}</span>
                    <AddToCrawlButton bar={bar} />
                  </div>
                }
              />
            ))}
          </div>

          <SectionHead title="Resten af semesteret" />
          <div className="card">
            {visible.slice(0, 40).map((d) => (
              <button
                key={d.date}
                className="openrow"
                style={{ width: '100%', padding: '11px 14px' }}
                onClick={() => { setSel(d.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <b className="small">{relativeDay(d.date, now) ?? fmtDateLong(d.date)}</b>
                  <div className="tiny muted truncate">{d.bars.slice(0, 4).map((x) => x.bar.name).join(', ')}{d.bars.length > 4 ? '…' : ''}</div>
                </div>
                <span className="chip nowrap">{d.bars.length}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
