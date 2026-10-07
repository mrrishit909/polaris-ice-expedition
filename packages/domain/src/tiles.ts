// Ice tiles: every tile is 10 x 6 cells so a response is always bounded. z0 is one tile (4x4 aggregation), z1 is 2x2 tiles (2x2 aggregation), z2 is 4x4 tiles of raw cells.
import { NX, NY, idx, type Ice } from "./grid.ts";
export const TILE_COLS = 10, TILE_ROWS = 6, MAX_Z = 2;
export function tile(ice: Ice, risk: Float32Array, z: number, tx: number, ty: number) {
  if (!Number.isInteger(z) || z < 0 || z > MAX_Z) throw new RangeError(`z must be 0 to ${MAX_Z}`); const n = 2 ** z; if (!Number.isInteger(tx) || !Number.isInteger(ty) || tx < 0 || ty < 0 || tx >= n || ty >= n) throw new RangeError(`x and y must be 0 to ${n - 1} at z${z}`);
  const f = 2 ** (MAX_Z - z), thickness: number[] = [], concentration: number[] = [], r: number[] = [], confidence: number[] = [], span = (TILE_COLS * f), spanY = (TILE_ROWS * f);
  for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_COLS; i++) { let t = 0, c = 0, rk = 0, cf = 0, m = 0; for (let b = 0; b < f; b++) for (let a = 0; a < f; a++) { const ci = tx * span + i * f + a, cj = ty * spanY + j * f + b; if (ci < NX && cj < NY) { const k = idx(ci, cj); t += ice.thickness[k]; c += ice.concentration[k]; rk += risk[k]; cf += ice.confidence[k]; m++; } } thickness.push(Math.round((t / m) * 10) / 10); concentration.push(Math.round((c / m) * 100) / 100); r.push(Math.round((rk / m) * 100) / 100); confidence.push(Math.round((cf / m) * 100) / 100); }
  return { z, x: tx, y: ty, cols: TILE_COLS, rows: TILE_ROWS, cellKm: 5 * f, originKm: [tx * span * 5, ty * spanY * 5] as [number, number], thicknessCm: thickness, concentration, risk: r, confidence };
}
