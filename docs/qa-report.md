# QA report

Apple M3 Pro, Chrome stable, Playwright 1.63, WebGL through SwiftShader. Last full runs: 25 e2e passed three times in a row after the final fix; 34 unit and API tests passed.

| Matrix row (blueprint 18) | Covered by | Result |
|---|---|---|
| Intro first load, skip, refresh mid-sequence | demo walk (asserts HUD opacity 1, the camera at the map pose, the glow complete), refresh test, choices during the last fade kept, a mid-crack check | pass |
| Input: click, keyboard | demo walk, a time slider moved with the arrow keys, the map's cells clicked | pass |
| Input: drag, touch | the 3D scene is not draggable; phone layout only | not tested |
| Responsive | phone 390 px: rail becomes a strip, panel below, no sideways overflow | pass at one phone size |
| Motion: reduced | static story, same planner | pass |
| Graphics: success, failure, context loss | `?gfx=off` journey through routes, weather, rovers and satellite; lost-context event | pass |
| Domain | blocked cells never entered, direct is shortest and riskiest, safe is thickest, support weight raises access, storm slows a rover inside it, telemetry holds in a storm and never has negative fuel, sensors differ and cloud hides optical cells, tiles are bounded | pass (34 tests) |
| API | tiles, paging, idempotent planning, validation, OpenAPI 3.1, WebSocket stream and a refused upgrade path | pass |
| Visual regression | six views against the poster fallback | pass |
| Performance | budgets in tests/e2e/performance.spec.ts | pass |

**Not validated against the real world.** The bearing rule, the weather, the satellite retrievals and the telemetry are invented; they are checked against the code that implements them.

Defects found after release: the storm layer, the aurora and the snow did not respond (the storm haze stayed where hour 0 would put it) because their shader uniforms were mutated through the object passed to `<shaderMaterial uniforms>`, which the renderer does not read; they are now set through the material's own `uniforms`, and a test checks the storm layer's front position after the hour changes.

Defects found during the build: the crack could not be seen against a white world, so the world now darkens to dusk before it forms; `smoothstep` with reversed edges is undefined in GLSL and made the ice texture noisy (all three uses rewritten); the first camera sat behind the sled and showed only cargo, so the intro now tracks from the side; the intro rover would have jumped when the hour-driven rovers took over, so it is a separate rover that shrinks away; a keyboard test that pressed two arrow keys in a row was flaky until it waited for the first press to land.
