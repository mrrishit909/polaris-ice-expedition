"""Fresh-scene re-import of exports/expedition.glb checked against parts.json and analysis.json. Exit 1 on failure."""
import bpy, os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json"))); A = json.load(open(os.path.join(HERE, "exports", "analysis.json")))
bpy.ops.wm.read_factory_settings(use_empty=True); path = os.path.join(HERE, "exports", "expedition.glb"); bpy.ops.import_scene.gltf(filepath=path)
objs = {o.name.split(".")[0]: o for o in bpy.data.objects}; tris = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
G = P["groups"]; need = list(G["rover"]) + list(G["sled"]) + list(G["camp"]) + list(G["ice"]) + list(G["proxy"]) + ["Rover", "Sled", "Camp", "IceChunk_A", "IceChunk_B", "IceChunk_C", "IceChunk_D"]
need += [f"{G['wheels']['prefix']}{s}_{k}" for s in G["wheels"]["sides"] for k in range(G["wheels"]["count"])]
missing = [n for n in need if n not in objs]; bad = []
def wb(o):
    ws = [o.matrix_world @ v.co for v in o.data.vertices]; return [min(w[i] for w in ws) for i in range(3)], [max(w[i] for w in ws) for i in range(3)]
for n in need:
    o = objs.get(n)
    if o is None or o.type != "MESH": continue
    if tuple(round(v, 4) for v in o.scale) != (1.0, 1.0, 1.0): bad.append(f"{n}: unapplied scale")
    lo, hi = wb(o); c = o.matrix_world.translation
    if n.startswith(("Rover_Wheel_", "Rover_Lamp_", "Sled_Cargo_", "Camp_Fuel_")) and not all(lo[i] - 0.01 <= c[i] <= hi[i] + 0.01 for i in range(3)): bad.append(f"{n}: pivot is not at the part's centre")
# axles: every wheel on a side shares x, wheel centres are one wheel radius above the ground, tracks cover the wheels
for s in ("L", "R"):
    ws = [objs.get(f"Rover_Wheel_{s}_{k}") for k in range(P["groups"]["wheels"]["count"])]
    if all(ws):
        if len({round(w.matrix_world.translation.x, 3) for w in ws}) != 1: bad.append(f"wheels {s} are not on one axle line")
        for w in ws:
            if abs(w.matrix_world.translation.z - 0.19) > 0.04: bad.append(f"{w.name}: wheel centre is not on its radius above the ground")
for s in ("L", "R"):
    b = objs.get(f"Rover_Bogie_{s}")
    if b:
        lo, hi = wb(b)
        if abs(b.matrix_world.translation.z - 0.42) > 0.05 or not (lo[1] - 0.02 <= b.matrix_world.translation.y <= hi[1] + 0.02): bad.append(f"Rover_Bogie_{s}: pivot is not at the hinge end")
d = objs.get("Rover_Dish")
if d:
    lo, hi = wb(d)
    if not (d.matrix_world.translation.z <= lo[2] + 0.001): bad.append("Rover_Dish pivot is not below the dish, at the mast base")
# ice chunks: the top has exactly seg x seg x 2 triangles and UVs and a flat rim; the body sits below it
seg = P["chunk"]["topSegments"]; S = P["chunk"]["size"]
for v in P["chunk"]["variants"]:
    t, b = objs.get(f"IceChunk_{v}_Top"), objs.get(f"IceChunk_{v}_Body")
    if t:
        if tris(t) != 2 * seg * seg: bad.append(f"IceChunk_{v}_Top has {tris(t)} triangles, expected {2 * seg * seg}")
        if not t.data.uv_layers: bad.append(f"IceChunk_{v}_Top has no UVs")
        lo, hi = wb(t); w = max(hi[0] - lo[0], hi[1] - lo[1])
        if abs(w - S) > 0.02: bad.append(f"IceChunk_{v}_Top is {w:.2f} wide, expected {S}")
        rim = [x for x in t.data.vertices if abs(abs(x.co.x) - S / 2) < 1e-3 or abs(abs(x.co.y) - S / 2) < 1e-3]
        if any(abs(x.co.z) > 1e-3 for x in rim): bad.append(f"IceChunk_{v}_Top rim is not flat, tiles would show seams")
    if t and b and wb(b)[1][2] > wb(t)[1][2] + 0.05: bad.append(f"IceChunk_{v}_Body pokes above its top")
rov = A["rover"]["bounds"]; L = rov[1][2] - rov[0][2]
if not (1.6 < L < 1.9): bad.append(f"rover length {L:.2f} outside 1.6 to 1.9")
if abs(A["chunk"]["size"] - S) > 1e-6 or A["chunk"]["topTriangles"] != 2 * seg * seg: bad.append("analysis.json disagrees with the chunk contract")
orphans = [o.name for o in bpy.data.objects if o.parent is None and o.name.split(".")[0] not in ("Rover", "Sled", "Camp", "IceChunk_A", "IceChunk_B", "IceChunk_C", "IceChunk_D", "Proxy_Rover")]
total_tris = sum(tris(o) for o in bpy.data.objects if o.type == "MESH"); size = os.path.getsize(path); fail = list(bad)
if missing: fail.append(f"missing {missing}")
if orphans: fail.append(f"unparented {orphans}")
if total_tris > P["budget"]["tris"]: fail.append(f"{total_tris} tris over budget")
if size > P["budget"]["bytes"]: fail.append(f"{size} bytes over budget")
rep = {"tris": total_tris, "bytes": size, "parts": len(need), "missing": missing, "orphans": orphans, "problems": bad}
json.dump(rep, open(os.path.join(HERE, "exports", "validation.json"), "w"), indent=1); print(json.dumps(rep, indent=1))
if fail: print("VALIDATION FAILED:", fail); sys.exit(1)
print("VALIDATION OK")
