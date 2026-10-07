// Deterministic synthetic data: camps, the ice grid and its risk, the weather series, three planned routes and the rover telemetry. Run: node data/simulators/generate.ts
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { CAMPS, CANDIDATES, HOURS, NX, NY, PASSES, VEHICLES, iceField, plan, previousExpedition, riskGrid, series, simulateVehicle, DEFAULT_DEPART } from "../../packages/domain/src/index.ts";
const root = new URL("../../", import.meta.url).pathname, out = root + "data/generated/";
mkdirSync(out, { recursive: true });
const ice = iceField(), risk = riskGrid(ice), a = CAMPS[0], d = CAMPS[4], r1 = (x: number) => Math.round(x * 10) / 10, r2 = (x: number) => Math.round(x * 100) / 100;
const routes = CANDIDATES.map((c) => plan(ice, risk, c, [a.x, a.y], [d.x, d.y], DEFAULT_DEPART)!), byId = Object.fromEntries(routes.map((r) => [r.route.id, r.route]));
writeFileSync(out + "ice.json", JSON.stringify({ nx: NX, ny: NY, cellKm: 5, thickness: Array.from(ice.thickness, r1), concentration: Array.from(ice.concentration, r2), confidence: Array.from(ice.confidence, r2) }));
writeFileSync(out + "camps.json", JSON.stringify(CAMPS)); writeFileSync(out + "weather.json", JSON.stringify(series(100, 60)));
writeFileSync(out + "routes.json", JSON.stringify(routes.map((r) => ({ ...r.route, metrics: r.metrics })))); writeFileSync(out + "passes.json", JSON.stringify(PASSES));
writeFileSync(out + "vehicles.json", JSON.stringify(VEHICLES.map((v) => ({ ...v, samples: simulateVehicle(v, byId[v.routeId], ice, risk).map((s) => [s.hour, s.x, s.y, s.headingDeg, s.speedKmh, s.fuelPct, s.tempC, s.status]) }))));
const prev = previousExpedition(); writeFileSync(out + "previous.json", JSON.stringify({ route: prev.route, metrics: prev.metrics, thickness: Array.from(prev.ice.thickness, r1) }));
cpSync(root + "model/exports/analysis.json", out + "model.json");
console.log("generated", routes.length, "routes,", VEHICLES.length, "vehicles,", HOURS, "hours");
