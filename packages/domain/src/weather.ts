// Synthetic weather: a storm front that crosses the region from the north-west to the south-east over 72 hours, and the hourly series at a point.
import type { WeatherHour } from "@polaris/schemas";
export const HOURS = 72, START = "2026-03-14T00:00:00Z";
const U = [0.8, -0.6] as const, FRONT_V = 4.0, FRONT_S0 = -140, FRONT_SIGMA = 18;
export const frontPos = (hour: number) => FRONT_S0 + FRONT_V * hour;            // km along the direction of travel, 0 at the region's centre
export const project = (x: number, y: number) => (x - 100) * U[0] + (y - 60) * U[1];
/** Storm intensity 0..1 at a point and hour. */
export const stormAt = (x: number, y: number, hour: number) => Math.exp(-(((project(x, y) - frontPos(hour)) / FRONT_SIGMA) ** 2));
export const atHour = (h: number) => new Date(Date.parse(START) + h * 3600_000).toISOString();
export const weatherAt = (x: number, y: number, hour: number): WeatherHour => { const s = stormAt(x, y, hour), diurnal = 4 * Math.sin(((hour - 9) / 24) * 2 * Math.PI); return { hour, at: atHour(hour), tempC: Math.round((-26 + diurnal + 5 * s + 0.04 * hour) * 10) / 10, windMs: Math.round((5 + 20 * s + 2 * Math.sin(hour / 3)) * 10) / 10, visibilityKm: Math.round((26 - 23 * s) * 10) / 10, storm: Math.round(s * 100) / 100 }; };
export const series = (x: number, y: number): WeatherHour[] => Array.from({ length: HOURS }, (_, h) => weatherAt(x, y, h));
/** The hour the front's centre passes a point. */
export const arrivalHour = (x: number, y: number) => (project(x, y) - FRONT_S0) / FRONT_V;
export const FRONT = { dirX: U[0], dirY: U[1], speedKmh: FRONT_V, sigmaKm: FRONT_SIGMA };
