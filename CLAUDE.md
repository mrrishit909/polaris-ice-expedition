# POLARIS

Polar expedition, ice and climate operations demo (blueprint 08, Advanced Engineering Build Book Vol. VII). Static site; the Blender kit is scripted. The region, ice, weather, rovers, satellites and the 2025 expedition are synthetic. NOT for real navigation or ice travel.

- Build the asset: `npm run model` (Blender 4.5 at ~/Applications), then `node scripts/copy-assets.ts`. Contract: `model/parts.json` (52 named parts: rover with wheels, bogies, lamps and dish; sled; camp; four ice chunks with separate Top and Body). The build also writes `model/exports/analysis.json`, which `packages/domain/test` checks against the grid (one chunk = one 5 km cell at 2 km per unit).
- Domain: `packages/domain/src` (grid.ts ice field and risk, weather.ts storm front, route.ts A* and metrics, telemetry.ts, satellite.ts, history.ts, tiles.ts). Data: `npm run seed`. Tests: `npm test`, `npm run e2e` after `npm run build`.
- Space: km in the domain (x east, y north, region 200 x 120); scene units are 0.5 per km, north is -z, the map camera looks down with up = -z. Vehicles are drawn about 700 times too large on purpose.
- R3F note: update `<shaderMaterial>` uniforms through `ref.current.uniforms`, not through the object you passed in `uniforms={...}`.
- `window.__pLive`, `window.__pStorm` and `window.__polarisStats` are exposed for tests.
- Multi-agent is the development process only (.claude/agents); the product contains no agents.
