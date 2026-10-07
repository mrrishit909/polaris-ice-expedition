// Synthetic rover telemetry: each rover follows a planned route from its departure hour, slows with risk and storm, holds in a storm, refuels at camps and depots.
import type { Route, TelemetrySample, Vehicle } from "@polaris/schemas";
import { CAMPS, HMIN_CM, cellOf, idx, thicknessAt, type Ice } from "./grid.ts";
import { BASE_SPEED_KMH, FUEL_CAPACITY_L, FUEL_L_PER_KM, along, lengthOf } from "./route.ts";
import { HOURS, atHour, stormAt, weatherAt } from "./weather.ts";
export const VEHICLES: Vehicle[] = [{ id: "R1", name: "Skua", routeId: "safe", departHour: 14, color: "#78E6B5" }, { id: "R2", name: "Petrel", routeId: "supported", departHour: 22, color: "#7CC7D9" }, { id: "R3", name: "Narwhal", routeId: "direct", departHour: 26, color: "#9F8BEA" }];
export const STEP_H = 1 / 6, REFUEL_BELOW = 0.25, IDLE_L_PER_H = 2;
export function simulateVehicle(v: Vehicle, route: Route, ice: Ice, risk: Float32Array): TelemetrySample[] {
  const out: TelemetrySample[] = [], total = lengthOf(route.points); let s = 0, fuel = FUEL_CAPACITY_L * 0.95, refuelLeft = 0, refuelled = false, last = { x: route.points[0][0], y: route.points[0][1], headingDeg: 0 };
  for (let k = 0; k <= Math.round(HOURS / STEP_H); k++) {
    const t = k * STEP_H; let pos = along(route.points, s), speed = 0, status: TelemetrySample["status"] = "Holding", st = stormAt(pos.x, pos.y, t);
    if (t < v.departHour) status = "Holding";
    else if (s >= total - 1e-6) status = "Arrived";
    else if (refuelLeft > 0) { status = "Refuel"; refuelLeft--; if (refuelLeft === 0) fuel = FUEL_CAPACITY_L * 0.95; }
    else if (st > 0.65) { status = "Holding"; fuel -= IDLE_L_PER_H * STEP_H; }
    else if (fuel < FUEL_CAPACITY_L * REFUEL_BELOW && !refuelled && CAMPS.some((c) => Math.hypot(c.x - pos.x, c.y - pos.y) < 8)) { refuelled = true; refuelLeft = 3; status = "Refuel"; }
    else { const r = risk[idx(...cellOf(pos.x, pos.y))]; speed = BASE_SPEED_KMH * (1 - 0.55 * r) * (1 - 0.7 * st); const ds = Math.min(total - s, speed * STEP_H); s += ds; fuel = Math.max(0, fuel - ds * FUEL_L_PER_KM * (1 + 0.6 * r) * (1 + 0.3 * st)); pos = along(route.points, s); status = thicknessAt(ice, pos.x, pos.y) < HMIN_CM * 1.1 ? "Caution" : "Moving"; }
    if (pos.x !== last.x || pos.y !== last.y) last = pos; else pos = { ...pos, headingDeg: last.headingDeg };
    out.push({ vehicleId: v.id, hour: Math.round(t * 1000) / 1000, at: atHour(t), x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100, headingDeg: Math.round(pos.headingDeg), speedKmh: Math.round(speed * 10) / 10, fuelPct: Math.round((fuel / FUEL_CAPACITY_L) * 1000) / 10, tempC: weatherAt(pos.x, pos.y, t).tempC, status });
  }
  return out;
}
export const sampleAt = (samples: TelemetrySample[], hour: number) => samples[Math.max(0, Math.min(samples.length - 1, Math.round(hour / STEP_H)))];
/** Telemetry is paged: from/to are hours, limit and cursor are sample counts. */
export function page(samples: TelemetrySample[], from = 0, to = HOURS, limit = 100, cursor = 0) { const rows = samples.filter((q) => q.hour >= from && q.hour <= to), items = rows.slice(cursor, cursor + limit); return { total: rows.length, items, nextCursor: cursor + limit < rows.length ? cursor + limit : null }; }
