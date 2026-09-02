import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BAR_BY_ID } from '../data/bars';
import type { Announce, Bar, FeedEvent, Member, Session } from '../data/types';
import {
  BINGO_LINES, BINGO_TILES, CHALLENGES, MISSIONER, REGLER, shareAwards, teases,
  drawBingo, drawChallenges, levelFor, type Challenge, type MemberStats,
} from '../data/challenges';
import {
  XP, cheersJoined, cheersRound, clearActiveSession, feedList, live, liveIsShared,
  memberList, msToNextCheers, newMember, sessionEnded, sessionUrl, setActiveSession,
} from '../lib/live';
import { buildTimeline } from '../lib/crawl';
import { fmtDateLong, fmtTime } from '../lib/format';
import { copyText, nativeShare } from '../lib/share';
import { fmtDistance, googleMapsDirections, walkMeters, walkMinutes, type LatLng } from '../lib/geo';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { MapView } from '../components/MapView';
import { Wheel, ChallengeCard } from '../components/Wheel';
import { Empty, logoUrl } from '../components/ui';
import { Celebration } from '../components/Celebration';
import { newId } from '../lib/share';

const EMOJIS = ['🍺', '🦊', '🐙', '🦁', '🐸', '🦖', '🐝', '🦄', '👽', '🤖', '🎩', '🌮', '⚡', '🔥', '🍕', '🐳'];

const meKey = (code: string) => `mfc200:me:${code}`;

function ago(t: number, now: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'nu';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.round(m / 60)} t`;
}

/** Annonceringer i nutid – det er noget der sker lige nu, ikke noget der skete. */
const TEKST_OMGANG = [
  'giver en omgang til hele holdet! Sig pænt tak.',
  'er i gavehumør og giver en omgang til jer alle sammen!',
  'giver en omgang. Nogen skal jo være den voksne.',
  'giver en omgang til holdet. Husk det næste gang I dømmer.',
];

const TEKST_KYLLING = [
  'er en kæmpe kylling der ikke tør sin konsekvens – så nu giver han eller hun en omgang!',
  'tør ikke sin konsekvens og køber sig fri med en omgang til jer alle sammen!',
  'springer konsekvensen over som en sand kylling. Straffen er en omgang til holdet!',
];

const TEKST_TABER = [
  'er en kæmpe taber der fejler sin hemmelige mission – så nu giver han eller hun en omgang!',
  'kikser sin mission fuldstændig og giver derfor en omgang til jer andre!',
  'klarer ikke sin mission. Straffen er en omgang til hele holdet!',
];

const vaelg = (liste: string[]) => liste[Math.floor(Math.random() * liste.length)];

const FEED_ICO: Record<string, string> = {
  join: '👋', drink: '🍺', checkin: '📍', challenge: '🎯', msg: '💬', cheers: '🥂',
};

export function SessionScreen({ code, now }: { code: string; now: Date }) {
  const { state, toast, pos, locate, dispatch } = useStore();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [myId, setMyId] = useState<string | null>(() => localStorage.getItem(meKey(code)));

  useEffect(() => live.subscribe(code, (s) => setSession(s)), [code]);

  const me = myId && session ? session.members?.[myId] : null;

  // Husk sessionen, så bundmenuen kan føre en tilbage.
  useEffect(() => {
    if (me) setActiveSession(code);
  }, [code, me?.id]);

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
    if (!session.hostId || session.hostId === 'host') await live.setPath(code, 'hostId', m.id);
    localStorage.setItem(meKey(code), m.id);
    setMyId(m.id);
    dispatch({ type: 'rememberSession', code, title: session.crawl.title });
    if (!state.name) dispatch({ type: 'name', name: m.name });
    toast(`Velkommen, ${m.name}! +${XP.join} point`);
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

  if (sessionEnded(session, now.getTime())) return <Finale session={session} meId={myId} />;

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
          {modes.finale && <span className="chip">🔥 Dobbelte point på sidste stop</span>}
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

  const addDrink = async () => {
    await live.setPath(code, `members/${me.id}/drinks`, (me.drinks || 0) + 1);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + XP.drink);
    await live.pushFeed(code, { t: Date.now(), type: 'drink', memberId: me.id, name: me.name, emoji: me.emoji, text: 'tager en genstand', xp: XP.drink });
    toast(`Genstand registreret · +${XP.drink} point`);
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
        text: `trækker reglen på ${bar.name}: ${regel.ico} ${regel.title}`,
      });
    }

    await live.pushFeed(code, {
      t: Date.now(), type: 'checkin', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `ankommer til ${bar.name}${first ? ' – først fremme! 🥇' : ''}${finale ? ' (finale, dobbelte point 🔥)' : ''}`,
      xp: gain,
    });
    toast(`Tjekket ind på ${bar.name} +${gain} point`);
    setTab(modes.wheel ? 'hjul' : 'live');
  };

  /** Med i rundens fælles skål. Kun den der trykker får point. */
  const joinCheers = async () => {
    const r = cheersRound(session, Date.now());
    const already = cheersJoined(session, r);
    if (already.includes(me.id)) return;

    await live.setPath(code, `cheers/${r}/${me.id}`, Date.now());
    await live.setPath(code, `members/${me.id}/xp`, me.xp + XP.cheers);
    await live.pushFeed(code, {
      t: Date.now(), type: 'cheers', memberId: me.id, name: me.name, emoji: me.emoji,
      text: 'er med i den fælles skål', xp: XP.cheers,
    });

    // Nåede hele holdet med? Så er det en fejring værd – men uden ekstra point.
    if (already.length + 1 >= members.length && members.length > 1) {
      await announce('skaal', '– og dermed skåler hele holdet sammen! 🥂');
    }
    toast(`SKÅL! +${XP.cheers} point`);
  };

  const round = cheersRound(session, Date.now());
  const myCheers = Object.values(session.cheers || {}).filter((r) => r && r[me.id]).length;

  // Alle skal dreje hjulet én gang på hver bar de tjekker ind på.
  const stopKey = String(me.stop);
  const spunId = me.stop >= 0 ? me.spins?.[stopKey] : undefined;
  const mustSpin = modes.wheel && me.stop >= 0 && !spunId;

  const recordSpin = async (c: Challenge) => {
    if (me.stop < 0) return;
    await live.setPath(code, `members/${me.id}/spins/${stopKey}`, c.id);
    await live.pushFeed(code, {
      t: Date.now(), type: 'challenge', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `drejer hjulet: ${c.text}`,
    });
  };

  const announce = async (kind: Announce['kind'], text: string) => {
    await live.setPath(code, 'announce', {
      id: newId(), t: Date.now(), kind, memberId: me.id, name: me.name, emoji: me.emoji, text,
    });
  };

  /**
   * Giver en omgang til hele holdet – kun giveren får point, men alle skal se det.
   * `grund` bruges når omgangen er en konsekvens, fx en mission man gav op på.
   */
  const giveRound = async (grund?: { feed: string; fejring: string; kind: 'omgang' | 'kylling' | 'taber' }) => {
    if (!grund && !confirm(`Giver du en omgang til ${members.length === 1 ? 'holdet' : `alle ${members.length}`}? Det giver ${XP.round} point.`)) return;
    await live.setPath(code, `members/${me.id}/rounds`, (me.rounds || 0) + 1);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + XP.round);
    await live.pushFeed(code, {
      t: Date.now(), type: 'drink', memberId: me.id, name: me.name, emoji: me.emoji,
      text: grund?.feed ?? 'giver en omgang til hele holdet! 🍻', xp: XP.round,
    });
    await announce(grund?.kind ?? 'omgang', grund?.fejring ?? vaelg(TEKST_OMGANG));
    toast(`Du giver en omgang – +${XP.round} point 🍻`);
  };

  /** Tør man ikke konsekvensen, koster det en omgang til holdet. */
  const bailChallenge = async (c: Challenge) => {
    if (me.stop < 0) return;
    if (!confirm('Springer du konsekvensen over? Så giver du en omgang til holdet i stedet.')) return;
    await live.setPath(code, `members/${me.id}/bailed/${stopKey}`, true);
    await giveRound({
      kind: 'kylling',
      feed: `tør ikke konsekvensen og giver en omgang i stedet: "${c.text}"`,
      fejring: vaelg(TEKST_KYLLING),
    });
  };

  /** Missionen mislykkedes: så er det omgang til holdet. */
  const failMission = async () => {
    if (!myMission) return;
    if (!confirm('Gav du op? Så skylder du holdet en omgang. Den giver til gengæld point.')) return;
    await live.setPath(code, `members/${me.id}/missionFailed`, true);
    await giveRound({
      kind: 'taber',
      feed: 'fejler sin hemmelige mission og giver en omgang! 🍻',
      fejring: vaelg(TEKST_TABER),
    });
  };

  const endNight = async () => {
    if (!confirm('Afslut aftenen for alle? Så låses stillingen og resultatet vises.')) return;
    await live.setPath(code, 'endedAt', Date.now());
    await live.pushFeed(code, {
      t: Date.now(), type: 'msg', memberId: me.id, name: me.name, emoji: me.emoji,
      text: 'afslutter aftenen 🏁',
    });
  };

  const isHost = session.hostId === me.id;

  const completeChallenge = async (c: Challenge) => {
    await live.setPath(code, `members/${me.id}/xp`, me.xp + c.points);
    await live.setPath(code, `members/${me.id}/done`, [...(me.done || []), c.id]);
    await live.pushFeed(code, {
      t: Date.now(), type: 'challenge', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `klarer konsekvensen: ${c.text}`, xp: c.points,
    });
    toast(`Godkendt! +${c.points} point`);
  };

  const completeMission = async () => {
    if (!myMission) return;
    await live.setPath(code, `members/${me.id}/missionDone`, true);
    await live.setPath(code, `members/${me.id}/xp`, me.xp + myMission.points);
    await live.pushFeed(code, {
      t: Date.now(), type: 'challenge', memberId: me.id, name: me.name, emoji: me.emoji,
      text: `fuldfører sin hemmelige mission: ${myMission.text}`, xp: myMission.points,
    });
    toast(`Mission fuldført! +${myMission.points} point`);
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
        text: `får BINGO! ${lines} ${lines === 1 ? 'række' : 'rækker'} 🔢`, xp,
      });
      toast(`BINGO! +${xp} point`);
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
              <span className="tiny" style={{ opacity: .85 }}>{me.xp} point{lvl.next ? ` / ${lvl.next.xp}` : ''}</span>
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
          {mustSpin && (
            <button className="mustspin" onClick={() => setTab('hjul')}>
              <span style={{ fontSize: 26 }}>🎡</span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <b style={{ display: 'block' }}>Du mangler at dreje hjulet</b>
                <span className="tiny">Alle drejer én gang på hver bar – du kan ikke rulle om</span>
              </span>
              <span className="btn btn--sm btn--accent">Drej</span>
            </button>
          )}

          <CheersCard
            session={session}
            joined={cheersJoined(session, round).length}
            total={members.length}
            iJoined={cheersJoined(session, round).includes(me.id)}
            onJoin={joinCheers}
          />

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

            <button className="bigbtn" onClick={() => giveRound()}>🍻 GIV EN OMGANG</button>

            <div className="btnrow" style={{ marginTop: 10 }}>
              <button className="btn" onClick={addDrink}>🍺 +1 genstand</button>
              <button className="btn btn--primary" onClick={() => setTab('rute')}>📍 Tjek ind</button>
            </div>

            <div className="summary" style={{ marginTop: 12 }}>
              <div className="bigstat"><b>{me.drinks}</b><span>genstande</span></div>
              <div className="bigstat"><b>{(me.done || []).length}</b><span>konsekvenser</span></div>
              <div className="bigstat"><b>{myCheers}</b><span>skåle</span></div>
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
                <b className="small" style={{ color: 'var(--accent-2)' }}>+{myMission.points} point</b>
              </div>
              <p className="small" style={{ margin: '8px 0 0', fontWeight: 700 }}>{myMission.text}</p>
              <p className="tiny muted" style={{ margin: '6px 0 0' }}>Sig det ikke til nogen. De andre kan ikke se hvad du har fået.</p>
              {me.missionDone ? (
                <div className="chip chip--open" style={{ marginTop: 10 }}>✓ Fuldført</div>
              ) : me.missionFailed ? (
                <div className="chip chip--warn" style={{ marginTop: 10 }}>🍻 Du giver en omgang for missionen</div>
              ) : (
                <div className="btnrow" style={{ marginTop: 10 }}>
                  <button className="btn btn--sm btn--primary" onClick={completeMission}>✓ Jeg klarede den</button>
                  <button className="btn btn--sm" onClick={failMission}>🍻 Jeg giver op – giv en omgang</button>
                </div>
              )}
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
                        {ml.ico} {ml.title} · 🍺 {m.drinks} · 🎯 {(m.done || []).length}
                        {m.stop >= 0 && stops[m.stop] ? ` · 📍 ${stops[m.stop].name}` : ''}
                      </div>
                      {m.id !== me.id && pos && typeof m.lat === 'number' && typeof m.lng === 'number' && (
                        <div className="tiny" style={{ color: 'var(--accent-2)', fontWeight: 700 }}>
                          📡 {fmtDistance(walkMeters(pos, { lat: m.lat, lng: m.lng }))} fra dig
                          {now.getTime() - (m.posAt || 0) > 5 * 60000 ? ' (gammel)' : ''}
                        </div>
                      )}
                    </div>
                    <b className="nowrap">{m.xp} point</b>
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
            <p className="tiny muted" style={{ margin: '14px 0 8px' }}>
              Du kan roligt gå ud i kortet eller barlisten undervejs – der ligger en bjælke
              nederst der fører dig tilbage hertil.
            </p>
            {isHost && (
              <button className="btn btn--accent btn--block" style={{ marginBottom: 10 }} onClick={endNight}>
                🏁 Afslut aftenen
              </button>
            )}
            <button className="btn btn--sm btn--danger" onClick={() => {
              if (!confirm('Forlad turen? Dine point bliver stående, og du kan komme tilbage med linket.')) return;
              clearActiveSession();
              toast('Du har forladt turen');
              navigate('/');
            }}>Forlad turen</button>
          </div>
        </>
      )}

      {tab === 'hjul' && (
        <WheelTab
          bar={currentBar}
          done={me.done || []}
          spun={me.spins || {}}
          spunId={spunId}
          onSpin={recordSpin}
          onComplete={completeChallenge}
          onBail={bailChallenge}
          bailed={!!me.bailed?.[stopKey]}
        />
      )}

      <Celebration announce={session.announce} />

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
                        {finale && <span className="chip chip--soon">🔥 Dobbelte point</span>}
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

function WheelTab({ bar, done, spun, spunId, bailed, onSpin, onComplete, onBail }: {
  bar: Bar | null;
  done: string[];
  spun: Record<string, string>;
  spunId?: string;
  bailed: boolean;
  onSpin: (c: Challenge) => Promise<void>;
  onComplete: (c: Challenge) => Promise<void>;
  onBail: (c: Challenge) => Promise<void>;
}) {
  // Alt man selv har fået før, ryger ud af puljen – så bliver det sjældent det samme to gange.
  const brugte = useMemo(() => [...done, ...Object.values(spun || {})], [done, spun]);
  const [slices, setSlices] = useState<Challenge[]>(() => drawChallenges(8, { faculty: bar?.faculty, exclude: brugte }));
  const [landed, setLanded] = useState<Challenge | null>(null);

  useEffect(() => {
    setSlices(drawChallenges(8, { faculty: bar?.faculty, exclude: brugte }));
    setLanded(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar?.id]);

  if (!bar) {
    return (
      <Empty
        icon="📍"
        title="Tjek ind først"
        text="Hjulet drejes når I ankommer til en bar. Gå til Ruten og tryk Tjek ind."
      />
    );
  }

  // Har man allerede drejet her, står resultatet fast.
  const fastlagt = spunId ? CHALLENGES.find((c) => c.id === spunId) ?? null : null;
  const vist = fastlagt ?? landed;
  const gennemfoert = vist ? done.includes(vist.id) : false;

  if (vist) {
    return (
      <>
        <div className="card card--pad center">
          <span className="tiny muted" style={{ fontWeight: 800, letterSpacing: '.06em' }}>DIN KONSEKVENS PÅ</span>
          <h3>{bar.name}</h3>
        </div>
        <ChallengeCard c={vist}>
          {gennemfoert ? (
            <div className="chip chip--open" style={{ marginTop: 12 }}>✓ Gennemført</div>
          ) : bailed ? (
            <div className="chip chip--warn" style={{ marginTop: 12 }}>🍻 Sprunget over – du giver en omgang i stedet</div>
          ) : (
            <div className="btnrow" style={{ marginTop: 12 }}>
              <button className="btn btn--primary" onClick={() => onComplete(vist)}>✓ Gennemført</button>
              <button className="btn" onClick={() => onBail(vist)}>🍻 Tør ikke – giv en omgang</button>
            </div>
          )}
        </ChallengeCard>
        <div className="card card--pad">
          <b className="small">Næste drej</b>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            Du får et nyt felt når I tjekker ind på næste bar. Én konsekvens pr. bar – ingen omkast.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card card--pad center">
        <h3>Konsekvenshjulet</h3>
        <p className="small muted" style={{ margin: '4px 0 14px' }}>
          Drej for {bar.name}. Feltet gælder – der er ingen omkast.
        </p>
        <Wheel slices={slices} onResult={(c) => { setLanded(c); onSpin(c); }} />
      </div>
      <div className="card card--pad">
        <b className="small">Sådan spiller I</b>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Alle drejer én gang på hver bar. Grøn er almindelig, blå er sjælden, gul er legendarisk –
          jo sjældnere felt, jo flere point.
        </p>
      </div>
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
          Tryk på et felt når det sker. Tre på stribe giver {XP.bingoLine} point.
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

/* ---------------- fælles skål ---------------- */

function CheersCard({ session, joined, total, iJoined, onJoin }: {
  session: Session;
  joined: number;
  total: number;
  iJoined: boolean;
  onJoin: () => void;
}) {
  // Egen sekundviser, så resten af tavlen ikke tegnes om hvert sekund.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const left = msToNextCheers(session, Date.now());
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  if (iJoined) {
    return (
      <div className="cheerscard cheerscard--waiting">
        <b className="small">🥂 Du er med i denne runde</b>
        <div className="small muted" style={{ margin: '4px 0 8px' }}>
          {joined} af {total} har skålet · næste runde om
        </div>
        <div className="cheers__clock">{mm}:{String(ss).padStart(2, '0')}</div>
      </div>
    );
  }

  return (
    <div className="cheerscard">
      <b>🥂 Fælles skål</b>
      <div className="small muted" style={{ marginTop: 4 }}>
        {joined > 0
          ? `${joined} af ${total} har skålet i denne runde`
          : 'Ny runde hvert 10. minut. Tryk når I skåler – kun du får point for din egen'}
      </div>
      <button className="cheers__btn" onClick={onJoin}>SKÅL! 🥂</button>
      <div className="tiny muted" style={{ marginTop: 8 }}>Næste runde om {mm}:{String(ss).padStart(2, '0')}</div>
    </div>
  );
}

/* ---------------- afslutningen ---------------- */

function Finale({ session, meId }: { session: Session; meId: string | null }) {
  const { dispatch, toast } = useStore();
  const members = memberList(session);

  const stats: MemberStats[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    emoji: m.emoji,
    xp: m.xp,
    drinks: m.drinks || 0,
    challenges: (m.done || []).length,
    cheers: Object.values(session.cheers || {}).filter((r) => r && r[m.id]).length,
    bingoLines: m.bingoLines || 0,
    bailed: Object.keys(m.bailed || {}).length,
    rounds: m.rounds || 0,
    stop: m.stop ?? -1,
    missionDone: !!m.missionDone,
    missionFailed: !!m.missionFailed,
    joinedAt: m.joinedAt,
  }));

  const podium = stats.slice(0, 3);
  const totalDrinks = stats.reduce((a, b) => a + b.drinks, 0);
  const totalChallenges = stats.reduce((a, b) => a + b.challenges, 0);
  const totalRounds = members.reduce((a, b) => a + (b.rounds || 0), 0);

  const won = shareAwards(stats);
  const drillerier = teases(stats, {
    drinks: totalDrinks,
    rounds: totalRounds,
    challenges: totalChallenges,
    cheers: stats.reduce((a, b) => a + b.cheers, 0),
    stops: session.crawl.stops.length,
  });

  const summaryText = () => {
    const lines = [`🏁 ${session.crawl.title} – slut!`, ''];
    stats.forEach((s, i) => lines.push(`${i + 1}. ${s.emoji} ${s.name} – ${s.xp} point`));
    lines.push('');
    won.forEach(({ award, winner }) => lines.push(`${award.ico} ${award.title}: ${winner.name} (${award.line(winner)})`));
    return lines.join(String.fromCharCode(10));
  };

  const auto = !session.endedAt;

  return (
    <main className="page stack">
      <div className="card card--pad center" style={{ background: 'linear-gradient(150deg, var(--brand), var(--brand-2))', color: 'var(--on-brand)', border: 'none' }}>
        <div style={{ fontSize: 46 }}>🏁</div>
        <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Aftenen er slut</h1>
        <p className="small" style={{ opacity: .9, margin: 0 }}>{session.crawl.title}</p>
        {auto && <p className="tiny" style={{ opacity: .75, marginTop: 8 }}>Turen lukkede automatisk efter 20 timer</p>}
      </div>

      {podium.length > 0 && (
        <div className="card card--pad">
          <h3 className="center" style={{ marginBottom: 10 }}>Slutstilling</h3>
          <div className="podium">
            {[podium[1], podium[0], podium[2]].map((p, i) => p ? (
              <div key={p.id} className={'podium__spot podium__spot--' + (i === 1 ? 1 : i === 0 ? 2 : 3)}>
                <div className="podium__ava">{p.emoji}</div>
                <div className="podium__block">
                  <div style={{ fontSize: 19 }}>{i === 1 ? '🥇' : i === 0 ? '🥈' : '🥉'}</div>
                  <div className="podium__name truncate">{p.name}</div>
                  <div className="podium__xp">{p.xp} point</div>
                </div>
              </div>
            ) : <div key={i} />)}
          </div>
        </div>
      )}

      <div className="summary">
        <div className="bigstat"><b>{totalDrinks}</b><span>genstande i alt</span></div>
        <div className="bigstat"><b>{totalChallenges}</b><span>konsekvenser</span></div>
        <div className="bigstat"><b>{totalRounds}</b><span>omgange givet</span></div>
      </div>

      <div>
        <div className="section__head"><h2>Aftenens priser</h2></div>
        <div className="stack" style={{ gap: 8 }}>
          {won.map(({ award, winner }) => (
            <div key={award.id} className="award">
              <span className="award__ico">{award.ico}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b className="small">{award.title}</b>
                <div className="small">
                  {winner.emoji} <b>{winner.name}</b> <span className="muted">· {award.line(winner)}</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{award.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card--pad">
        <h3 style={{ marginBottom: 10 }}>Hele stillingen</h3>
        <div className="stack" style={{ gap: 8 }}>
          {stats.map((m, i) => (
            <div key={m.id} className={'member' + (m.id === meId ? ' member--me' : '')}>
              <span className={'member__rank member__rank--' + (i + 1)}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
              <span className="member__ava">{m.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b className="truncate">{m.name}{m.id === meId ? ' (dig)' : ''}</b>
                <div className="tiny muted truncate">🍺 {m.drinks} · 🎯 {m.challenges} · 🥂 {m.cheers}</div>
              </div>
              <b className="nowrap">{m.xp} point</b>
            </div>
          ))}
        </div>
      </div>

      <div className="card card--pad">
        <h3 style={{ marginBottom: 8 }}>Aftenens dom 🎤</h3>
        <div className="stack" style={{ gap: 8 }}>
          {drillerier.map((line, i) => (
            <p key={i} className="small" style={{ margin: 0, paddingLeft: 18, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>›</span>
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="btnrow">
        <button className="btn btn--primary" onClick={async () => { await copyText(summaryText()); toast('Resultatet er kopieret'); }}>
          📋 Kopiér resultatet
        </button>
        <button className="btn" onClick={async () => {
          await nativeShare({ title: session.crawl.title, text: summaryText(), url: sessionUrl(session.code) });
        }}>↗ Del</button>
        <button className="btn" onClick={() => { clearActiveSession(); dispatch({ type: 'draftReset' }); navigate('/tur'); }}>
          🧭 Planlæg næste
        </button>
      </div>

      <button className="btn btn--block" onClick={() => { clearActiveSession(); navigate('/'); }}>Til forsiden</button>
    </main>
  );
}
