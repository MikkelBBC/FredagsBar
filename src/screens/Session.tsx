import { useCallback, useEffect, useMemo, useState } from 'react';
import { BAR_BY_ID } from '../data/bars';
import type { Bar, FeedEvent, Member, Session } from '../data/types';
import { drawChallenges, levelFor, type Challenge } from '../data/challenges';
import { XP, feedList, live, liveIsShared, memberList, newMember, sessionUrl } from '../lib/live';
import { buildTimeline } from '../lib/crawl';
import { fmtDateLong, fmtTime } from '../lib/format';
import { copyText, nativeShare } from '../lib/share';
import { fmtDistance, googleMapsDirections } from '../lib/geo';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { MapView } from '../components/MapView';
import { Wheel, ChallengeCard } from '../components/Wheel';
import { Empty, logoUrl } from '../components/ui';

const EMOJIS = ['🍺', '🦊', '🐙', '🦁', '🐸', '🦖', '🐝', '🦄', '👽', '🤖', '🎩', '🌮', '⚡', '🔥', '🍕', '🐳'];

const meKey = (code: string) => `mfc200:me:${code}`;

function ago(t: number, now: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'nu';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.round(m / 60)} t`;
}

const FEED_ICO: Record<string, string> = {
  join: '👋', drink: '🍺', water: '💧', checkin: '📍', challenge: '🎯', msg: '💬', cheers: '🥂',
};

export function SessionScreen({ code, now }: { code: string; now: Date }) {
  const { state, toast, pos, dispatch } = useStore();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [myId, setMyId] = useState<string | null>(() => localStorage.getItem(meKey(code)));
  const [tab, setTab] = useState<'live' | 'hjul' | 'rute'>('live');

  useEffect(() => live.subscribe(code, (s) => setSession(s)), [code]);

  const me = myId && session ? session.members?.[myId] : null;

  // Hold "sidst set" frisk så man kan se hvem der stadig er med.
  useEffect(() => {
    if (!me || !myId) return;
    const beat = () => live.setPath(code, `members/${myId}/lastSeen`, Date.now());
    beat();
    const t = setInterval(beat, 30000);
    return () => clearInterval(t);
  }, [code, myId, me?.id]);

  const join = useCallback(async (name: string, emoji: string) => {
    const m = newMember(name, emoji);
    m.xp = XP.join;
    await live.setPath(code, `members/${m.id}`, m);
    await live.pushFeed(code, { t: Date.now(), type: 'join', memberId: m.id, name: m.name, emoji: m.emoji, xp: XP.join });
    localStorage.setItem(meKey(code), m.id);
    setMyId(m.id);
    if (!state.name) dispatch({ type: 'name', name: m.name });
    toast(`Velkommen, ${m.name}! +${XP.join} XP`);
  }, [code, dispatch, state.name, toast]);

  if (session === undefined) {
    return <main className="page"><Empty icon="⏳" title="Henter sessionen…" /></main>;
  }

  if (session === null) {
    return (
      <main className="page">
        <Empty
          icon="🔎"
          title="Sessionen findes ikke"
          text={liveIsShared()
            ? 'Koden er måske skrevet forkert, eller sessionen er slettet.'
            : 'Live-deling er ikke slået til endnu, så sessioner virker kun i den browser de blev lavet i.'}
          action={<button className="btn btn--primary" onClick={() => navigate('/tur')}>Lav din egen tur</button>}
        />
      </main>
    );
  }

  if (!me) return <JoinCard session={session} onJoin={join} defaultName={state.name} />;

  return (
    <SessionBoard
      session={session}
      me={me}
      now={now}
      tab={tab}
      setTab={setTab}
      pos={pos}
      toast={toast}
    />
  );
}

/* ---------------- tilmelding ---------------- */

function JoinCard({ session, onJoin, defaultName }: { session: Session; onJoin: (n: string, e: string) => void; defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [emoji, setEmoji] = useState(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const members = memberList(session);
  const stops = session.crawl.stops.map((s) => BAR_BY_ID[s.barId]).filter(Boolean) as Bar[];

  return (
    <main className="page stack">
      <div className="card card--pad" style={{ background: 'linear-gradient(150deg, var(--brand), var(--brand-2))', color: 'var(--on-brand)', border: 'none' }}>
        <span className="tiny" style={{ opacity: .8, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Live-session</span>
        <h1 style={{ fontSize: 24, margin: '4px 0 6px' }}>{session.crawl.title}</h1>
        <p className="small" style={{ opacity: .9, margin: 0 }}>
          {fmtDateLong(session.crawl.date)} · start {session.crawl.start} · {stops.length} stop
        </p>
      </div>

      <div className="card card--pad stack" style={{ gap: 14 }}>
        <div>
          <h2>Meld dig ind</h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>
            {members.length ? `${members.length} er allerede med: ${members.map((m) => m.emoji + ' ' + m.name).join(', ')}` : 'Du bliver den første med.'}
          </p>
        </div>
        <div className="field">
          <label htmlFor="j-name">Dit navn</label>
          <input id="j-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx Victor" maxLength={18} autoFocus />
        </div>
        <div className="field">
          <label>Vælg din figur</label>
          <div className="emojipick">
            {EMOJIS.map((e) => (
              <button key={e} className={emoji === e ? 'is-on' : ''} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
        </div>
        <button className="btn btn--primary btn--block" disabled={!name.trim()} onClick={() => onJoin(name, emoji)}>
          {emoji} Meld mig ind
        </button>
      </div>

      <div className="card card--pad">
        <h3>Ruten</h3>
        <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
          {stops.map((b, i) => <span key={b.id + i} className="chip">{i + 1}. {b.name}</span>)}
        </div>
      </div>
    </main>
  );
}

/* ---------------- selve tavlen ---------------- */

interface BoardProps {
  session: Session;
  me: Member;
  now: Date;
  tab: 'live' | 'hjul' | 'rute';
  setTab: (t: 'live' | 'hjul' | 'rute') => void;
  pos: { lat: number; lng: number } | null;
  toast: (s: string) => void;
}

function SessionBoard({ session, me, now, tab, setTab, pos, toast }: BoardProps) {
  const code = session.code;
  const members = memberList(session);
  const feed = feedList(session);
  const stops = session.crawl.stops.map((s) => BAR_BY_ID[s.barId]).filter(Boolean) as Bar[];
  const tl = useMemo(() => buildTimeline(session.crawl), [session.crawl]);
  const lvl = levelFor(me.xp);
  const rank = members.findIndex((m) => m.id === me.id) + 1;
  const currentBar = me.stop >= 0 ? stops[me.stop] : null;

  const bump = async (field: 'drinks' | 'water', xp: number, type: 'drink' | 'water', text: string) => {
    await live.setPath(code, `members/${me.id}/${field}`, (me[field] || 0) + 1);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + xp);
    await live.pushFeed(code, { t: Date.now(), type, memberId: me.id, name: me.name, emoji: me.emoji, text, xp });
    toast(`${text} +${xp} XP`);
  };

  const checkIn = async (i: number) => {
    const bar = stops[i];
    if (!bar) return;
    const first = !members.some((m) => m.stop === i);
    const gain = XP.checkin + (first ? 15 : 0);
    await live.setPath(code, `members/${me.id}/stop`, i);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + gain);
    await live.pushFeed(code, {
      t: Date.now(), type: 'checkin', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `er ankommet til ${bar.name}${first ? ' – først fremme! 🥇' : ''}`, xp: gain,
    });
    toast(`Tjekket ind på ${bar.name} +${gain} XP`);
  };

  const cheers = async () => {
    await live.setPath(code, `members/${me.id}/xp`, me.xp + XP.cheers);
    await live.pushFeed(code, { t: Date.now(), type: 'cheers', memberId: me.id, name: me.name, emoji: me.emoji, text: 'skåler med hele holdet!', xp: XP.cheers });
    toast('SKÅL! 🥂');
  };

  const completeChallenge = async (c: Challenge) => {
    await live.setPath(code, `members/${me.id}/xp`, me.xp + c.points);
    await live.setPath(code, `members/${me.id}/done`, [...(me.done || []), c.id]);
    await live.pushFeed(code, {
      t: Date.now(), type: 'challenge', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `klarede: ${c.text}`, xp: c.points,
    });
    toast(`Godkendt! +${c.points} XP`);
  };

  const shareSession = async () => {
    const url = sessionUrl(code);
    const text = `Vi kører "${session.crawl.title}" – hop med! Kode: ${code}`;
    const ok = await nativeShare({ title: session.crawl.title, text, url });
    if (!ok) { await copyText(url); toast('Link kopieret – send det til vennerne'); }
  };

  return (
    <main className="page stack">
      <div className="card card--pad" style={{ background: 'linear-gradient(150deg, var(--brand), var(--brand-2))', color: 'var(--on-brand)', border: 'none' }}>
        <div className="row row--between">
          <div style={{ minWidth: 0 }}>
            <span className="tiny" style={{ opacity: .8, fontWeight: 800, letterSpacing: '.06em' }}>LIVE · {members.length} med</span>
            <h1 className="truncate" style={{ fontSize: 21, margin: '2px 0 0' }}>{session.crawl.title}</h1>
          </div>
          <button className="iconbtn" onClick={shareSession} title="Del">↗</button>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 26 }}>{lvl.ico}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row row--between">
              <b className="small">{lvl.title}</b>
              <span className="tiny" style={{ opacity: .85 }}>{me.xp} XP{lvl.next ? ` / ${lvl.next.xp}` : ''}</span>
            </div>
            <div className="xpbar" style={{ marginTop: 5 }}><div style={{ width: lvl.pct + '%' }} /></div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === 'live' ? 'is-on' : ''} onClick={() => setTab('live')}>🏆 Stilling</button>
        <button className={tab === 'hjul' ? 'is-on' : ''} onClick={() => setTab('hjul')}>🎡 Hjulet</button>
        <button className={tab === 'rute' ? 'is-on' : ''} onClick={() => setTab('rute')}>🧭 Ruten</button>
      </div>

      {tab === 'live' && (
        <>
          <div className="card card--pad">
            <div className="row row--between" style={{ marginBottom: 10 }}>
              <b>Registrér</b>
              <span className="small muted">#{rank} af {members.length}</span>
            </div>
            <div className="btnrow">
              <button className="btn btn--accent" onClick={() => bump('drinks', XP.drink, 'drink', 'tog en genstand')}>🍺 +1 genstand</button>
              <button className="btn" onClick={() => bump('water', XP.water, 'water', 'drak et glas vand')}>💧 +1 vand</button>
              <button className="btn" onClick={cheers}>🥂 Skål!</button>
              {currentBar
                ? <button className="btn" onClick={() => navigate('/bar/' + currentBar.id)}>📍 {currentBar.name}</button>
                : <button className="btn btn--primary" onClick={() => setTab('rute')}>📍 Tjek ind</button>}
            </div>
            <div className="summary" style={{ marginTop: 12 }}>
              <div className="bigstat"><b>{me.drinks}</b><span>genstande</span></div>
              <div className="bigstat"><b>{me.water}</b><span>vand</span></div>
              <div className="bigstat"><b>{(me.done || []).length}</b><span>udfordringer</span></div>
            </div>
          </div>

          <div className="card card--pad">
            <h3 style={{ marginBottom: 10 }}>Stilling</h3>
            <div className="stack" style={{ gap: 8 }}>
              {members.map((m, i) => {
                const ml = levelFor(m.xp);
                const away = now.getTime() - (m.lastSeen || 0) > 5 * 60000;
                return (
                  <div key={m.id} className={'member' + (m.id === me.id ? ' member--me' : '')}>
                    <span className={'member__rank member__rank--' + (i + 1)}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
                    <span className="member__ava" style={{ opacity: away ? .5 : 1 }}>{m.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <b className="truncate">{m.name}</b>
                        {m.id === me.id && <span className="tiny muted">(dig)</span>}
                      </div>
                      <div className="tiny muted truncate">
                        {ml.ico} {ml.title} · 🍺 {m.drinks} · 💧 {m.water}
                        {m.stop >= 0 && stops[m.stop] ? ` · 📍 ${stops[m.stop].name}` : ''}
                      </div>
                    </div>
                    <b className="nowrap">{m.xp} XP</b>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card--pad">
            <div className="row row--between" style={{ marginBottom: 6 }}>
              <h3>Hvad sker der</h3>
              {!liveIsShared() && <span className="chip chip--warn">Kun denne enhed</span>}
            </div>
            {feed.length === 0 && <p className="small muted">Ingenting endnu. Tryk på en knap ovenfor.</p>}
            <div className="feed">
              {feed.map((ev: FeedEvent) => (
                <div key={ev.id} className="feed__row">
                  <span>{FEED_ICO[ev.type] ?? '•'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{ev.emoji} {ev.name}</b>{' '}
                    <span className="muted">
                      {ev.text ?? (ev.type === 'join' ? 'er med!' : '')}
                    </span>
                    {ev.xp ? <b className="tiny" style={{ color: 'var(--accent-2)' }}> +{ev.xp}</b> : null}
                  </div>
                  <span className="feed__t">{ago(ev.t, now.getTime())}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card--pad center">
            <p className="small muted" style={{ margin: '0 0 8px' }}>Del koden så flere kan hoppe med</p>
            <div className="codebox">{code}</div>
            <div className="btnrow" style={{ marginTop: 10, justifyContent: 'center' }}>
              <button className="btn btn--primary" onClick={shareSession}>↗ Del link</button>
              <button className="btn" onClick={async () => { await copyText(code); toast('Kode kopieret'); }}>📋 Kopiér kode</button>
            </div>
          </div>
        </>
      )}

      {tab === 'hjul' && (
        <WheelTab
          bar={currentBar}
          noAlcohol={session.noAlcohol}
          done={me.done || []}
          onComplete={completeChallenge}
        />
      )}

      {tab === 'rute' && (
        <>
          <div className="mapwrap">
            <MapView
              bars={stops}
              now={now}
              numbers={Object.fromEntries(stops.map((b, i) => [b.id, i + 1]))}
              route={stops.length > 1 ? stops.map((b) => [b.lat, b.lng] as [number, number]) : null}
              userPos={pos}
              className="map--card"
              fitKey={'sess:' + code}
            />
          </div>
          <div className="stack" style={{ gap: 0 }}>
            {tl.items.map((it, i) => {
              const here = members.filter((m) => m.stop === i);
              return (
                <div key={it.bar.id + i}>
                  {i > 0 && <div className="walkline">🚶 {it.walkFromPrevMinutes} min · {fmtDistance(it.walkFromPrevMeters)}</div>}
                  <div className={'stop' + (me.stop === i ? ' stop--warn' : '')} style={me.stop === i ? { borderColor: 'var(--brand)' } : undefined}>
                    <div className="stop__n">{i + 1}</div>
                    <img src={logoUrl(it.bar)} alt="" style={{ width: 40, height: 40, borderRadius: 11, objectFit: 'contain', background: 'var(--surface-2)', padding: 3, border: '1px solid var(--border)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b className="truncate" style={{ display: 'block' }}>{it.bar.name}</b>
                      <div className="small muted">{fmtTime(it.arrive)} – {fmtTime(it.leave)}</div>
                      {here.length > 0 && <div className="tiny" style={{ marginTop: 4 }}>{here.map((m) => m.emoji).join(' ')} {here.length} her</div>}
                      <div className="btnrow" style={{ marginTop: 8 }}>
                        <button className={'btn btn--sm' + (me.stop === i ? '' : ' btn--primary')} onClick={() => checkIn(i)}>
                          {me.stop === i ? '✓ Du er her' : '📍 Tjek ind'}
                        </button>
                        <a className="btn btn--sm" href={googleMapsDirections(it.bar, i === 0 ? pos : tl.items[i - 1].bar)} target="_blank" rel="noreferrer">🧭 Rute</a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

/* ---------------- hjul-fanen ---------------- */

function WheelTab({ bar, noAlcohol, done, onComplete }: {
  bar: Bar | null;
  noAlcohol?: boolean;
  done: string[];
  onComplete: (c: Challenge) => Promise<void>;
}) {
  const [slices, setSlices] = useState<Challenge[]>(() => drawChallenges(8, { faculty: bar?.faculty, noAlcohol, exclude: done }));
  const [result, setResult] = useState<Challenge | null>(null);
  const [locked, setLocked] = useState(false);

  const reroll = useCallback(() => {
    setSlices(drawChallenges(8, { faculty: bar?.faculty, noAlcohol, exclude: done }));
    setResult(null);
    setLocked(false);
  }, [bar?.faculty, noAlcohol, done]);

  useEffect(() => { reroll(); }, [bar?.id]); // nyt hjul når man skifter bar

  return (
    <>
      <div className="card card--pad center">
        <h3>Lykkehjulet</h3>
        <p className="small muted" style={{ margin: '4px 0 14px' }}>
          {bar ? `Udfordringer til ${bar.name}` : 'Tjek ind på et stop for at få barspecifikke udfordringer'}
        </p>
        <Wheel slices={slices} onResult={(c) => { setResult(c); setLocked(true); }} />
      </div>

      {result && (
        <ChallengeCard c={result}>
          <div className="btnrow" style={{ marginTop: 12 }}>
            <button className="btn btn--primary" onClick={async () => { await onComplete(result); reroll(); }}>
              ✓ Gennemført
            </button>
            <button className="btn" onClick={reroll}>🎡 Nyt hjul</button>
          </div>
        </ChallengeCard>
      )}

      {!result && locked === false && (
        <div className="card card--pad">
          <b className="small">Sådan spiller I</b>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            Drej ved hver bar. Feltet I lander på er dagens udfordring – jo sjældnere felt, jo flere XP.
            Gennemfør den, tryk godkendt, og se hvem der fører på stillingen.
          </p>
        </div>
      )}
    </>
  );
}
