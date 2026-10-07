// Synthetic satellite passes and thickness retrievals: each sensor sees part of the region with its own noise, cloud blocks the optical one.
import type { Pass } from "@polaris/schemas";
import { CELL, NX, NY, centerOf, idx, type Ice } from "./grid.ts";
import { atHour } from "./weather.ts";
import { mulberry32 } from "./rng.ts";
const P = (id: string, sensor: Pass["sensor"], label: string, hour: number, swath: Pass["swath"], cloud: number, resolutionKm: number): Pass => ({ id, sensor, label, hour, at: atHour(hour), swath, cloud, resolutionKm });
export const PASSES: Pass[] = [
  P("P1", "SAR", "SAR C-band (synthetic)", 4, { x0: 0, y0: 0, x1: 120, y1: 60 }, 0, 5), P("P2", "Optical", "Optical (synthetic)", 10, { x0: 40, y0: 30, x1: 160, y1: 90 }, 0.15, 5), P("P3", "Microwave", "Passive microwave (synthetic)", 16, { x0: 0, y0: 0, x1: 200, y1: 120 }, 0, 25),
  P("P4", "SAR", "SAR C-band (synthetic)", 28, { x0: 60, y0: 40, x1: 200, y1: 120 }, 0, 5), P("P5", "Optical", "Optical (synthetic)", 40, { x0: 0, y0: 40, x1: 100, y1: 120 }, 0.7, 5), P("P6", "SAR", "SAR C-band (synthetic)", 58, { x0: 80, y0: 0, x1: 200, y1: 80 }, 0, 5),
];
export const sigmaOf = (p: Pass) => (p.sensor === "SAR" ? 4 : p.sensor === "Microwave" ? 9 : 3 + 25 * p.cloud);
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) * Math.sqrt(3);
export type Observed = { i: number; j: number; observedCm: number | null; modelCm: number; confidence: number };
export function observe(p: Pass, ice: Ice) {
  const rnd = mulberry32(p.id.charCodeAt(1) * 7919), cells: Observed[] = [], sig = sigmaOf(p), block = Math.round(p.resolutionKm / CELL), blockMean = new Map<string, number>();
  const inSwath = (x: number, y: number) => x >= p.swath.x0 && x <= p.swath.x1 && y >= p.swath.y0 && y <= p.swath.y1;
  if (block > 1) for (let j = 0; j < NY; j += block) for (let i = 0; i < NX; i += block) { let s = 0, n = 0; for (let b = 0; b < block; b++) for (let a = 0; a < block; a++) if (i + a < NX && j + b < NY) { s += ice.thickness[idx(i + a, j + b)]; n++; } blockMean.set(`${i}:${j}`, s / n); }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const [x, y] = centerOf(i, j); if (!inSwath(x, y)) continue; const truth = ice.thickness[idx(i, j)], base = block > 1 ? blockMean.get(`${Math.floor(i / block) * block}:${Math.floor(j / block) * block}`)! : truth, clouded = p.sensor === "Optical" && rnd() < p.cloud, obs = clouded ? null : Math.max(0, base + gauss(rnd) * sig);
    cells.push({ i, j, observedCm: obs, modelCm: truth, confidence: obs === null ? 0 : Math.max(0.1, Math.min(0.98, 1 - sig / 40)) }); }
  const seen = cells.filter((c) => c.observedCm !== null), err = seen.map((c) => c.observedCm! - c.modelCm);
  return { cells, seen: seen.length, cloudedCells: cells.length - seen.length, meanAbsErrorCm: err.length ? err.reduce((a, e) => a + Math.abs(e), 0) / err.length : 0, biasCm: err.length ? err.reduce((a, e) => a + e, 0) / err.length : 0, sigmaCm: sig };
}
