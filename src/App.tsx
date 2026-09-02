import { useEffect, useMemo } from 'react';
import { BARS } from './data/bars';
import { barStatus } from './lib/hours';
import { navigate, useRoute } from './lib/router';
import { useStore } from './lib/store';
import { useNow } from './components/ui';
import { Home } from './screens/Home';
import { Explore } from './screens/Explore';
import { MapScreen } from './screens/MapScreen';
import { BarDetail } from './screens/BarDetail';
import { Planner } from './screens/Planner';
import { CalendarScreen } from './screens/Calendar';
import { Profile } from './screens/Profile';
import { SharedCrawl } from './screens/SharedCrawl';
import { SessionScreen } from './screens/Session';
import { JoinByCode } from './screens/JoinByCode';
import { LiveBar } from './components/LiveBar';

const TABS = [
  { path: '/', ico: '🍺', label: 'I dag' },
  { path: '/kort', ico: '🗺️', label: 'Kort' },
  { path: '/barer', ico: '🔎', label: 'Barer' },
  { path: '/tur', ico: '🧭', label: 'Tur' },
  { path: '/mig', ico: '👤', label: 'Mig' },
];

export function App() {
  const route = useRoute();
  const now = useNow();
  const { state } = useStore();

  const openCount = useMemo(() => BARS.filter((b) => barStatus(b, now).open).length, [now]);

  // Scroll til toppen ved sideskift.
  useEffect(() => { window.scrollTo(0, 0); }, [route.path]);

  const [head, arg] = route.parts;

  let screen: JSX.Element;
  if (!head) screen = <Home now={now} />;
  else if (head === 'kort') screen = <MapScreen now={now} focus={arg} />;
  else if (head === 'barer') screen = <Explore now={now} />;
  else if (head === 'bar' && arg) screen = <BarDetail id={arg} now={now} />;
  else if (head === 'tur' && arg) screen = <SharedCrawl code={arg} now={now} />;
  else if (head === 'tur') screen = <Planner now={now} />;
  else if (head === 'live' && arg) screen = <SessionScreen code={arg.toUpperCase()} now={now} />;
  else if (head === 'live') screen = <JoinByCode />;
  else if (head === 'kalender') screen = <CalendarScreen now={now} />;
  else if (head === 'mig') screen = <Profile now={now} />;
  else screen = <Home now={now} />;

  const activeTab = !head ? '/' : '/' + head;
  const stops = state.draft.stops.length;

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar__inner">
          <button className="brandmark" onClick={() => navigate('/')} aria-label="Til forsiden">MFC<br />200</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="appbar__title truncate">MikkelFredagsCafe200</div>
            <div className="appbar__sub truncate">Fredagsbarer i Aarhus · {BARS.length} steder</div>
          </div>
          <button className="livepill" onClick={() => navigate('/barer?abne=1')}>
            <span className={'dot' + (openCount ? '' : ' dot--off')} />
            {openCount} åbne
          </button>
        </div>
      </header>

      {screen}

      <LiveBar hidden={head === 'live'} />

      <nav className="nav">
        <div className="nav__inner">
          {TABS.map((t) => (
            <button
              key={t.path}
              className={'nav__item' + (activeTab === t.path ? ' is-active' : '')}
              onClick={() => navigate(t.path)}
            >
              <span className="ico">{t.ico}</span>
              {t.label}
              {t.path === '/tur' && stops > 0 && <span className="nav__badge">{stops}</span>}
            </button>
          ))}
        </div>
      </nav>

      <Toasts />
    </div>
  );
}

function Toasts() {
  const { state } = useStore();
  if (!state.toasts.length) return null;
  return (
    <div className="toast-wrap">
      {state.toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
    </div>
  );
}
