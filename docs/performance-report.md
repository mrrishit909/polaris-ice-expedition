# Performance report

Measured with `node scripts/measure.mjs` on an Apple M3 Pro with Chrome through SwiftShader (CPU rasteriser). These are bounds, **not GPU results**; no physical GPU was available.

| Metric | Value |
|---|---|
| Transfer | 714 KB, 23 requests (the model is 97 KB, the telemetry JSON the largest data file) |
| LCP | 4,572 ms (software rendering) |
| CLS | 0 |
| Long tasks | 2,721 ms in total during load |
| Frame time, map view | median 50 ms, p95 83.4 ms in software |
| Draw calls / triangles | 140 / 52,544 (960 instanced ice chunks, three rovers, five camps) |

Most of the 140 draw calls are the five camps, cloned from nine small meshes each; merging them would cut that by about a third. Budgets enforced by the e2e suite: GLB under 400 KB, gzipped JS under 750 KB, fewer than 180 draw calls and 90,000 triangles, a custom route planned and compared in under 4 s (it took 481 ms).
