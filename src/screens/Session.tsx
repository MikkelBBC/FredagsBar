import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BAR_BY_ID } from '../data/bars';
import type { Bar, FeedEvent, Member, Session } from '../data/types';
import {
  BINGO_LINES, BINGO_TILES, MISSIONER, REGLER,
  drawBingo, drawChallenges, levelFor, type Challenge,
} from '../data/challenges';
import { XP, feedList, live, liveIsShared, memberList, newMember, sessionUrl } from '../lib/live';
import { buildTimeline } from '../lib/crawl';
import { fmtDateLong, fmtTime } from '../lib/format';
import { copyText, nativeShare } from '../lib/share';
import { fmtDistance, googleMapsDirections, walkMeters, walkMinutes, type LatLng } from '../lib/geo';
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
  const { state, toast, pos, locate, dispatch } = useStore();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [myId, setMyId] = useState<string | null>(() => localStorage.getItem(meKey(code)));

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
    if (!session) return;
    const m = newMember(name, emoji);
    m.xp = XP.join;
    if (session.modes?.missions) m.mission = MISSIONER[Math.floor(Math.random() * MISSIONER.length)].id;
    if (session.modes?.bingo) { m.bingo = drawBingo(); m.bingoMarks = []; m.bingoLines = 0; }
    await live.setPath(code, `members/${m.id}`, m);
    await live.pushFeed(code, { t: Date.now(), type: 'join', memberId: m.id, name: m.name, emoji: m.emoji, xp: XP.join });
    localStorage.setItem(meKey(code), m.id);
    setMyId(m.id);
    if (!state.name) dispatch({ type: 'name', name: m.name });
    toast(`Velkommen, ${m.name}! +${XP.join} XP`);
  }, [code, dispatch, session, state.name, toast]);

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

  return <SessionBoard session={session} me={me} now={now} pos={pos} locate={locate} toast={toast} />;
}

/* ---------------- tilmelding ---------------- */

function JoinCard({ session, onJoin, defaultName }: { session: Session; onJoin: (n: string, e: string) => void; defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [emoji, setEmoji] = useState(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  const members = memberList(session);
  const stops = session.crawl.stops.map((s) => BAR_BY_ID[s.barId]).filter(Boolean) as Bar[];
  const modes = session.modes || {};

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
        <h3>Aftenens spil</h3>
        <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
          {modes.wheel && <span className="chip">🎡 Konsekvenshjul</span>}
          {modes.rules && <span className="chip">👑 Regelmester</span>}
          {modes.missions && <span className="chip">🕵️ Hemmelig mission</span>}
          {modes.bingo && <span className="chip">🔢 Bingo</span>}
          {modes.finale && <span className="chip">🔥 Dobbelt XP på sidste stop</span>}
        </div>
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
  pos: LatLng | null;
  locate: () => void;
  toast: (s: string) => void;
}

type Tab = 'live' | 'hjul' | 'bingo' | 'rute';

function SessionBoard({ session, me, now, pos, locate, toast }: BoardProps) {
  const code = session.code;
  const modes = session.modes || { wheel: true, rules: true, missions: true, bingo: false, finale: true };
  const [tab, setTab] = useState<Tab>('live');

  const members = memberList(session);
  const feed = feedList(session);
  const stops = session.crawl.stops.map((s) => BAR_BY_ID[s.barId]).filter(Boolean) as Bar[];
  const tl = useMemo(() => buildTimeline(session.crawl), [session.crawl]);
  const lvl = levelFor(me.xp);
  const rank = members.findIndex((m) => m.id === me.id) + 1;
  const currentBar = me.stop >= 0 ? stops[me.stop] : null;
  const nextBar = me.stop + 1 < stops.length ? stops[me.stop + 1] : null;
  const currentRule = modes.rules && me.stop >= 0 ? REGLER.find((r) => r.id === session.rules?.[String(me.stop)]) : undefined;
  const myMission = modes.missions && me.mission ? MISSIONER.find((m) => m.id === me.mission) : undefined;

  // ---- live-position ----
  const sharing = !!me.sharing;
  const lastSent = useRef<{ t: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!sharing || !pos) return;
    const prev = lastSent.current;
    const moved = prev ? walkMeters(prev, pos) : Infinity;
    const age = prev ? Date.now() - prev.t : Infinity;
    if (moved < 12 && age < 25000) return;
    lastSent.current = { t: Date.now(), lat: pos.lat, lng: pos.lng };
    live.setPath(code, `members/${me.id}/lat`, pos.lat);
    live.setPath(code, `members/${me.id}/lng`, pos.lng);
    live.setPath(code, `members/${me.id}/posAt`, Date.now());
  }, [sharing, pos, code, me.id]);

  const toggleSharing = async () => {
    if (sharing) {
      await live.setPath(code, `members/${me.id}/sharing`, false);
      await live.setPath(code, `members/${me.id}/lat`, null);
      await live.setPath(code, `members/${me.id}/lng`, null);
      lastSent.current = null;
      toast('Du deler ikke længere din position');
    } else {
      if (!pos) locate();
      await live.setPath(code, `members/${me.id}/sharing`, true);
      toast('De andre kan nu se hvor du er');
    }
  };

  /** Deltagere der deler position – dem selv undtaget. */
  const people = useMemo(() => members
    .filter((m) => m.id !== me.id && typeof m.lat === 'number' && typeof m.lng === 'number')
    .map((m) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      lat: m.lat as number,
      lng: m.lng as number,
      stale: now.getTime() - (m.posAt || 0) > 5 * 60000,
    })), [members, me.id, now]);

  const sharingCount = members.filter((m) => typeof m.lat === 'number').length;

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
    const finale = modes.finale && i === stops.length - 1;
    let gain = XP.checkin + (first ? XP.first : 0);
    if (finale) gain *= 2;

    await live.setPath(code, `members/${me.id}/stop`, i);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + gain);

    // Første der ankommer trækker stoppets regel.
    if (modes.rules && !session.rules?.[String(i)]) {
      const used = Object.values(session.rules || {});
      const pool = REGLER.filter((r) => !used.includes(r.id));
      const regel = (pool.length ? pool : REGLER)[Math.floor(Math.random() * (pool.length || REGLER.length))];
      await live.setPath(code, `rules/${i}`, regel.id);
      await live.pushFeed(code, {
        t: Date.now(), type: 'msg', memberId: me.id, name: me.name, emoji: me.emoji,
        text: `trak regel på ${bar.name}: ${regel.ico} ${regel.title}`,
      });
    }

    await live.pushFeed(code, {
      t: Date.now(), type: 'checkin', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `er ankommet til ${bar.name}${first ? ' – først fremme! 🥇' : ''}${finale ? ' (finale, dobbelt XP 🔥)' : ''}`,
      xp: gain,
    });
    toast(`Tjekket ind på ${bar.name} +${gain} XP`);
    setTab('live');
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
      text: `klarede konsekvensen: ${c.text}`, xp: c.points,
    });
    toast(`Godkendt! +${c.points} XP`);
  };

  const completeMission = async () => {
    if (!myMission) return;
    await live.setPath(code, `members/${me.id}/missionDone`, true);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + myMission.points);
    await live.pushFeed(code, {
      t: Date.now(), type: 'challenge', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `fuldførte sin hemmelige mission: ${myMission.text}`, xp: myMission.points,
    });
    toast(`Mission fuldført! +${myMission.points} XP`);
  };

  const toggleBingo = async (i: number) => {
    const marks = new Set(me.bingoMarks || []);
    if (marks.has(i)) marks.delete(i); else marks.add(i);
    const arr = [...marks].sort((a, b) => a - b);
    const lines = BINGO_LINES.filter((l) => l.every((x) => marks.has(x))).length;
    const gained = Math.max(0, lines - (me.bingoLines || 0));
    await live.setPath(code, `members/${me.id}/bingoMarks`, arr);
    await live.setPath(code, `members/${me.id}/bingoLines`, lines);
    if (gained > 0) {
      const xp = gained * XP.bingoLine;
      await live.setPath(code, `members/${me.id}/xp`, me.xp + xp);
      await live.pushFeed(code, {
        t: Date.now(), type: 'challenge', memberId: me.id, name: me.name, emoji: me.emoji,
        text: `har BINGO! ${lines} ${lines === 1 ? 'række' : 'rækker'} 🔢`, xp,
      });
      toast(`BINGO! +${xp} XP`);
    }
  };

  const shareSession = async () => {
    const url = sessionUrl(code);
    const text = `Vi kører "${session.crawl.title}" – hop med! Kode: ${code}`;
    const ok = await nativeShare({ title: session.crawl.title, text, url });
    if (!ok) { await copyText(url); toast('Link kopieret – send det til vennerne'); }
  };

  const distTo = (bar: Bar): string | null => {
    if (!pos) return null;
    const m = walkMeters(pos, bar);
    return `${fmtDistance(m)} · ${walkMinutes(m)} min`;
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
        {modes.wheel && <button className={tab === 'hjul' ? 'is-on' : ''} onClick={() => setTab('hjul')}>🎡 Hjulet</button>}
        {modes.bingo && <button className={tab === 'bingo' ? 'is-on' : ''} onClick={() => setTab('bingo')}>🔢 Bingo</button>}
        <button className={tab === 'rute' ? 'is-on' : ''} onClick={() => setTab('rute')}>🧭 Ruten</button>
      </div>

      {tab === 'live' && (
        <>
          {/* Hvor er jeg, og hvor langt er der videre */}
          <div className="card card--pad">
            <div className="row row--between" style={{ marginBottom: 10 }}>
              <div style={{ minWidth: 0 }}>
                {currentBar ? (
                  <>
                    <b className="truncate" style={{ display: 'block' }}>📍 {currentBar.name}</b>
                    <span className="small muted">Stop {me.stop + 1} af {stops.length}</span>
                  </>
                ) : (
                  <>
                    <b>Ikke tjekket ind endnu</b>
                    <div className="small muted">Tryk på Ruten når du er fremme</div>
                  </>
                )}
              </div>
              <span className="small muted">#{rank} af {members.length}</span>
            </div>

            {nextBar && (
              <div className="walkline" style={{ paddingLeft: 0, marginBottom: 10 }}>
                <span style={{ position: 'static' }}>
                  Næste: <b>{nextBar.name}</b>
                  {currentBar
                    ? ` · ${fmtDistance(walkMeters(currentBar, nextBar))} (${walkMinutes(walkMeters(currentBar, nextBar))} min) herfra`
                    : distTo(nextBar) ? ` · ${distTo(nextBar)} fra dig` : ''}
                </span>
              </div>
            )}

            <div className="btnrow">
              <button className="btn btn--accent" onClick={() => bump('drinks', XP.drink, 'drink', 'tog en genstand')}>🍺 +1 genstand</button>
              <button className="btn" onClick={() => bump('water', XP.water, 'water', 'drak et glas vand')}>💧 +1 vand</button>
              <button className="btn" onClick={cheers}>🥂 Skål!</button>
              <button className="btn btn--primary" onClick={() => setTab('rute')}>📍 Tjek ind</button>
            </div>

            <div className="summary" style={{ marginTop: 12 }}>
              <div className="bigstat"><b>{me.drinks}</b><span>genstande</span></div>
              <div className="bigstat"><b>{me.water}</b><span>vand</span></div>
              <div className="bigstat"><b>{(me.done || []).length}</b><span>konsekvenser</span></div>
            </div>
          </div>

          {currentRule && (
            <div className="card card--pad" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ fontSize: 28 }}>{currentRule.ico}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="tiny muted" style={{ fontWeight: 800, letterSpacing: '.06em' }}>REGLEN PÅ DETTE STOP</span>
                  <b style={{ display: 'block' }}>{currentRule.title}</b>
                  <p className="small muted" style={{ margin: '3px 0 0' }}>{currentRule.text}</p>
                </div>
              </div>
            </div>
          )}

          {myMission && (
            <div className="card card--pad" style={{ borderStyle: me.missionDone ? 'solid' : 'dashed' }}>
              <div className="row row--between">
                <span className="tiny muted" style={{ fontWeight: 800, letterSpacing: '.06em' }}>🕵️ DIN HEMMELIGE MISSION</span>
                <b className="small" style={{ color: 'var(--accent-2)' }}>+{myMission.points} XP</b>
              </div>
              <p className="small" style={{ margin: '8px 0 0', fontWeight: 700 }}>{myMission.text}</p>
              <p className="tiny muted" style={{ margin: '6px 0 0' }}>Sig det ikke til nogen. De andre kan ikke se hvad du har fået.</p>
              {me.missionDone
                ? <div className="chip chip--open" style={{ marginTop: 10 }}>✓ Fuldført</div>
                : <button className="btn btn--sm btn--primary" style={{ marginTop: 10 }} onClick={completeMission}>✓ Jeg klarede den</button>}
            </div>
          )}

          <div className="card card--pad">
            <div className="row row--between">
              <div style={{ minWidth: 0 }}>
                <b className="small">📡 Del din position</b>
                <div className="tiny muted">
                  {sharing
                    ? pos ? `De andre kan se hvor du er · ${sharingCount} deler lige nu` : 'Venter på GPS…'
                    : 'Så kan I se hinanden på kortet under Ruten'}
                </div>
              </div>
              <button className={'btn btn--sm' + (sharing ? '' : ' btn--primary')} onClick={toggleSharing}>
                {sharing ? 'Slå fra' : 'Slå til'}
              </button>
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
                      {m.id !== me.id && pos && typeof m.lat === 'number' && typeof m.lng === 'number' && (
                        <div className="tiny" style={{ color: 'var(--accent-2)', fontWeight: 700 }}>
                          📡 {fmtDistance(walkMeters(pos, { lat: m.lat, lng: m.lng }))} fra dig
                          {now.getTime() - (m.posAt || 0) > 5 * 60000 ? ' (gammel)' : ''}
                        </div>
                      )}
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
                    <span className="muted">{ev.text ?? (ev.type === 'join' ? 'er med!' : '')}</span>
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
        <WheelTab bar={currentBar} done={me.done || []} onComplete={completeChallenge} />
      )}

      {tab === 'bingo' && (
        <BingoTab board={me.bingo || []} marks={me.bingoMarks || []} lines={me.bingoLines || 0} onToggle={toggleBingo} />
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
              people={people}
              className="map--card"
              fitKey={'sess:' + code}
            />
          </div>

          {people.length > 0 ? (
            <p className="tiny muted center" style={{ margin: '-4px 0 0' }}>
              📡 {people.length} {people.length === 1 ? 'ven deler' : 'venner deler'} position lige nu
            </p>
          ) : (
            <p className="tiny muted center" style={{ margin: '-4px 0 0' }}>
              Ingen deler position endnu – slå det til under Stilling så I kan se hinanden her.
            </p>
          )}

          <div className="summary">
            <div className="bigstat"><b>{stops.length}</b><span>stop</span></div>
            <div className="bigstat"><b>{fmtDistance(tl.totalWalkMeters)}</b><span>i alt til fods</span></div>
            <div className="bigstat"><b>{tl.totalWalkMinutes}</b><span>min gang</span></div>
          </div>

          <div className="stack" style={{ gap: 0 }}>
            {tl.items.map((it, i) => {
              const here = members.filter((m) => m.stop === i);
              const mine = me.stop === i;
              const finale = modes.finale && i === stops.length - 1;
              const rule = modes.rules ? REGLER.find((r) => r.id === session.rules?.[String(i)]) : undefined;
              const fromMe = pos ? walkMeters(pos, it.bar) : null;
              return (
                <div key={it.bar.id + i}>
                  {i > 0 && (
                    <div className="walkline">
                      🚶 {Math.round(it.walkFromPrevMeters)} m · {it.walkFromPrevMinutes} min fra forrige stop
                    </div>
                  )}
                  <div className="stop" style={mine ? { borderColor: 'var(--brand)', borderWidth: 2 } : undefined}>
                    <div className="stop__n">{i + 1}</div>
                    <img src={logoUrl(it.bar)} alt="" style={{ width: 40, height: 40, borderRadius: 11, objectFit: 'contain', background: 'var(--surface-2)', padding: 3, border: '1px solid var(--border)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6 }}>
                        <b className="truncate">{it.bar.name}</b>
                        {finale && <span className="chip chip--soon">🔥 Dobbelt XP</span>}
                      </div>
                      <div className="small muted">{fmtTime(it.arrive)} – {fmtTime(it.leave)}</div>
                      <div className="tiny muted">
                        {it.bar.address.split(',')[0]}
                        {fromMe !== null && ` · ${fmtDistance(fromMe)} fra dig (${walkMinutes(fromMe)} min)`}
                      </div>
                      {rule && <div className="chip" style={{ marginTop: 6 }}>{rule.ico} {rule.title}</div>}
                      {here.length > 0 && <div className="tiny" style={{ marginTop: 4 }}>{here.map((m) => m.emoji).join(' ')} {here.length} her</div>}
                      <div className="btnrow" style={{ marginTop: 8 }}>
                        <button className={'btn btn--sm' + (mine ? '' : ' btn--primary')} onClick={() => checkIn(i)}>
                          {mine ? '✓ Du er her' : '📍 Tjek ind'}
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

function WheelTab({ bar, done, onComplete }: {
  bar: Bar | null;
  done: string[];
  onComplete: (c: Challenge) => Promise<void>;
}) {
  const [slices, setSlices] = useState<Challenge[]>(() => drawChallenges(8, { faculty: bar?.faculty, exclude: done }));
  const [result, setResult] = useState<Challenge | null>(null);

  const reroll = useCallback(() => {
    setSlices(drawChallenges(8, { faculty: bar?.faculty, exclude: done }));
    setResult(null);
  }, [bar?.faculty, done]);

  useEffect(() => { reroll(); }, [bar?.id]); // nyt hjul når man skifter bar

  return (
    <>
      <div className="card card--pad center">
        <h3>Konsekvenshjulet</h3>
        <p className="small muted" style={{ margin: '4px 0 14px' }}>
          {bar ? `Konsekvenser til ${bar.name}` : 'Tjek ind på et stop for at få barens egne konsekvenser med'}
        </p>
        <Wheel slices={slices} onResult={(c) => setResult(c)} />
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

      {!result && (
        <div className="card card--pad">
          <b className="small">Sådan spiller I</b>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            Drej ved hver bar. Feltet I lander på er konsekvensen – jo sjældnere felt, jo flere XP.
            Grøn er almindelig, blå er sjælden, gul er legendarisk.
          </p>
        </div>
      )}
    </>
  );
}

/* ---------------- bingo-fanen ---------------- */

function BingoTab({ board, marks, lines, onToggle }: {
  board: number[];
  marks: number[];
  lines: number;
  onToggle: (i: number) => void;
}) {
  if (!board.length) {
    return <Empty icon="🔢" title="Ingen plade" text="Bingo var ikke slået til da du meldte dig ind." />;
  }
  return (
    <>
      <div className="card card--pad">
        <div className="row row--between" style={{ marginBottom: 10 }}>
          <h3>Din bingoplade</h3>
          <span className="chip">{lines} {lines === 1 ? 'række' : 'rækker'}</span>
        </div>
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          Tryk på et felt når det sker. Tre på stribe giver {XP.bingoLine} XP.
        </p>
        <div className="bingo">
          {board.map((tile, i) => (
            <button key={i} className={'bingo__cell' + (marks.includes(i) ? ' is-on' : '')} onClick={() => onToggle(i)}>
              {BINGO_TILES[tile]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
