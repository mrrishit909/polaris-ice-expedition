"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { FRONT, NX, NY, along, centerOf, frontPos, idx, lengthOf, mulberry32 } from "@polaris/domain";
import { base, layerColor, toScene, PALETTE, type Data } from "../data";
import { live, set, state, useStore, VIEWS } from "../store";

const COL = { night: new THREE.Color(PALETTE.night), whiteout: new THREE.Color("#cfe7ea"), violet: new THREE.Color(PALETTE.violet), green: new THREE.Color(PALETTE.green), cyan: new THREE.Color("#bff6ff") };
const hash = (i: number, j: number) => { const r = mulberry32(i * 73856093 + j * 19349663); return [r(), r(), r()]; };
const GLSL_NOISE = `float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`;
/** Ice top: a procedural frost and crack texture in the fragment shader (the browser owns the surface detail; Blender owns the low-poly top). */
function iceTop() {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, metalness: 0.05 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = "varying vec3 vWp;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = `varying vec3 vWp;\n${GLSL_NOISE}\n` + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float n = vnoise(vWp.xz*0.9)*0.5 + vnoise(vWp.xz*3.1)*0.35 + vnoise(vWp.xz*11.0)*0.15; diffuseColor.rgb *= 0.86 + 0.22*n;
      float cr = abs(vnoise(vWp.xz*1.6+3.0)-0.5); diffuseColor.rgb *= 1.0 - 0.3*(1.0 - smoothstep(0.0, 0.03, cr));`);
  };
  m.customProgramCacheKey = () => "polaris-ice"; return m;
}
function IceField({ data }: { data: Data }) {
  const s = useStore(), gltf = useLoader(GLTFLoader, `${base}/models/expedition.glb`), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const geos = useMemo(() => ["A", "B", "C", "D"].map((v) => ({ top: (gltf.scene.getObjectByName(`IceChunk_${v}_Top`) as THREE.Mesh).geometry, body: (gltf.scene.getObjectByName(`IceChunk_${v}_Body`) as THREE.Mesh).geometry })), [gltf]);
  const groups = useMemo(() => { const g: [number, number][][] = [[], [], [], []]; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) g[(i * 7 + j * 13) % 4].push([i, j]); return g; }, []);
  const topMat = useMemo(() => iceTop(), []), bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }), []);
  useEffect(() => {   // placement: open water is dropped, risky ice tilts, shrinks and separates (it fractures, it does not flash)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    groups.forEach((cells, v) => { const top = refs.current[v * 2], body = refs.current[v * 2 + 1]; if (!top || !body) return;
      cells.forEach(([i, j], n) => { const k = idx(i, j), r = data.risk[k], [x, z] = toScene(...centerOf(i, j)), [h1, h2, h3] = hash(i, j), open = r >= 0.97 || data.ice.thickness[k] < 3, f = Math.max(0, r - 0.45), s0 = open ? 0.0001 : 1 - 0.14 * f;
        e.set((h1 - 0.5) * 0.4 * f, Math.floor(h2 * 4) * (Math.PI / 2), (h3 - 0.5) * 0.4 * f); q.setFromEuler(e); pos.set(x, -0.04 * f - (open ? 1 : 0), z); sc.set(s0, s0, s0); m.compose(pos, q, sc); top.setMatrixAt(n, m); body.setMatrixAt(n, m); });
      top.instanceMatrix.needsUpdate = true; body.instanceMatrix.needsUpdate = true; top.count = body.count = cells.length; });
  }, [data, groups]);
  useEffect(() => {
    const c = new THREE.Color(), vio = COL.violet;
    groups.forEach((cells, v) => { const top = refs.current[v * 2], body = refs.current[v * 2 + 1]; if (!top || !body) return;
      cells.forEach(([i, j], n) => { const k = idx(i, j), [r, g, b] = layerColor(s.layer, k, data), tint = 0.94 + hash(i, j)[0] * 0.12; c.setRGB((r / 255) * tint, (g / 255) * tint, (b / 255) * tint, THREE.SRGBColorSpace); if (s.overlayRisk && s.layer !== "risk") c.lerp(vio, Math.min(0.85, Math.max(0, data.risk[k] - 0.3))); top.setColorAt(n, c); c.set(PALETTE.crevasse).lerp(c.set(PALETTE.glacial), 0.0); body.setColorAt(n, new THREE.Color(PALETTE.crevasse)); });
      if (top.instanceColor) top.instanceColor.needsUpdate = true; if (body.instanceColor) body.instanceColor.needsUpdate = true; });
  }, [data, s.layer, s.overlayRisk, groups]);
  return <>{groups.map((cells, v) => [<instancedMesh key={`t${v}`} ref={(r) => { refs.current[v * 2] = r; }} args={[geos[v].top, topMat, cells.length]} frustumCulled={false} />, <instancedMesh key={`b${v}`} ref={(r) => { refs.current[v * 2 + 1] = r; }} args={[geos[v].body, bodyMat, cells.length]} frustumCulled={false} />])}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}><planeGeometry args={[260, 200]} /><meshStandardMaterial color="#04202a" roughness={0.2} metalness={0.2} /></mesh></>;
}
const toV = (p: [number, number], y: number) => { const [x, z] = toScene(p[0], p[1]); return new THREE.Vector3(x, y, z); };
function RouteTube({ points, color, intro, active }: { points: [number, number][]; color: string; intro?: boolean; active?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null), prog = useRef(0), radial = 6;
  const geo = useMemo(() => { const c = new THREE.CatmullRomCurve3(points.map((p) => toV(p, 0.1)), false, "catmullrom", 0.2); return new THREE.TubeGeometry(c, Math.max(32, points.length * 5), 0.16, radial, false); }, [points]);
  const total = geo.index!.count, per = radial * 6, segs = total / per, col = useMemo(() => new THREE.Color(color), [color]);
  useEffect(() => { prog.current = state.reduced ? 1 : 0; }, [points]);
  useFrame((_, dt) => {
    const mm = mesh.current; if (!mm) return; const mat = mm.material as THREE.MeshBasicMaterial;
    if (intro && !state.introDone) {                              // the crack: a window around the camera's position that races outward, glowing cyan, then turning into the route
      const lenKm = lengthOf(points), c = Math.floor((live.crackFrom / lenKm) * segs), w = Math.floor(live.crack * segs * 0.5 + 0.0001), a = Math.max(0, c - w), b = Math.min(segs, c + w);
      geo.setDrawRange(a * per, Math.max(0, b - a) * per); mat.color.copy(COL.cyan).lerp(col, live.routeGlow); mm.scale.set(1, 1 + (1 - live.routeGlow) * 0.0, 1); mm.visible = live.crack > 0; return;
    }
    mm.visible = true; prog.current = Math.min(1, prog.current + dt / (state.reduced ? 0.01 : 1.4)); geo.setDrawRange(0, Math.floor(prog.current * segs) * per); mat.color.copy(col).multiplyScalar(active ? 1.15 : 0.7);
  });
  return <mesh ref={mesh} geometry={geo}><meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.95} /></mesh>;
}
function Routes({ data }: { data: Data }) {
  const s = useStore(), ids = [s.routeA, s.routeB, s.activeRoute].filter((v, i, a) => a.indexOf(v) === i), safe = data.routes.find((r) => r.id === "safe")!;
  if (!state.introDone && !state.introFx) return <RouteTube points={safe.points} color={PALETTE.green} intro />;
  return <>{ids.map((id, n) => { const r = data.routes.find((x) => x.id === id); return r ? <RouteTube key={id} points={r.points} color={[PALETTE.green, PALETTE.violet, PALETTE.glacial][n % 3]} active={id === s.activeRoute} /> : null; })}</>;
}
function Camps({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/expedition.glb`), camp = useMemo(() => gltf.scene.getObjectByName("Camp")!, [gltf]);
  const clones = useMemo(() => data.camps.map((c) => { const o = camp.clone(true); const [x, z] = toScene(c.x, c.y); o.position.set(x + 0.6, 0, z); o.scale.setScalar(c.kind === "station" ? 1.3 : c.kind === "depot" ? 0.8 : 1); return o; }), [camp, data.camps]);
  return <>{clones.map((o, i) => <primitive key={i} object={o} />)}</>;
}
const FWD = new THREE.Vector3();
function Rover({ data, id, intro }: { data: Data; id: string; intro?: boolean }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/expedition.glb`), g = useRef<THREE.Group>(null), v = data.vehicles.find((x) => x.id === id)!;
  const parts = useMemo(() => { const root = new THREE.Group(), r = gltf.scene.getObjectByName("Rover")!.clone(true), sl = gltf.scene.getObjectByName("Sled")!.clone(true); root.add(r, sl); const wheels: THREE.Object3D[] = [], bog: THREE.Object3D[] = []; let dish: THREE.Object3D | null = null, lamps: THREE.Mesh[] = [];
    root.traverse((o) => { if (o.name.startsWith("Rover_Wheel_")) wheels.push(o); if (o.name.startsWith("Rover_Bogie_")) bog.push(o); if (o.name === "Rover_Dish") dish = o; if (o.name.startsWith("Rover_Lamp_")) lamps.push(o as THREE.Mesh); if (o.name === "Rover_Body") { const m = o as THREE.Mesh; m.material = (m.material as THREE.MeshStandardMaterial).clone(); (m.material as THREE.MeshStandardMaterial).color.set(v.color).multiplyScalar(0.75); } if (o.name.startsWith("Rover_Lamp_")) { const m = o as THREE.Mesh; m.material = (m.material as THREE.MeshStandardMaterial).clone(); } });
    const lights = [-0.3, 0.3].map((x) => { const sp = new THREE.SpotLight("#fff4d8", 0, 26, 0.5, 0.6, 1.2), tg = new THREE.Object3D(); sp.position.set(x, 0.7, -0.8); tg.position.set(x * 2, 0.1, -9); r.add(sp, tg); sp.target = tg; return sp; });
    return { root, wheels, bog, dish: dish as THREE.Object3D | null, lamps, lights, odo: { v: 0 }, last: new THREE.Vector3(), heading: 0 }; }, [gltf, v.color]);
  useFrame((_, dt) => {
    const gp = g.current; if (!gp) return; const P = parts; let x: number, z: number, hd: number, lamp = 0.4, show = true;
    if (intro) { const route = data.routes.find((r) => r.id === "safe")!, p = along(route.points, live.roverS); [x, z] = toScene(p.x, p.y); hd = p.headingDeg; lamp = live.headlights; show = !state.introDone || state.introFx; }
    else { const h = state.hour, k = Math.min(v.samples.length - 2, Math.max(0, Math.floor(h * 6))), a = v.samples[k], b = v.samples[k + 1], u = Math.max(0, Math.min(1, h * 6 - k)); [x, z] = toScene(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u); hd = u < 0.5 ? a.headingDeg : b.headingDeg; lamp = a.status === "Holding" ? 0.15 : 0.5; show = state.introDone; }
    gp.visible = show && (!intro || live.introRover > 0.01); if (intro) gp.scale.setScalar(Math.max(0.0001, live.introRover)); gp.position.set(x, 0.02, z); gp.rotation.y = -(hd * Math.PI) / 180;
    FWD.set(x, 0, z); const moved = P.last.distanceTo(FWD); if (moved < 5) P.odo.v += moved; P.last.copy(FWD); P.wheels.forEach((w) => (w.rotation.x = -P.odo.v / 0.16)); P.bog.forEach((b2, i) => (b2.rotation.x = 0.04 * Math.sin(P.odo.v * 5 + i))); if (P.dish && !state.pauseMotion) P.dish.rotation.y += dt * 0.6;
    P.lamps.forEach((l) => ((l.material as THREE.MeshStandardMaterial).emissiveIntensity = 6 * lamp)); P.lights.forEach((sp) => (sp.intensity = (intro ? 40 : 6) * lamp));
  });
  return <group ref={g}><primitive object={parts.root} /></group>;
}
function Storm() {
  const s = useStore(), mat = useRef<THREE.ShaderMaterial>(null), u = useMemo(() => ({ uFront: { value: 0 }, uSigma: { value: FRONT.sigmaKm / 2 }, uDir: { value: new THREE.Vector2(FRONT.dirX, -FRONT.dirY) }, uTime: { value: 0 }, uOn: { value: 1 } }), []);
  useFrame(({ clock }) => { if (!mat.current) return; const U = mat.current.uniforms; (window as unknown as { __pStorm: () => number }).__pStorm = () => U.uFront.value; U.uFront.value = frontPos(state.hour) / 2; U.uTime.value = state.pauseMotion ? U.uTime.value : clock.elapsedTime; U.uOn.value = state.showStorm && state.introDone ? 1 : 0; });
  if (!s.showStorm) return null;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 4.5, 0]} renderOrder={5}><planeGeometry args={[150, 100, 1, 1]} /><shaderMaterial ref={mat} uniforms={u} transparent depthWrite={false} vertexShader={`varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.0); }`}
    fragmentShader={`uniform float uFront, uSigma, uTime, uOn; uniform vec2 uDir; varying vec3 vP; ${GLSL_NOISE}
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.1; a*=0.5; } return s; }
      void main(){ float proj = dot(vP.xz, uDir); float a = exp(-pow((proj-uFront)/uSigma, 2.0)); vec2 q = vP.xz*0.07 + uDir*uTime*0.15; float n = fbm(q + fbm(q*1.7+uTime*0.03)); float al = a*(0.12+0.6*n)*uOn*0.6; vec3 c = mix(vec3(0.85,0.96,0.97), vec3(0.62,0.55,0.92), smoothstep(0.2,0.9,n)*a); gl_FragColor = vec4(c, al); }`} /></mesh>;
}
function Aurora() {
  const mat = useRef<THREE.ShaderMaterial>(null), u = useMemo(() => ({ uTime: { value: 0 }, uI: { value: 0.5 } }), []);
  useFrame(({ clock }) => { const U = mat.current?.uniforms ?? u; U.uTime.value = state.pauseMotion ? U.uTime.value : clock.elapsedTime; const target = state.introDone ? 0.3 + 0.06 * VIEWS.findIndex((v) => v.id === state.view) : live.aurora; U.uI.value += (target - U.uI.value) * 0.05; });
  return <mesh renderOrder={-2}><sphereGeometry args={[160, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><shaderMaterial ref={mat} uniforms={u} side={THREE.BackSide} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false}
    vertexShader={`varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
    fragmentShader={`uniform float uTime, uI; varying vec3 vD; ${GLSL_NOISE}
      void main(){ float h = vD.y; float band = smoothstep(0.05,0.35,h)*(1.0 - smoothstep(0.5,0.95,h)); float w = vnoise(vec2(atan(vD.x,vD.z)*3.0 + uTime*0.05, h*4.0)) ; float az = atan(vD.x,vD.z); float cur = smoothstep(0.35,0.75,sin(az*5.0 + w*6.0 + uTime*0.12)*0.5+0.5); cur *= 0.45 + 0.8*vnoise(vec2(az*60.0 + uTime*0.2, h*2.0)); vec3 g = vec3(0.47,0.9,0.71), v = vec3(0.62,0.55,0.92); vec3 c = mix(g, v, smoothstep(0.3,0.9,h + w*0.3)); gl_FragColor = vec4(c*cur*band*uI*0.9, 1.0); }`} /></mesh>;
}
function Snow() {
  const pts = useRef<THREE.Points>(null), { camera } = useThree(), N = 1600, u = useMemo(() => ({ uTime: { value: 0 }, uI: { value: 0.3 }, uCam: { value: new THREE.Vector3() } }), []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(), r = mulberry32(3), a = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) a[i] = r(); g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; }, []);
  useFrame(({ clock }) => { const U = (pts.current?.material as THREE.ShaderMaterial | undefined)?.uniforms ?? u; U.uTime.value = state.pauseMotion ? U.uTime.value : clock.elapsedTime; const storm = Math.exp(-(((state.hour - 35) / 6) ** 2)); const fade = Math.max(0, Math.min(1, 1 - (camera.position.y - 30) / 50)); U.uI.value = (state.introDone ? (state.reduced ? 0 : 0.12 + 0.5 * storm * (state.view === "weather" ? 1 : 0.4)) : live.snow) * (state.introDone ? fade : 1); U.uCam.value.copy(camera.position); });
  return <points ref={pts} geometry={geo} frustumCulled={false} renderOrder={6}><shaderMaterial uniforms={u} transparent depthWrite={false} fog={false}
    vertexShader={`uniform float uTime, uI; uniform vec3 uCam; varying float vA; void main(){ vec3 box = vec3(40.0, 18.0, 40.0); vec3 p = position*box; p.x += uTime*(3.0+position.y*2.0); p.y -= uTime*(1.2+position.z); p.z += uTime*1.0; p = mod(p, box) - box*0.5; vec3 w = p + vec3(uCam.x, max(uCam.y*0.6, 4.0), uCam.z); vA = uI*(0.4+0.6*fract(position.x*37.0)); vec4 mv = viewMatrix*vec4(w,1.0); gl_PointSize = min(7.0, (1.2 + 2.2*position.z)*(40.0/ -mv.z)); gl_Position = projectionMatrix*mv; }`}
    fragmentShader={`varying float vA; void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(0.9,0.97,1.0, vA*(1.0 - smoothstep(0.1,0.5,d))); }`} /></points>;
}
const POSE = { map: { p: [0, 125, 0.001], l: [0, 0, 0], f: 40, up: [0, 0, -1] }, oblique: { p: [0, 78, 88], l: [0, 0, -4], f: 42, up: [0, 1, 0] } } as const;
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function Rig({ data }: { data: Data }) {
  const { camera, size, scene } = useThree(), cam = camera as THREE.PerspectiveCamera, cur = useRef({ p: new THREE.Vector3(0, 2, 2), l: new THREE.Vector3(), f: 55, up: new THREE.Vector3(0, 1, 0), init: false });
  const tmpP = useMemo(() => new THREE.Vector3(), []), tmpL = useMemo(() => new THREE.Vector3(), []), safe = data.routes.find((r) => r.id === "safe")!;
  useFrame((st, dt) => {
    const s = state, c = cur.current; let gp: THREE.Vector3, gl: THREE.Vector3, gf: number, gu: THREE.Vector3, kk = s.introDone ? (s.reduced ? 1 : 1 - Math.exp(-dt * 2.4)) : 1;
    const rp = (rid: string, km: number) => { const r = data.routes.find((x) => x.id === rid)!, p = along(r.points, km), [x, z] = toScene(p.x, p.y), hd = (p.headingDeg * Math.PI) / 180; return { x, z, dir: new THREE.Vector3(Math.sin(hd), 0, -Math.cos(hd)) }; };
    if (!s.introDone) {
      const r0 = rp("safe", live.roverS), pos = new THREE.Vector3(r0.x, 0, r0.z), side = new THREE.Vector3(-r0.dir.z, 0, r0.dir.x), P0 = pos.clone().addScaledVector(r0.dir, 1.2).addScaledVector(side, 5.2).add(new THREE.Vector3(0, 1.3, 0)), L0 = pos.clone().addScaledVector(r0.dir, -0.4).add(new THREE.Vector3(0, 0.55, 0));
      const P1 = pos.clone().addScaledVector(r0.dir, -5).add(new THREE.Vector3(0, 3.2, 0)), L1 = pos.clone().addScaledVector(r0.dir, 14).add(new THREE.Vector3(0, 24, 0));
      const P2 = new THREE.Vector3(...POSE.map.p), L2 = new THREE.Vector3(...POSE.map.l), t = live.camT, a = ss(0, 1, t - 0), b = ss(0, 1, t - 1), cc = ss(0, 1, t - 2);
      gp = t < 1 ? P0 : t < 2 ? P0.clone().lerp(P1, b * 0 + ss(1, 2, t)) : P1.clone().lerp(P2, cc); gl = t < 1 ? L0 : t < 2 ? L0.clone().lerp(L1, ss(1, 2, t)) : L1.clone().lerp(L2, cc); gf = t < 1 ? 56 : t < 2 ? 56 + 8 * ss(1, 2, t) : 64 - 24 * cc; gu = new THREE.Vector3(0, 1, 0).lerp(new THREE.Vector3(...POSE.map.up), cc).normalize(); void a;
      if (live.shake > 0 && !s.reduced) gp = gp.clone().add(new THREE.Vector3((Math.random() - 0.5) * live.shake, (Math.random() - 0.5) * live.shake, (Math.random() - 0.5) * live.shake));
      c.p.copy(gp); c.l.copy(gl); c.f = gf; c.up.copy(gu); c.init = true;
    } else {
      if (s.fly && live.flyT >= 0) { const r = data.routes.find((x) => x.id === s.fly) ?? data.routes[1], len = lengthOf(r.points), km = live.flyT * len, q = rp(r.id, km), q2 = rp(r.id, Math.min(len, km + 14)); gp = new THREE.Vector3(q.x, 5.5, q.z).addScaledVector(q.dir, -8); gl = new THREE.Vector3(q2.x, 0.5, q2.z); gf = 52; gu = new THREE.Vector3(0, 1, 0); kk = 1 - Math.exp(-dt * 4); }
      else { const key = s.cam === "auto" ? (s.view === "routes" || s.view === "weather" ? "oblique" : "map") : s.cam; if (key === "rover") { const v = data.vehicles.find((x) => x.id === s.selVehicle)!, k = Math.min(v.samples.length - 1, Math.max(0, Math.round(s.hour * 6))), a = v.samples[k], [x, z] = toScene(a.x, a.y), hd = (a.headingDeg * Math.PI) / 180, dir = new THREE.Vector3(Math.sin(hd), 0, -Math.cos(hd)); gp = new THREE.Vector3(x, 4, z).addScaledVector(dir, -7); gl = new THREE.Vector3(x, 0.4, z).addScaledVector(dir, 3); gf = 50; gu = new THREE.Vector3(0, 1, 0); } else { const P = POSE[key]; gp = new THREE.Vector3(...P.p); gl = new THREE.Vector3(...P.l); gf = P.f; gu = new THREE.Vector3(...P.up); } }
      if (!c.init) { c.p.copy(gp); c.l.copy(gl); c.f = gf; c.up.copy(gu); c.init = true; }
      c.p.lerp(gp, kk); c.l.lerp(gl, kk); c.f += (gf - c.f) * kk; c.up.lerp(gu, kk).normalize();
    }
    void safe; tmpP.copy(c.p); tmpL.copy(c.l); cam.position.copy(tmpP); cam.up.copy(c.up); cam.lookAt(tmpL); cam.fov = c.f; cam.near = 0.1; cam.far = 400;
    if (size.width > 900 && s.introDone) cam.setViewOffset(size.width, size.height, size.width * 0.17 * ss(0, 1, live.nav), 0, size.width, size.height); else cam.clearViewOffset(); cam.updateProjectionMatrix();
    const fogCol = COL.whiteout.clone().lerp(COL.night, live.night); (scene.fog as THREE.FogExp2).color.copy(fogCol); (scene.fog as THREE.FogExp2).density = s.introDone ? 0.0035 : live.fog; scene.background = fogCol;
  });
  return null;
}
function Lights() { return <><ambientLight intensity={0.5} color="#9fc9d9" /><directionalLight position={[-30, 40, 20]} intensity={1.1} color="#cfe9f2" /><hemisphereLight args={["#7CC7D9", "#0B5466", 0.35]} /></>; }
function Lifecycle() {
  const { setFrameloop, gl } = useThree();
  useEffect(() => { const vis = () => setFrameloop(document.hidden ? "never" : "always"), lost = (e: Event) => { e.preventDefault(); set({ gfx: "poster" }); };
    document.addEventListener("visibilitychange", vis); gl.domElement.addEventListener("webglcontextlost", lost); (window as unknown as { __polarisStats: () => unknown }).__polarisStats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    return () => { document.removeEventListener("visibilitychange", vis); gl.domElement.removeEventListener("webglcontextlost", lost); }; }, [setFrameloop, gl]);
  return null;
}
export default function Scene({ data }: { data: Data }) {
  useStore(); useEffect(() => { (window as unknown as { __pLive: typeof live }).__pLive = live; }, []);
  return (
    <Canvas className="stage" data-testid="stage" dpr={[1, 1.5]} camera={{ fov: 56, position: [0, 2, 2] }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; scene.fog = new THREE.FogExp2("#cfe7ea", 0.5); }}>
      <Lights /><Rig data={data} /><Aurora /><IceField data={data} /><Routes data={data} /><Camps data={data} /><Rover data={data} id="R1" intro /><Rover data={data} id="R1" /><Rover data={data} id="R2" /><Rover data={data} id="R3" /><Storm /><Snow /><Lifecycle />
    </Canvas>
  );
}
