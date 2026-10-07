"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live, set, state, useStore } from "../store";

const FINAL = { fog: 0.0035, night: 1, snow: 0.15, headlights: 0.5, crack: 1, routeGlow: 1, aurora: 0.5, camT: 3, nav: 1, shake: 0, introRover: 0, roverS: 0 };
// Steps (blueprint section 3): 0 whiteout, 1 the rover emerges and its headlights come on, 2 it drives across the ice, 3 a crack forms under the camera and races outward, 4 it glows from within and becomes the route, 6 the camera climbs through the aurora into the map and the interface arrives.
export default function Intro({ iceCm }: { iceCm: number }) {
  const s = useStore(), tl = useRef<gsap.core.Timeline | null>(null), [cap, setCap] = useState(""), [line, setLine] = useState(false); const root = document.documentElement;
  const finish = () => { tl.current?.kill(); Object.assign(live, FINAL); root.style.setProperty("--ui", "1"); set({ introFx: false, introStep: 99, ...(state.introDone ? {} : { introDone: true }) }); setLine(false); setCap(""); }; // never overwrite what the visitor did while the last fade ran
  useEffect(() => {
    if (state.reduced) return; gsap.ticker.lagSmoothing(0);
    Object.assign(live, { fog: 0.85, night: 0, snow: 1, headlights: 0, roverS: 0, crack: 0, crackFrom: 12, routeGlow: 0, aurora: 0, camT: 0, nav: 0, shake: 0, introRover: 1 }); root.style.setProperty("--ui", "0");
    const t = gsap.timeline({ defaults: { ease: "power1.inOut" }, onComplete: finish }); tl.current = t; const step = (n: number, c = "") => () => { set({ introStep: n }); setCap(c); };
    t.call(step(0, "Visibility 30 m."), [], 0.4).to(live, { fog: 0.2, duration: 3.2 }, 0.8)
      .call(step(1, "Headlights on."), [], 3.0).to(live, { headlights: 1, duration: 0.8 }, 3.0).to(live, { snow: 0.55, duration: 4 }, 4).to(live, { night: 0.75, duration: 3.6 }, 5.2)
      .call(step(2, `Ice under the tracks: ${iceCm} cm.`), [], 4.6).to(live, { roverS: 12, duration: 5, ease: "none" }, 4.2)
      .call(step(3, "Something is moving under the camera."), [], 8.6).to(live, { shake: 0.14, duration: 0.4 }, 8.8).to(live, { crack: 1, duration: 2.6, ease: "power2.in" }, 9.0).to(live, { shake: 0, duration: 1.2 }, 10.2)
      .call(step(4, ""), [], 11.6).to(live, { routeGlow: 1, duration: 1.8 }, 11.6).to(live, { night: 1, duration: 3.2 }, 11.8).to(live, { fog: 0.014, duration: 3.2 }, 11.8).to(live, { aurora: 0.9, duration: 3.2 }, 12.2).to(live, { headlights: 0.4, duration: 2 }, 12)
      .call(() => setLine(true), [], 12.6).call(() => setLine(false), [], 16.2)
      .to(live, { camT: 1 }, 12).to(live, { camT: 2, duration: 2.4, ease: "power2.inOut" }, 13.2).to(live, { camT: 3, duration: 3.4, ease: "power2.inOut" }, 15.6)
      .call(() => set({ introStep: 6 }), [], 15.6).to(live, { introRover: 0, duration: 1.6 }, 16.6).to(live, { snow: 0.15, duration: 2 }, 16)
      .to(live, { nav: 1, duration: 1.8 }, 17.4).to(live, { fog: 0.0035, duration: 2.2 }, 16.6).to({ v: 0 }, { v: 1, duration: 2.4, ease: "power2.inOut", onUpdate() { root.style.setProperty("--ui", String(this.targets()[0].v)); } }, 17.2)
      .call(() => { set({ introDone: true, introFx: true, introStep: 99 }); }, [], 19.8);
    return () => { if (!state.introDone) t.kill(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => { const tt = tl.current; if (tt && tt.time() < 15.5) tt.seek(15.6); else finish(); };
  if (s.introDone && !s.introFx) return null;
  if (s.reduced) { const fr = [["Whiteout", "Wind-driven snow and almost no visibility."], ["A rover", "A polar rover's headlights reveal the ice."], ["A crack", "A crack forms and glows from within instead of falling."], ["The route", "It becomes the route, under the aurora, and the map opens."]];
    return (<div className="intro intro-static" role="dialog" aria-label="Opening story" data-testid="intro"><ol>{fr.map(([a, b], i) => <li key={i}><b>{a}</b> {b}</li>)}</ol><button className="btn primary" onClick={finish} data-testid="skip-intro">Open the map</button></div>); }
  return (<div className={`intro ${s.introDone ? "fx" : ""}`} data-testid="intro" data-step={s.introStep}>
    {line && <h1 className="statement" data-testid="statement">Where the ice breaks, the route begins.</h1>}<p className="caption" role="status">{cap}</p>{!s.introDone && <div className="intro-btns"><button className="btn skip" onClick={skip} data-testid="skip-intro" autoFocus>Skip intro</button></div>}</div>);
}
