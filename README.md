# POLARIS: polar expedition, ice and climate operations

A whiteout. Wind-driven snow. A rover's silhouette emerges and its headlights find the ice. A crack forms under the camera and races outward, and instead of falling it glows from within and becomes the route. The aurora fills the sky and the glowing route turns into the map. **WHERE THE ICE BREAKS, THE ROUTE BEGINS.**

Then the planner: an expedition map with camps, rovers and a storm front; ice thickness, risk, concentration and confidence on a 5 km grid; a 72-hour weather timeline; rover telemetry with a replay of a previous expedition; six synthetic satellite passes; and a route planner that compares candidates on risk, distance and support access, then flies the camera along the one you pick.

Built from blueprint 08 of the *Advanced Engineering Build Book, Volume VII* as a **vertical slice**. **The region, ice, weather, rovers, satellites and the 2025 expedition are all synthetic, and the bearing rule is invented. Not for real navigation or ice travel.**

- Live: https://mrrishit909.github.io/projects/polaris-ice-expedition/demo/
- Case study: https://mrrishit909.github.io/projects/polaris-ice-expedition/

## Run it
```bash
npm ci
npm run seed                      # ice, weather, routes, telemetry, passes
npm run model                     # Blender 4.5: build.py then validate.py (the GLB is committed, so optional)
npm test                          # 34 domain + API tests
npm run build && node scripts/serve.ts 8701   # static export at http://127.0.0.1:8701
npm run e2e                       # 25 Playwright tests (needs Google Chrome)
node apps/api/src/server.ts       # /v1 API on :8700, OpenAPI at /openapi.json, WebSocket at /v1/vehicles/live
```
`?skip=1`, `?view=map|ice|weather|rovers|satellite|routes`, `&hour=0..71.75`, `?gfx=off`, `?motion=reduced`.

## The pipeline
`model/parts.json` is the contract for 52 named parts. `build.py` makes the rover, sled, camp and four ice chunks (a separate low-poly top and body) and writes `analysis.json`; `validate.py` re-imports the GLB and fails on a missing part, a misplaced pivot or a chunk top that would show seams. The ice, weather, routes, telemetry and satellites are in `packages/domain`, shared by the browser and the API. See [docs/](docs/) and [design/](design/).

## Agent roles
`.claude/agents/` defines the twelve roles from the book, `.claude/skills/` the project skills. **Honest note:** this repository was produced by one Claude Code session playing those roles in sequence on one working tree, not by parallel subagents in separate worktrees. The multi-agent workflow is the development process; the product contains no agents.

## Not built, and why
PostGIS, TimescaleDB and Redis (JSON files), MapLibre or deck.gl (an SVG map plus the 3D scene), real ice, weather or satellite data, a real bearing-capacity model, authentication, dragging the 3D camera, touch tests beyond the phone layout, and a measurement on a physical GPU. Frame numbers are SwiftShader. The static site replays the telemetry; the API's WebSocket is tested but the site does not connect to it.
