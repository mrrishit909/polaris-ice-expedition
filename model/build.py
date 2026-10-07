"""POLARIS: an original polar rover, sled, camp and ice-chunk kit. Deterministic. Run: Blender -b -P model/build.py
Blender is Z-up, the GLB is Y-up (glTF z = -Blender y): the rover faces Blender +y, so -z in the browser. Ice chunks have a separate low-poly top (UVs, 4x4 quads) and body.
Also writes exports/analysis.json (measured bounds in glTF axes) and renders a poster."""
import bpy, bmesh, math, os, json, random
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json")))
os.makedirs(os.path.join(HERE, "exports"), exist_ok=True); os.makedirs(os.path.join(HERE, "renders"), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene; rnd = random.Random(808)
def mat(name, color, rough=0.5, metal=0.0, emit=None, strength=4.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m
M = {"hull": mat("Hull", (0.82, 0.3, 0.08), 0.45), "glass": mat("Glass", (0.05, 0.18, 0.22), 0.1, 0.0), "track": mat("Track", (0.03, 0.035, 0.04), 0.9), "steel": mat("Steel", (0.5, 0.55, 0.58), 0.35, 1.0), "lamp": mat("Lamp", (1, 0.95, 0.8), 0.3, 0, (1, 0.95, 0.8), 6.0),
     "cargo": mat("Cargo", (0.1, 0.3, 0.38), 0.6), "tent": mat("Tent", (0.85, 0.5, 0.15), 0.8), "barrel": mat("Barrel", (0.7, 0.12, 0.1), 0.5), "iceTop": mat("IceTop", (0.82, 0.94, 0.96), 0.25), "iceBody": mat("IceBody", (0.05, 0.33, 0.4), 0.3)}
def box_bm(bm, c, s):
    x, y, z = c; sx, sy, sz = (v / 2 for v in s); v = [bm.verts.new((x + a * sx, y + b * sy, z + d * sz)) for a in (-1, 1) for b in (-1, 1) for d in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)): bm.faces.new([v[i] for i in f])
def cyl_bm(bm, c, r, depth, axis="x", seg=14):
    rot = {"x": Matrix.Rotation(math.pi / 2, 4, "Y"), "y": Matrix.Rotation(math.pi / 2, 4, "X"), "z": Matrix.Identity(4)}[axis]
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=depth, matrix=Matrix.Translation(c) @ rot)
def obj(name, bm, material, parent, loc=(0, 0, 0)):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(material)
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); o.parent = parent; o.location = loc; return o
def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e); e.parent = parent; e.location = loc; return e
def part(name, parent, material, build, pivot=None):
    """Mesh whose object origin is `pivot` (default: the build's own centre) in the parent's frame."""
    bm = bmesh.new(); build(bm)
    pv = Vector(pivot) if pivot is not None else sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
    for v in bm.verts: v.co -= pv
    return obj(name, bm, material, parent, tuple(pv))
# ---- rover (faces +y), 1.8 long, wheels and tracks on both sides
rover = empty("Rover"); R = P["rover"]
part("Rover_Body", rover, M["hull"], lambda b: (box_bm(b, (0, 0.1, 0.55), (0.9, 1.5, 0.34)), box_bm(b, (0, 0.62, 0.74), (0.7, 0.5, 0.12))), pivot=(0, 0, 0.55))
part("Rover_Cab", rover, M["glass"], lambda b: box_bm(b, (0, -0.2, 0.9), (0.78, 0.66, 0.34)))
for s, x in (("L", -0.52), ("R", 0.52)):
    part(f"Rover_Track_{s}", rover, M["track"], lambda b, x=x: box_bm(b, (x, 0, 0.2), (0.3, 1.72, 0.34)))
    for k in range(R["wheelsPerSide"]):
        y = -0.66 + k * 0.33; part(f"Rover_Wheel_{s}_{k}", rover, M["steel"], lambda b, x=x, y=y: cyl_bm(b, (x, y, 0.19), 0.16, 0.34, "x"))
    part(f"Rover_Bogie_{s}", rover, M["steel"], lambda b, x=x: box_bm(b, (x * 0.72, 0.0, 0.42), (0.07, 1.3, 0.06)), pivot=(x * 0.72, 0.65, 0.42))
for s, x in (("L", -0.3), ("R", 0.3)): part(f"Rover_Lamp_{s}", rover, M["lamp"], lambda b, x=x: box_bm(b, (x, 0.86, 0.66), (0.16, 0.07, 0.1)))
part("Rover_Dish", rover, M["steel"], lambda b: cyl_bm(b, (0.2, -0.45, 1.3), 0.17, 0.04, "y"), pivot=(0.2, -0.45, 1.1))
part("Rover_Antenna", rover, M["steel"], lambda b: box_bm(b, (-0.3, -0.5, 1.25), (0.03, 0.03, 0.55)))
# ---- sled (behind the rover)
sled = empty("Sled", (0, -1.95, 0))
part("Sled_Body", sled, M["steel"], lambda b: box_bm(b, (0, 0, 0.26), (1.0, 1.3, 0.14)), pivot=(0, 0, 0.26))
for s, x in (("L", -0.42), ("R", 0.42)): part(f"Sled_Runner_{s}", sled, M["track"], lambda b, x=x: box_bm(b, (x, 0, 0.08), (0.12, 1.5, 0.1)))
part("Sled_Hitch", sled, M["steel"], lambda b: box_bm(b, (0, 0.85, 0.26), (0.08, 0.6, 0.06)), pivot=(0, 1.1, 0.26))
for k, (x, y, s) in enumerate(((-0.22, 0.25, (0.5, 0.5, 0.4)), (0.25, 0.2, (0.45, 0.55, 0.5)), (0.0, -0.4, (0.7, 0.4, 0.3)))): part(f"Sled_Cargo_{k}", sled, M["cargo"], lambda b, x=x, y=y, s=s: box_bm(b, (x, y, 0.33 + s[2] / 2), s))
# ---- camp
camp = empty("Camp", (5.0, 3.0, 0))
for k, (x, y, r) in enumerate(((0, 0, 0.55), (1.3, 0.4, 0.45), (-0.9, 1.1, 0.4))):
    def dome(b, x=x, y=y, r=r):
        bmesh.ops.create_uvsphere(b, u_segments=12, v_segments=6, radius=r, matrix=Matrix.Translation((x, y, 0)));
        for v in [v for v in b.verts if v.co.z < -0.001]: v.co.z = 0.0
    part(f"Camp_Dome_{k}", camp, M["tent"], dome, pivot=(x, y, 0))
part("Camp_Mast", camp, M["steel"], lambda b: cyl_bm(b, (0.6, -0.9, 0.9), 0.03, 1.8, "z", 8), pivot=(0.6, -0.9, 0))
part("Camp_Flag", camp, M["barrel"], lambda b: box_bm(b, (0.78, -0.9, 1.6), (0.3, 0.02, 0.2)), pivot=(0.62, -0.9, 1.6))
for k in range(4): part(f"Camp_Fuel_{k}", camp, M["barrel"], lambda b, k=k: cyl_bm(b, (-0.2 + 0.3 * (k % 2), -1.4 - 0.3 * (k // 2), 0.18), 0.11, 0.36, "z", 10))
# ---- ice chunks: a separate low-poly top (4x4 quads, UVs) and a tapered body
S = P["chunk"]["size"]; seg = P["chunk"]["topSegments"]
for v, name in enumerate(P["chunk"]["variants"]):
    root = empty(f"IceChunk_{name}", (-9 + v * 3.0, 6.0, 0))
    top = bmesh.new(); bmesh.ops.create_grid(top, x_segments=seg, y_segments=seg, size=S / 2); uv = top.loops.layers.uv.new("UVMap")
    for vtx in top.verts: vtx.co.z = (rnd.random() - 0.5) * 0.07 * (0 if abs(vtx.co.x) > S / 2 - 1e-3 or abs(vtx.co.y) > S / 2 - 1e-3 else 1)   # flat rim so neighbouring tiles meet
    for f in top.faces:
        for l in f.loops: l[uv].uv = ((l.vert.co.x + S / 2) / S, (l.vert.co.y + S / 2) / S)
    obj(f"IceChunk_{name}_Top", top, M["iceTop"], root)
    body = bmesh.new(); h = 0.55 + 0.1 * v; a = S / 2; t = a * 0.85
    vs = [body.verts.new(p) for p in ((-a, -a, 0), (a, -a, 0), (a, a, 0), (-a, a, 0), (-t, -t, -h), (t, -t, -h), (t, t, -h), (-t, t, -h))]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)): body.faces.new([vs[i] for i in f])
    obj(f"IceChunk_{name}_Body", body, M["iceBody"], root)
# ---- analysis proxy
px = bmesh.new(); box_bm(px, (0, -0.6, 0.55), (1.2, 3.4, 1.1)); proxy = obj("Proxy_Rover", px, M["steel"], None)
# ---- measure and write analysis.json in glTF axes
bpy.context.view_layer.update()
def gl(v): return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
def bounds(o):
    ws = [o.matrix_world @ v.co for v in o.data.vertices]; a = gl([min(w[i] for w in ws) for i in range(3)]); b = gl([max(w[i] for w in ws) for i in range(3)]); return [[min(a[i], b[i]) for i in range(3)], [max(a[i], b[i]) for i in range(3)]]
ob = bpy.data.objects; allb = [bounds(ob[n]) for n in ("Rover_Body", "Rover_Track_L", "Rover_Track_R", "Rover_Cab")]
A = {"rover": {"bounds": [[min(b[0][i] for b in allb) for i in range(3)], [max(b[1][i] for b in allb) for i in range(3)]], "wheelRadius": 0.16, "wheelCenters": {n.name: gl(n.matrix_world.translation) for n in ob if n.name.startswith("Rover_Wheel_")}, "lamps": {n: gl(ob[n].matrix_world.translation) for n in ("Rover_Lamp_L", "Rover_Lamp_R")}, "dishPivot": gl(ob["Rover_Dish"].matrix_world.translation)},
     "sled": {"hitch": gl(ob["Sled_Hitch"].matrix_world.translation), "bounds": bounds(ob["Sled_Body"])}, "chunk": {"size": S, "topVertices": len(ob["IceChunk_A_Top"].data.vertices), "topTriangles": sum(len(p.vertices) - 2 for p in ob["IceChunk_A_Top"].data.polygons)}, "camp": {"origin": gl(camp.matrix_world.translation)}}
json.dump(A, open(os.path.join(HERE, "exports", "analysis.json"), "w"), indent=1)
# ---- poster: the rover on ice at night with its lamps on
proxy.hide_render = True
for i in range(-2, 3):
    for j in range(-2, 3):
        o = obj(f"Poster_Ice_{i}_{j}", (lambda bm: (bmesh.ops.create_grid(bm, x_segments=4, y_segments=4, size=S / 2 * 0.98), bm)[1])(bmesh.new()), M["iceTop"], None, (i * S, j * S - 1.0, 0))
w = bpy.data.worlds.new("W"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.012, 0.03, 0.045, 1)
def light(kind, loc, energy, color, size=1.0, rot=None):
    d = bpy.data.lights.new("L", kind); d.energy = energy; d.color = color
    if kind == "AREA": d.size = size
    o = bpy.data.objects.new("L", d); scene.collection.objects.link(o); o.location = loc
    if rot: o.rotation_euler = rot
    return o
light("AREA", (-3, -4, 5), 600, (0.45, 0.75, 1.0), 6); light("SPOT", (0, 1.1, 0.7), 900, (1, 0.95, 0.8), 1, (math.radians(95), 0, 0)); light("AREA", (4, 3, 4), 250, (0.47, 0.9, 0.7), 5)
bpy.ops.object.camera_add(location=(-3.6, -4.6, 1.5)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 40; cam.rotation_euler = (Vector((0, -0.8, 0.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "BLENDER_EEVEE_NEXT"; scene.render.resolution_x, scene.render.resolution_y = 1280, 720; scene.render.filepath = os.path.join(HERE, "renders", "poster.png")
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.data.objects:
    if o.type in ("MESH", "EMPTY") and not o.name.startswith("Poster_"): o.select_set(True)
bpy.context.view_layer.objects.active = rover
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "exports", "expedition.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("Poster_") for p in o.data.polygons)
print("expedition.glb", os.path.getsize(os.path.join(HERE, "exports", "expedition.glb")), "bytes", tris, "tris")
try: bpy.ops.render.render(write_still=True)
except Exception as e: print("poster failed", e)
