import { useEffect, useState } from 'react';
import type { Session } from '../data/types';
import { levelFor } from '../data/challenges';
import { clearActiveSession, getActiveSession, live, memberList, sessionEnded } from '../lib/live';
import { navigate } from '../lib/router';

/**
 * Bjælke der ligger over bundmenuen når man er med i en live-session,
 * så man altid kan komme tilbage – uanset hvor i appen man er endt.
 */
export function LiveBar({ hidden }: { hidden: boolean }) {
  const [code, setCode] = useState<string | null>(() => getActiveSession());
  const [session, setSession] = useState<Session | null>(null);

  // Følg med i om der er en aktiv session (også hvis den sættes i en anden fane).
  useEffect(() => {
    const sync = () => setCode(getActiveSession());
    window.addEventListener('mfc200:active', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('mfc200:active', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!code) { setSession(null); return; }
    return live.subscribe(code, (s) => {
      setSession(s);
      if (s === null) clearActiveSession(); // sessionen er slettet
    });
  }, [code]);

  if (hidden || !code || !session) return null;
  if (sessionEnded(session, Date.now())) return null;

  const myId = localStorage.getItem(`mfc200:me:${code}`);
  const me = myId ? session.members?.[myId] : null;
  if (!me) return null;

  const members = memberList(session);
  const rank = members.findIndex((m) => m.id === me.id) + 1;
  const lvl = levelFor(me.xp);

  return (
    <button className="livebar" onClick={() => navigate('/live/' + code)}>
      <span className="livebar__dot" />
      <span className="livebar__body">
        <b className="truncate">{session.crawl.title}</b>
        <span className="livebar__meta truncate">
          {lvl.ico} {me.xp} point · #{rank} af {members.length} · {me.emoji} {me.name}
        </span>
      </span>
      <span className="livebar__go">Tilbage ›</span>
    </button>
  );
}
