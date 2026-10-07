# Architecture

```
model/parts.json ──> model/build.py ──Blender──> expedition.glb (52 named parts, 1,508 triangles), analysis.json, poster.png
                 └─> model/validate.py (fresh-scene re-import: names, pivots, axles, chunk tops and rims, budgets)
data/simulators/generate.ts ──> ice.json (960 cells), camps, weather (72 h), routes (3), vehicles (3 x 433 samples), passes (6), previous (2025)
packages/domain: grid (ice, risk, sectors), weather (front), route (A*, metrics), telemetry, satellite, history, tiles
apps/web (Next.js 16 static export): App ─ store ─ Panels (DOM + SVG map, six views) + Scene (R3F: instanced ice, routes, rovers, storm, aurora, snow) + Intro (GSAP)
apps/api (node:http + ws): the blueprint's section 12 contract, plus a WebSocket for the live rovers
```

**One ice chunk is one map cell.** The kit's chunk is 2.5 units wide, a cell is 5 km, the map draws 2 km per unit. The browser places 960 instances (four variants, a top and a body each) and colours the tops by the selected layer. Risky ice does not turn red: it tilts, shrinks and separates (fractures) and tints toward Aurora Violet. Open water drops the chunk altogether.

**Browser-owned detail.** The ice top's frost and cracks are a fragment shader; snow is a point shader; the aurora is a sky shader; the storm front is a plane shader whose edge is the same function (`exp(-((proj - front)/sigma)^2)`) the domain uses. Blender provides the low-poly top with UVs, the rover and its parts.

**Planning.** A* on the 8-connected grid; cost per step is length times (1 + 8 x risk^2 x riskWeight + 1.5 x (1 - support) x supportWeight); cells with risk of 0.97 or more are blocked. Metrics walk the route every kilometre: speed falls with risk and storm, fuel rises with both, hours in the storm are the hours with intensity above 0.35.

**The intro and the product share the route.** The crack is a window of the safe route's tube geometry that grows outward from the camera; its colour turns from cyan to Aurora Green as the same tube becomes the route; the camera then climbs through the aurora to the same top-down pose the map uses, and the interface wipes in.

**Telemetry** is simulated, not live: rovers follow their routes from a departure hour, hold when the storm exceeds 0.65, refuel below 25 percent near a camp, and are cautioned where the ice is under 1.1 times the safe thickness. The API streams the same samples over a WebSocket; the static site replays them with a time slider.

**Not built.** PostGIS and TimescaleDB (JSON files), MapLibre or deck.gl (an SVG map plus the 3D scene), real ice, weather or satellite data, a real bearing-capacity model, Redis, authentication.
