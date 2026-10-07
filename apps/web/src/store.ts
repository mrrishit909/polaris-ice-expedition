import { useSyncExternalStore } from "react";
import type { Weights } from "@polaris/schemas";
import { DEFAULT_DEPART } from "@polaris/domain";
import type { Layer } from "./data";
export type View = "map" | "ice" | "weather" | "rovers" | "satellite" | "routes";
export const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: "map", label: "Map", blurb: "Routes, camps, rovers" }, { id: "ice", label: "Ice", blurb: "Thickness and risk" }, { id: "weather", label: "Weather", blurb: "The front, hour by hour" },
  { id: "rovers", label: "Rovers", blurb: "Telemetry and replay" }, { id: "satellite", label: "Satellite", blurb: "Passes and retrievals" }, { id: "routes", label: "Routes", blurb: "Compare candidates" },
];
export type Cam = "auto" | "map" | "oblique" | "rover";
export type State = {
  view: View; layer: Layer; overlayRisk: boolean; showStorm: boolean; hour: number; playing: boolean; selCell: [number, number] | null; selVehicle: string; routeA: string; routeB: string; custom: Weights; departHour: number; activeRoute: string;
  selPass: string; showDiff: boolean; replay: { on: boolean; f: number }; cam: Cam; fly: string | null; live: boolean; introDone: boolean; introFx: boolean; introStep: number; reduced: boolean; pauseMotion: boolean; gfx: "webgl" | "poster";
};
export const state: State = { view: "map", layer: "thickness", overlayRisk: false, showStorm: true, hour: 14, playing: false, selCell: null, selVehicle: "R1", routeA: "direct", routeB: "safe", custom: { risk: 0.5, support: 0.5 }, departHour: DEFAULT_DEPART, activeRoute: "safe", selPass: "P1", showDiff: false, replay: { on: false, f: 0 }, cam: "auto", fly: null, live: false, introDone: false, introFx: false, introStep: 0, reduced: false, pauseMotion: false, gfx: "webgl" };
/** Per-frame values the intro and the canvas read; not reactive. */
export const live = { fog: 0.02, night: 1, snow: 0.3, headlights: 1, roverS: 0, crack: 1, crackFrom: 0, routeGlow: 1, aurora: 0.6, camT: 3, flyT: 0, shake: 0, draw: 1, nav: 1, introRover: 0 };
let snap = { ...state }; const subs = new Set<() => void>();
export function set(p: Partial<State>) { Object.assign(state, p); snap = { ...state }; subs.forEach((f) => f()); }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap, () => snap);
