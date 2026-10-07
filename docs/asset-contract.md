# Asset contract

`model/parts.json` is read by `build.py`, `validate.py` and the web app. Blender is Z-up, the GLB is Y-up (glTF z = minus Blender y). The rover and sled face -z.

| Group | Names | Pivot |
|---|---|---|
| Rover | Rover_Body, Rover_Cab, Rover_Track_L/R, Rover_Antenna | centre |
| Wheels | Rover_Wheel_L_0..4, Rover_Wheel_R_0..4 | the axle centre (the browser spins them) |
| Suspension | Rover_Bogie_L/R | the front hinge (the browser rocks them) |
| Lamps | Rover_Lamp_L/R | centre (emissive) |
| Dish | Rover_Dish | the mast base (the browser turns it) |
| Sled | Sled_Body, Sled_Runner_L/R, Sled_Hitch, Sled_Cargo_0..2 | the hitch at its front |
| Camp | Camp_Dome_0..2, Camp_Mast, Camp_Flag, Camp_Fuel_0..3 | base |
| Ice | IceChunk_A..D, each with `_Top` (4 x 4 quads, UVs, flat rim) and `_Body` (tapered, darker) | the chunk centre, top at y = 0 |
| Analysis | Proxy_Rover (never drawn) | origin |

Outputs: `expedition.glb` (97 KB, 13 KB gzipped, 1,508 triangles), `analysis.json` (rover bounds, wheel centres, lamps, dish pivot, hitch, chunk size and top triangles, camp origin), `poster.png`.

`validate.py` re-imports the GLB in a fresh scene and fails on: a missing part, an unparented node, an unapplied scale, wheels that are off their axle line or not one radius above the ground, a bogie pivot that is not at its hinge end, a dish pivot above the dish, an ice top that is not 4 x 4 quads with UVs and a flat rim (so neighbouring tiles would show seams), a body that pokes above its top, a rover outside 1.6 to 1.9 units long, an `analysis.json` that disagrees with the contract, or the triangle or byte budget being exceeded.
