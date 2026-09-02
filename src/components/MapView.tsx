import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import type { Bar } from '../data/types';
import { FACULTY_COLOR, DEFAULT_CENTER } from '../data/bars';
import { barStatus } from '../lib/hours';
import type { LatLng } from '../lib/geo';
import { logoUrl } from './ui';

// OSM-standardfliser virker uden API-noegle. Moerkt tema laves med et CSS-filter i stedet.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function applyTheme(container: HTMLElement) {
  const dark = document.documentElement.dataset.theme === 'dark';
  container.classList.toggle('is-dark', dark);
}

export interface MapViewProps {
  bars: Bar[];
  now: Date;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Kaldes når man trykker et sted på kortet (bruges til at sætte position manuelt). */
  onMapClick?: (p: LatLng) => void;
  /** Rutepunkter (lat,lng) der tegnes som streg. */
  route?: [number, number][] | null;
  /** Numre på markørerne, fx rækkefølgen i en tur. */
  numbers?: Record<string, number>;
  userPos?: LatLng | null;
  /** Andre deltagere der deler position i en live-session. */
  people?: { id: string; name: string; emoji: string; lat: number; lng: number; stale?: boolean }[];
  className?: string;
  fitKey?: string;
  interactive?: boolean;
}

export function MapView({ bars, now, selectedId, onSelect, onMapClick, route, numbers, userPos, people, className, fitKey, interactive = true }: MapViewProps) {
  // Kortet oprettes kun én gang, så klik-handlerne læses gennem en ref.
  const cb = useRef({ onSelect, onMapClick });
  cb.current = { onSelect, onMapClick };
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const layer = useRef<L.LayerGroup | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const me = useRef<L.Marker | null>(null);
  const peopleLayer = useRef<L.LayerGroup | null>(null);
  const lastFit = useRef<string>('');

  // Opret kortet én gang.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
    });
    tiles.current = L.tileLayer(TILE_URL, { attribution: ATTR, maxZoom: 19 }).addTo(m);
    applyTheme(m.getContainer());
    if (interactive) L.control.zoom({ position: 'topright' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    peopleLayer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => {
      if (cb.current.onMapClick) cb.current.onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      else cb.current.onSelect?.(null);
    });
    map.current = m;
    setTimeout(() => m.invalidateSize(), 60);
    return () => { m.remove(); map.current = null; markers.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skift kortets tema sammen med appens.
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const c = map.current?.getContainer();
      if (c) applyTheme(c);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // Markører.
  useEffect(() => {
    const m = map.current, lg = layer.current;
    if (!m || !lg) return;
    lg.clearLayers();
    markers.current.clear();

    for (const bar of bars) {
      const st = barStatus(bar, now);
      const n = numbers?.[bar.id];
      const color = n ? '#1f3a2c' : st.open ? '#2e9d5b' : FACULTY_COLOR[bar.faculty] || '#7d8a84';
      const html =
        `<div class="mk${st.open ? ' mk--open' : ''}" style="--mk:${color}">` +
        `<img src="${logoUrl(bar)}" alt="" />` +
        (n ? `<span class="mk__n">${n}</span>` : '') +
        `</div>`;
      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -16],
      });
      const mk = L.marker([bar.lat, bar.lng], {
        icon,
        zIndexOffset: n ? 1000 : st.open ? 500 : 0,
        title: bar.name,
      });
      mk.on('click', (e) => { L.DomEvent.stopPropagation(e as unknown as Event); onSelect?.(bar.id); });
      mk.addTo(lg);
      markers.current.set(bar.id, mk);
    }
  }, [bars, now, numbers, onSelect]);

  // Rutestreg.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    line.current?.remove();
    line.current = null;
    if (route && route.length > 1) {
      line.current = L.polyline(route, {
        color: '#1f3a2c',
        weight: 5,
        opacity: .85,
        dashArray: '1 10',
        lineCap: 'round',
      }).addTo(m);
    }
  }, [route]);

  // Brugerens position.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    me.current?.remove();
    me.current = null;
    if (userPos) {
      me.current = L.marker([userPos.lat, userPos.lng], {
        icon: L.divIcon({ html: '<div class="mk-me"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] }),
        zIndexOffset: 2000,
        interactive: false,
      }).addTo(m);
    }
  }, [userPos]);

  // Deltagere der deler position.
  useEffect(() => {
    const lg = peopleLayer.current;
    if (!lg) return;
    lg.clearLayers();
    for (const p of people || []) {
      const icon = L.divIcon({
        html: `<div class="mk-person${p.stale ? ' is-stale' : ''}"><span>${p.emoji}</span><b>${p.name}</b></div>`,
        className: '',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([p.lat, p.lng], { icon, zIndexOffset: 1500, interactive: false }).addTo(lg);
    }
  }, [people]);

  // Zoom så alt er synligt (kun når nøglen ændrer sig).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const key = fitKey ?? bars.map((b) => b.id).join(',');
    if (key === lastFit.current || !bars.length) return;
    lastFit.current = key;
    const pts: L.LatLngExpression[] = bars.map((b) => [b.lat, b.lng]);
    if (userPos && bars.length < 4) pts.push([userPos.lat, userPos.lng]);
    if (pts.length === 1) m.setView(pts[0], 16);
    else m.fitBounds(L.latLngBounds(pts).pad(0.18), { animate: true });
  }, [bars, fitKey, userPos]);

  // Zoom til valgt bar.
  useEffect(() => {
    const m = map.current;
    if (!m || !selectedId) return;
    const bar = bars.find((b) => b.id === selectedId);
    if (bar) m.panTo([bar.lat, bar.lng], { animate: true });
  }, [selectedId, bars]);

  return <div ref={el} className={'map ' + (className || 'map--full')} />;
}
