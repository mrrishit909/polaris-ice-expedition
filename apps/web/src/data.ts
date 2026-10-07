import type { Camp, Pass, Route, RouteMetrics, TelemetrySample, Vehicle, WeatherHour } from "@polaris/schemas";
import { NX, NY, riskGrid, type Ice } from "@polaris/domain";
export type RouteRow = Route & { metrics: RouteMetrics };
export type VehicleData = Vehicle & { samples: TelemetrySample[] };
export type Data = { ice: Ice; risk: Float32Array; camps: Camp[]; weather: WeatherHour[]; routes: RouteRow[]; passes: Pass[]; vehicles: VehicleData[]; previous: { route: Route; metrics: RouteMetrics; thickness: Float32Array }; model: { rover: { bounds: number[][] }; chunk: { size: number } } };
export const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type Packed = (Vehicle & { samples: [number, number, number, number, number, number, number, TelemetrySample["status"]][] })[];
export async function loadData(): Promise<Data> {
  const g = async <T,>(n: string) => (await fetch(`${base}/data/${n}.json`)).json() as Promise<T>;
  const [i, camps, weather, routes, passes, veh, prev, model] = await Promise.all([g<{ thickness: number[]; concentration: number[]; confidence: number[] }>("ice"), g<Camp[]>("camps"), g<WeatherHour[]>("weather"), g<RouteRow[]>("routes"), g<Pass[]>("passes"), g<Packed>("vehicles"), g<{ route: Route; metrics: RouteMetrics; thickness: number[] }>("previous"), g<Data["model"]>("model")]);
  const ice: Ice = { thickness: Float32Array.from(i.thickness), concentration: Float32Array.from(i.concentration), confidence: Float32Array.from(i.confidence) };
  const vehicles = veh.map((v) => ({ ...v, samples: v.samples.map((s) => ({ vehicleId: v.id, hour: s[0], at: "", x: s[1], y: s[2], headingDeg: s[3], speedKmh: s[4], fuelPct: s[5], tempC: s[6], status: s[7] })) }));
  void NX; void NY;
  return { ice, risk: riskGrid(ice), camps, weather, routes, passes, vehicles, previous: { route: prev.route, metrics: prev.metrics, thickness: Float32Array.from(prev.thickness) }, model };
}
export const PALETTE = { night: "#07121B", ice: "#D9F5F6", glacial: "#7CC7D9", crevasse: "#0B5466", green: "#78E6B5", violet: "#9F8BEA" };
const hex = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)) as [number, number, number];
const mix = (a: [number, number, number], b: [number, number, number], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t)) as [number, number, number];
/** Layer ramps (Polar Night palette). t is 0..1. Risk runs from ice-blue to aurora violet: danger crystallises, it does not flash red. */
export const rampThickness = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k < 0.5 ? mix(hex("#0B5466"), hex("#7CC7D9"), k * 2) : mix(hex("#7CC7D9"), hex("#D9F5F6"), (k - 0.5) * 2); };
export const rampRisk = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k < 0.5 ? mix(hex("#D9F5F6"), hex("#7CC7D9"), k * 2) : mix(hex("#7CC7D9"), hex("#9F8BEA"), (k - 0.5) * 2); };
export const rampConc = (t: number) => mix(hex("#0B5466"), hex("#D9F5F6"), Math.max(0, Math.min(1, t)));
export type Layer = "thickness" | "risk" | "concentration" | "confidence";
export const LAYERS: { id: Layer; label: string; unit: string }[] = [{ id: "thickness", label: "Thickness", unit: "cm" }, { id: "risk", label: "Risk", unit: "" }, { id: "concentration", label: "Concentration", unit: "" }, { id: "confidence", label: "Confidence", unit: "" }];
export function layerColor(layer: Layer, k: number, d: Data): [number, number, number] {
  if (layer === "thickness") return rampThickness(d.ice.thickness[k] / 110); if (layer === "risk") return rampRisk(d.risk[k]); if (layer === "concentration") return rampConc(d.ice.concentration[k]); return rampConc((d.ice.confidence[k] - 0.2) / 0.75);
}
export const layerValue = (layer: Layer, k: number, d: Data) => (layer === "thickness" ? d.ice.thickness[k] : layer === "risk" ? d.risk[k] : layer === "concentration" ? d.ice.concentration[k] : d.ice.confidence[k]);
export const toScene = (x: number, y: number): [number, number] => [(x - 100) * 0.5, -(y - 60) * 0.5];
