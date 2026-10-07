// A previous expedition (2025), planned over that year's ice, and what changed on its path since.
import type { Route } from "@polaris/schemas";
import { CAMPS, iceField, riskGrid, thicknessAt, type Ice } from "./grid.ts";
import { CANDIDATES, along, lengthOf, plan } from "./route.ts";
export const PREVIOUS_START = "2025-03-10T06:00:00Z", PREVIOUS_SPEED_KMH = 11;
export function previousExpedition() {
  const ice = iceField(2025), risk = riskGrid(ice), a = CAMPS[0], d = CAMPS[4], r = plan(ice, risk, CANDIDATES[2], [a.x, a.y], [d.x, d.y])!; return { ice, risk, route: { ...r.route, id: "2025", name: "Expedition 2025" } as Route, metrics: r.metrics };
}
/** Position of the 2025 convoy at a fraction 0..1 of its journey, with the date. */
export function replayAt(route: Route, fraction: number) { const total = lengthOf(route.points), s = Math.max(0, Math.min(1, fraction)) * total, p = along(route.points, s); return { ...p, km: s, at: new Date(Date.parse(PREVIOUS_START) + (s / PREVIOUS_SPEED_KMH) * 3600_000).toISOString() }; }
/** Mean thickness change (cm, now minus then) along a path, sampled every 5 km. */
export function thicknessChange(route: Route, then: Ice, now: Ice) { const total = lengthOf(route.points); let sum = 0, n = 0; for (let s = 0; s <= total; s += 5) { const p = along(route.points, s); sum += thicknessAt(now, p.x, p.y) - thicknessAt(then, p.x, p.y); n++; } return n ? sum / n : 0; }
