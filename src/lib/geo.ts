export interface LatLng { lat: number; lng: number }

const R = 6371000;

export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Gåafstand: fugleflugt × 1,25 (gader er ikke lige). */
export function walkMeters(a: LatLng, b: LatLng): number {
  return haversine(a, b) * 1.25;
}

/** Gåtid i minutter ved ~4,8 km/t. */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

export function fmtDistance(m: number): string {
  if (m < 950) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Nærmeste-nabo + 2-opt. Returnerer ny rækkefølge (indekser). */
export function optimizeOrder(points: LatLng[], lockFirst = false, start?: LatLng | null): number[] {
  const n = points.length;
  if (n <= 2) return points.map((_, i) => i);
  const dist = (i: number, j: number) => haversine(points[i], points[j]);

  let order: number[] = [];
  const used = new Array(n).fill(false);
  let cur = 0;
  if (!lockFirst && start) {
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const d = haversine(start, points[i]);
      if (d < best) { best = d; cur = i; }
    }
  }
  order.push(cur); used[cur] = true;
  while (order.length < n) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < n; i++) if (!used[i] && dist(cur, i) < bd) { bd = dist(cur, i); best = i; }
    order.push(best); used[best] = true; cur = best;
  }

  const total = (o: number[]) => { let s = 0; for (let i = 1; i < o.length; i++) s += dist(o[i - 1], o[i]); return s; };
  let improved = true;
  const first = lockFirst ? 1 : 0;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = first; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const cand = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        if (total(cand) + 1e-6 < total(order)) { order = cand; improved = true; }
      }
    }
  }
  return order;
}

export interface RouteResult {
  coords: [number, number][];
  meters: number;
  seconds: number;
  legs: { meters: number; seconds: number }[];
}

/** Rigtig gårute via OSRM (fod-profil). Returnerer null hvis netværket fejler – så bruges lige linjer. */
export async function fetchWalkingRoute(points: LatLng[]): Promise<RouteResult | null> {
  if (points.length < 2) return null;
  const coordStr = points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coordStr}?overview=full&geometries=geojson&steps=false`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      coords: route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
      meters: route.distance,
      seconds: route.duration,
      legs: route.legs.map((l: { distance: number; duration: number }) => ({ meters: l.distance, seconds: l.duration })),
    };
  } catch {
    return null;
  }
}

export function googleMapsDirections(to: LatLng, from?: LatLng | null): string {
  const dest = `${to.lat},${to.lng}`;
  const origin = from ? `&origin=${from.lat},${from.lng}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=walking`;
}
