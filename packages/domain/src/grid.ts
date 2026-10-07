// A synthetic sea-ice region: 200 km x 120 km in 5 km cells. x is east, y is north, in kilometres. Thickness, concentration and confidence are generated, not observed.
import type { Camp } from "@polaris/schemas";
import { mulberry32 } from "./rng.ts";
export const NX = 40, NY = 24, CELL = 5, W_KM = NX * CELL, H_KM = NY * CELL;
export const ROVER_MASS_T = 6.5;
/** A simplified, invented bearing rule for the demo's rover: minimum safe thickness in cm. NOT guidance for real ice travel. */
export const HMIN_CM = 12 * Math.sqrt(ROVER_MASS_T);
export const CAMPS: Camp[] = [
  { id: "A", name: "Base Camp A", x: 20, y: 20, kind: "camp" }, { id: "B", name: "Camp B", x: 66, y: 16, kind: "camp" }, { id: "C", name: "Camp C", x: 138, y: 40, kind: "camp" },
  { id: "F1", name: "Fuel cache F1", x: 152, y: 72, kind: "depot" }, { id: "D", name: "Station D", x: 178, y: 98, kind: "station" },
];
export type Ice = { thickness: Float32Array; concentration: Float32Array; confidence: Float32Array };
export const idx = (i: number, j: number) => j * NX + i;
export const cellOf = (x: number, y: number): [number, number] => [Math.max(0, Math.min(NX - 1, Math.floor(x / CELL))), Math.max(0, Math.min(NY - 1, Math.floor(y / CELL)))];
export const centerOf = (i: number, j: number): [number, number] => [(i + 0.5) * CELL, (j + 0.5) * CELL];
const smooth = (t: number) => t * t * (3 - 2 * t);
function valueNoise(seed: number, scale: number) { const r = mulberry32(seed), n = 64, g = Array.from({ length: n * n }, () => r()); const at = (x: number, y: number) => { const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0), q = (a: number, b: number) => g[(((b % n) + n) % n) * n + (((a % n) + n) % n)]; return (q(x0, y0) * (1 - tx) + q(x0 + 1, y0) * tx) * (1 - ty) + (q(x0, y0 + 1) * (1 - tx) + q(x0 + 1, y0 + 1) * tx) * ty; }; return at; }
/** The year shifts the lead and the polynya a little, so a previous year's ice differs from this year's. */
export function iceField(year = 2026): Ice {
  const n1 = valueNoise(11 + year, 4), n2 = valueNoise(97 + year, 9), thickness = new Float32Array(NX * NY), concentration = new Float32Array(NX * NY), confidence = new Float32Array(NX * NY), shift = (year - 2026) * 3;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const [x, y] = centerOf(i, j), coast = smooth(Math.max(0, Math.min(1, (-x * 0.35 + y * 0.9 + 20) / 110)));
    const ld = (y - (70 - 0.25 * x + shift)) / Math.sqrt(1 + 0.0625), bridge = 1 - 0.85 * Math.exp(-(((x - 152) / 13) ** 2)), lead = Math.exp(-((ld / 8) ** 2)) * bridge, poly = Math.exp(-(((x - 110) ** 2 + (y - 55 - shift) ** 2) / 12 ** 2));
    const base = 70 + 46 * coast - 64 * lead - 80 * poly + (n1(x, y) - 0.5) * 24 + (n2(x, y) - 0.5) * 14; thickness[idx(i, j)] = Math.max(0, base);
    concentration[idx(i, j)] = Math.max(0, Math.min(1, 0.97 - 0.45 * lead - 0.95 * poly + (n2(x + 30, y) - 0.5) * 0.06)); confidence[idx(i, j)] = Math.max(0.25, Math.min(0.97, 0.9 - 0.25 * lead - 0.25 * poly + (n1(x, y + 40) - 0.5) * 0.12));
  }
  if (year < 2026) for (let k = 0; k < thickness.length; k++) thickness[k] += 6 * (2026 - year);   // earlier ice was thicker
  return { thickness, concentration, confidence };
}
/** Bilinear thickness at a point (cm). */
export function thicknessAt(ice: Ice, x: number, y: number) { const fx = Math.max(0, Math.min(NX - 1.001, x / CELL - 0.5)), fy = Math.max(0, Math.min(NY - 1.001, y / CELL - 0.5)), i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, t = ice.thickness; return (t[idx(i, j)] * (1 - tx) + t[idx(i + 1, j)] * tx) * (1 - ty) + (t[idx(i, j + 1)] * (1 - tx) + t[idx(i + 1, j + 1)] * tx) * ty; }
/** Risk 0..1 of travelling on a cell: thin ice for the rover's mass, or open water. */
export function cellRisk(thicknessCm: number, concentration: number): number {
  const rt = Math.max(0, Math.min(1, (1.8 * HMIN_CM - thicknessCm) / (1.8 * HMIN_CM - 0.7 * HMIN_CM))), rc = 0.7 * Math.max(0, Math.min(1, (0.85 - concentration) / 0.4));
  return 1 - (1 - smooth(rt)) * (1 - rc);
}
export const riskGrid = (ice: Ice): Float32Array => Float32Array.from(ice.thickness, (t, k) => cellRisk(t, ice.concentration[k]));
export const sector = (i: number, j: number) => `${"ABCD"[Math.min(3, Math.floor(i / 10))]}${Math.min(2, Math.floor(j / 8)) + 1}`;
/** Mean thickness, mean risk and the share of cells above the safe thickness, by 50 km sector (A1 to D3). */
export function sectors(ice: Ice, risk: Float32Array) { const acc = new Map<string, { n: number; t: number; r: number; thin: number }>(); for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const s = sector(i, j), a = acc.get(s) ?? { n: 0, t: 0, r: 0, thin: 0 }; a.n++; a.t += ice.thickness[idx(i, j)]; a.r += risk[idx(i, j)]; if (ice.thickness[idx(i, j)] < HMIN_CM) a.thin++; acc.set(s, a); } return [...acc.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, a]) => ({ id, meanThicknessCm: a.t / a.n, meanRisk: a.r / a.n, thinShare: a.thin / a.n })); }
