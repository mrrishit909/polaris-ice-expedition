"use client";
import { useEffect, useState } from "react";
import { thicknessAt, CAMPS } from "@polaris/domain";
import { loadData, base, type Data } from "./data";
import { live, set, state, useStore, VIEWS } from "./store";
import Intro from "./ui/Intro";
import Panels from "./ui/Panels";
import Scene from "./scene/Scene";
const webglOk = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
export default function App() {
  const s = useStore(); const [data, setData] = useState<Data | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), rm = matchMedia("(prefers-reduced-motion: reduce)").matches || q.get("motion") === "reduced", view = VIEWS.find((v) => v.id === (q.get("view") ?? location.hash.slice(1)))?.id, skip = q.get("skip") === "1" || !!view, hour = Number(q.get("hour"));
    loadData().then((d) => {
      set({ reduced: rm, pauseMotion: rm, gfx: q.get("gfx") === "off" || !webglOk() ? "poster" : "webgl", ...(Number.isFinite(hour) && q.get("hour") !== null ? { hour: Math.max(0, Math.min(71.75, hour)) } : {}), ...(view ? { view } : {}), ...(skip ? { introDone: true, introStep: 99 } : {}) });
      if (skip) { document.documentElement.style.setProperty("--ui", "1"); Object.assign(live, { fog: 0.0035, night: 1, snow: 0.15, headlights: 0.5, crack: 1, routeGlow: 1, aurora: 0.5, camT: 3, nav: 1, shake: 0, introRover: 0 }); }
      setData(d); }).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => { if (!s.playing) return; const id = setInterval(() => { const h = Math.min(71.75, Math.round((state.hour + 0.25) * 4) / 4); set({ hour: h, ...(h >= 71.75 ? { playing: false } : {}) }); }, 130); return () => clearInterval(id); }, [s.playing]);
  useEffect(() => { const f = () => { const v = VIEWS.find((x) => x.id === location.hash.slice(1)); if (v && v.id !== state.view && state.introDone) set({ view: v.id }); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  if (err) return <div className="boot" role="alert">Could not load data: {err}</div>;
  if (!data) return <div className="boot" role="status">Waiting out the whiteout…</div>;
  const a = CAMPS[0], iceCm = Math.round(thicknessAt(data.ice, a.x + 6, a.y + 3));
  return (
    <div className="app" data-view={s.view} data-intro={s.introDone ? "done" : "running"} data-gfx={s.gfx}>
      {s.gfx === "webgl" ? <Scene data={data} /> : <div className="poster" style={{ backgroundImage: `url(${base}/posters/expedition.png)` }} role="img" aria-label="Still of a polar rover with its sled on blue-white ice at night" data-testid="poster" />}
      <div className="vignette" aria-hidden /><Panels data={data} />{(!s.introDone || s.introFx) && <Intro iceCm={iceCm} />}
    </div>
  );
}
