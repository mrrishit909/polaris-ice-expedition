// Route planning over the ice grid (A* with risk and support-access penalties) and the metrics that compare candidate routes.
import type { Camp, Route, RouteMetrics, Weights } from "@polaris/schemas";
import { CAMPS, CELL, HMIN_CM, NX, NY, idx, cellOf, centerOf, thicknessAt, type Ice } from "./grid.ts";
import { stormAt } from "./weather.ts";
export const DEFAULT_DEPART = 20;
export const BASE_SPEED_KMH = 14, FUEL_L_PER_KM = 0.9, FUEL_CAPACITY_L = 400, SUPPORT_RADIUS_KM = 22, BLOCK_RISK = 0.97;
export const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Support access of a point: 1 within the radius of a camp or depot, falling to 0 at twice the radius. */
export const supportAt = (x: number, y: number, camps: Camp[] = CAMPS) => { const d = Math.min(...camps.map((c) => Math.hypot(c.x - x, c.y - y))); return d <= SUPPORT_RADIUS_KM ? 1 : Math.max(0, 1 - (d - SUPPORT_RADIUS_KM) / SUPPORT_RADIUS_KM); };
export const CANDIDATES: { id: string; name: string; weights: Weights; blurb: string }[] = [
  { id: "direct", name: "Direct", weights: { risk: 0, support: 0 }, blurb: "Shortest line that avoids open water." },
  { id: "safe", name: "Safe ice", weights: { risk: 1, support: 0 }, blurb: "Pays distance to stay on thick ice." },
  { id: "supported", name: "Supported", weights: { risk: 0.5, support: 1 }, blurb: "Stays within reach of camps and fuel." },
];
const NB: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
/** The cheapest path between two points as a polyline of cell centres (with the exact endpoints). Weights are 0..1. Returns null when the water cannot be crossed. */
export function planRoute(risk: Float32Array, from: [number, number], to: [number, number], w: Weights, camps: Camp[] = CAMPS): [number, number][] | null {
  const [si, sj] = cellOf(...from), [ti, tj] = cellOf(...to), N = NX * NY, g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), open = new Set<number>(), closed = new Uint8Array(N);
  const h = (i: number, j: number) => Math.hypot(i - ti, j - tj) * CELL, sup = (i: number, j: number) => { const [x, y] = centerOf(i, j); return supportAt(x, y, camps); };
  const s = idx(si, sj); g[s] = 0; open.add(s); const f = new Float64Array(N).fill(Infinity); f[s] = h(si, sj);
  while (open.size) {
    let cur = -1, best = Infinity; for (const k of open) if (f[k] < best) { best = f[k]; cur = k; } open.delete(cur); closed[cur] = 1; const ci = cur % NX, cj = Math.floor(cur / NX);
    if (ci === ti && cj === tj) break;
    for (const [dx, dy] of NB) { const ni = ci + dx, nj = cj + dy; if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue; const k = idx(ni, nj); if (closed[k] || risk[k] >= BLOCK_RISK) continue;
      const len = Math.hypot(dx, dy) * CELL, r = (risk[k] + risk[cur]) / 2, pen = 1 + w.risk * 8 * r * r + w.support * 1.5 * (1 - (sup(ni, nj) + sup(ci, cj)) / 2), t = g[cur] + len * pen; if (t < g[k]) { g[k] = t; prev[k] = cur; f[k] = t + h(ni, nj); open.add(k); } }
  }
  const t = idx(ti, tj); if (!isFinite(g[t])) return null; const path: [number, number][] = []; for (let k = t; k >= 0; k = prev[k]) path.push(centerOf(k % NX, Math.floor(k / NX))); path.reverse(); path[0] = from; path[path.length - 1] = to; return path;
}
/** Walk a route from a departure hour; the rover slows with risk and storm. Samples every km. */
export function evalRoute(route: [number, number][], ice: Ice, risk: Float32Array, departHour = 0, camps: Camp[] = CAMPS): RouteMetrics {
  let d = 0, t = departHour, fuel = 0, storm = 0, maxR = 0, sumR = 0, n = 0, minT = Infinity, thin = 0, inThin = false, supD = 0;
  for (let k = 1; k < route.length; k++) {
    const a = route[k - 1], b = route[k], len = dist(a, b), steps = Math.max(1, Math.round(len));
    for (let s = 0; s < steps; s++) { const u = (s + 0.5) / steps, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, [i, j] = cellOf(x, y), r = risk[idx(i, j)], st = stormAt(x, y, t), seg = len / steps, sp = BASE_SPEED_KMH * (1 - 0.55 * r) * (1 - 0.7 * st), dt = seg / sp;
      d += seg; t += dt; fuel += seg * FUEL_L_PER_KM * (1 + 0.6 * r) * (1 + 0.3 * st); if (supportAt(x, y, camps) >= 1) supD += seg; if (st > 0.35) storm += dt; maxR = Math.max(maxR, r); sumR += r; n++; minT = Math.min(minT, thicknessAt(ice, x, y)); const th = thicknessAt(ice, x, y) < HMIN_CM; if (th && !inThin) thin++; inThin = th; }
  }
  return { distanceKm: d, meanRisk: n ? sumR / n : 0, maxRisk: maxR, minThicknessCm: isFinite(minT) ? minT : 0, etaH: t - departHour, fuelL: fuel, supportPct: d ? supD / d : 0, stormExposureH: storm, thinCrossings: thin };
}
export const plan = (ice: Ice, risk: Float32Array, c: { id: string; name: string; weights: Weights }, from: [number, number], to: [number, number], departHour = 0): { route: Route; metrics: RouteMetrics } | null => { const pts = planRoute(risk, from, to, c.weights); return pts ? { route: { id: c.id, name: c.name, points: pts, weights: c.weights }, metrics: evalRoute(pts, ice, risk, departHour) } : null; };
/** Point along a polyline at distance s (km), with the heading in degrees clockwise from north. */
export function along(route: [number, number][], s: number): { x: number; y: number; headingDeg: number } {
  let acc = 0; for (let k = 1; k < route.length; k++) { const len = dist(route[k - 1], route[k]); if (acc + len >= s || k === route.length - 1) { const u = len ? Math.max(0, Math.min(1, (s - acc) / len)) : 0, a = route[k - 1], b = route[k]; return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, headingDeg: (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI }; } acc += len; }
  const l = route[route.length - 1]; return { x: l[0], y: l[1], headingDeg: 0 };
}
export const lengthOf = (route: [number, number][]) => route.reduce((a, p, k) => (k ? a + dist(route[k - 1], p) : 0), 0);
