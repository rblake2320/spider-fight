"""Create Spider Fight's original, low-poly training spider and export it for web/engines.

Run with Blender 5.1 from the repo root. This script never imports third-party geometry.
"""
import bpy
import json
import math
import os
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND = os.path.join(ROOT, "assets", "3d", "original-yard-spider.blend")
FBX = os.path.join(ROOT, "assets", "3d", "original-yard-spider.fbx")
GLB = os.path.join(ROOT, "public", "models", "original-yard-spider.glb")
PREVIEW = os.path.join(ROOT, "public", "images", "original-yard-spider.png")
REPORT = os.path.join(ROOT, "assets", "3d", "original-yard-spider.rig-report.json")

for path in (BLEND, FBX, GLB, PREVIEW, REPORT):
    os.makedirs(os.path.dirname(path), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for data in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.armatures):
    pass

scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 0.01
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 768
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = PREVIEW
scene.world.color = (0.014, 0.009, 0.005)

def material(name, color, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat

chitin = material("MAT-chitin", (0.09, 0.023, 0.015), 0.0, 0.42)
accent = material("MAT-training-band", (0.65, 0.12, 0.025), 0.15, 0.35)
eye = material("MAT-eyes", (0.85, 0.36, 0.04), 0.1, 0.2)

def smooth(obj, mat):
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True

def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj, mat)
    return obj

# Rig: the exact game contract names, with four serial bones per leg.
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
rig = bpy.context.object
rig.name = "RIG-original-yard-spider"
rig.data.name = "RIG-original-yard-spider"
edit = rig.data.edit_bones
edit.remove(edit[0])
root = edit.new("root")
root.head, root.tail = (0, 0, 0), (0, 0, 0.34)
abdomen = edit.new("abdomen")
abdomen.head, abdomen.tail, abdomen.parent = (0, 0, 0.34), (0, 0, 0.73), root
thorax = edit.new("cephalothorax")
thorax.head, thorax.tail, thorax.parent = (0, 0, 0.58), (0, 0, 1.02), abdomen
for side, sign in (("l", 1), ("r", -1)):
    for index in range(1, 5):
        y = 0.45 - (index - 1) * 0.27
        head = Vector((sign * 0.22, y, 0.62))
        parent = thorax
        for part, length, dz in (("coxa", 0.34, 0.04), ("femur", 0.48, -0.12), ("tibia", 0.52, -0.19), ("tarsus", 0.38, -0.10)):
            tail = head + Vector((sign * length, 0.06 if index < 3 else -0.06, dz))
            bone = edit.new(f"leg_{side}_{index}_{part}")
            bone.head, bone.tail, bone.parent = head, tail, parent
            bone.use_connect = False
            head, parent = tail, bone
bpy.ops.object.mode_set(mode="OBJECT")

# Body and eyes attach to the rig; segmented leg tubes attach to their matching bones.
abdomen_mesh = sphere("GEO-abdomen", (0, -0.22, 0.63), (0.38, 0.47, 0.31), chitin)
abdomen_mesh.parent = rig
thorax_mesh = sphere("GEO-cephalothorax", (0, 0.25, 0.65), (0.31, 0.34, 0.25), chitin)
thorax_mesh.parent = rig
for x in (-0.12, -0.04, 0.04, 0.12):
    obj = sphere("GEO-eye", (x, 0.52, 0.73), (0.035, 0.025, 0.035), eye)
    obj.parent = rig
bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.035, major_segments=16, minor_segments=6, location=(0, -0.2, 0.65), rotation=(math.pi / 2, 0, 0))
band = bpy.context.object
band.name = "GEO-training-band"
smooth(band, accent)
band.parent = rig

for side, sign in (("l", 1), ("r", -1)):
    for index in range(1, 5):
        for part in ("coxa", "femur", "tibia", "tarsus"):
            bone = rig.pose.bones[f"leg_{side}_{index}_{part}"]
            data_bone = rig.data.bones[bone.name]
            head, tail = Vector(data_bone.head_local), Vector(data_bone.tail_local)
            direction = tail - head
            bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04 if part in ("coxa", "femur") else 0.028, depth=direction.length)
            leg = bpy.context.object
            leg.name = f"GEO-{bone.name}"
            smooth(leg, chitin)
            leg.matrix_world = Matrix.Translation((head + tail) / 2) @ direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
            # Keep the original authored leg position under the root rig. The pose library
            # remains on the named bones for Unreal/VRChat retargeting; the web preview uses
            # the neutral silhouette, so it must never inherit an exporter-specific bone offset.
            leg.parent = rig
            leg.matrix_parent_inverse = rig.matrix_world.inverted()

# Each game move is a real, named action. Legs alternate their stance so every pose reads in a preview.
actions = ["idle", "intro", "lunge", "grapple", "feint", "brace", "yank", "drop", "hurt", "ko"]
for action_index, action_name in enumerate(actions):
    action = bpy.data.actions.new(action_name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    strength = 0.04 + action_index * 0.012
    if action_name == "lunge":
        rig.location.y = 0.22
    elif action_name in ("hurt", "ko", "drop"):
        rig.rotation_euler.x = 0.22 if action_name != "ko" else 0.7
    else:
        rig.location.y = 0
        rig.rotation_euler = (0, 0, 0)
    rig.keyframe_insert("location", frame=1)
    rig.keyframe_insert("rotation_euler", frame=1)
    for side in ("l", "r"):
        for index in range(1, 5):
            pose = rig.pose.bones[f"leg_{side}_{index}_femur"]
            pose.rotation_mode = "XYZ"
            pose.rotation_euler.z = strength * (1 if (index + action_index) % 2 else -1)
            pose.keyframe_insert("rotation_euler", frame=1)
            pose.rotation_euler.z *= -1
            pose.keyframe_insert("rotation_euler", frame=18)
    rig.location.y = 0
    rig.rotation_euler = (0, 0, 0)

# Studio proof render.
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
floor = bpy.context.object
floor.name = "GEO-studio-floor"
smooth(floor, material("MAT-floor", (0.025, 0.012, 0.007), 0.0, 0.7))
bpy.ops.object.light_add(type="AREA", location=(3.2, -3.4, 4.4))
bpy.context.object.data.energy, bpy.context.object.data.shape = 900, "DISK"
bpy.context.object.data.size = 4
bpy.ops.object.light_add(type="AREA", location=(-3, -1, 2.2))
bpy.context.object.data.energy, bpy.context.object.data.color = 450, (0.24, 0.4, 1.0)
bpy.context.object.data.size = 3
bpy.ops.object.light_add(type="AREA", location=(0, 3, 3.4))
bpy.context.object.data.energy, bpy.context.object.data.color = 850, (1.0, 0.18, 0.05)
bpy.context.object.data.size = 2
bpy.ops.object.camera_add(location=(3.2, -4.7, 2.5))
camera = bpy.context.object
camera.name = "CAM-spider-proof"
scene.camera = camera
direction = Vector((0, 0.05, 0.55)) - camera.location
camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 50

# Apply neutral pose for saved source and all exports.
rig.animation_data.action = bpy.data.actions["idle"]
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=GLB, export_format="GLB", export_apply=True, export_animations=True, export_skins=True, export_yup=True)
bpy.ops.export_scene.fbx(filepath=FBX, use_selection=False, apply_unit_scale=True, apply_scale_options="FBX_SCALE_ALL", object_types={"MESH", "ARMATURE"}, bake_anim=True, bake_anim_use_all_actions=True, bake_anim_use_all_bones=True, axis_forward="-Z", axis_up="Y")

triangles = sum(len(mesh.loop_triangles) for mesh in bpy.data.meshes)
for mesh in bpy.data.meshes:
    mesh.calc_loop_triangles()
triangles = sum(len(mesh.loop_triangles) for mesh in bpy.data.meshes)
report = {
    "schemaVersion": 1,
    "source": "Blender 5.1 generated original project asset",
    "armature": rig.name,
    "bones": sorted(b.name for b in rig.data.bones),
    "actions": sorted(a.name for a in bpy.data.actions if a.name in actions),
    "triangleCount": triangles,
    "webFileBytes": os.path.getsize(GLB),
    "preview": "public/images/original-yard-spider.png",
    "unreal": {"sourceIkRig": "IKR_OriginalYardSpider_Source", "targetIkRig": "IKR_OriginalYardSpider_Target", "retargetPose": "SpiderNeutral"},
    "vrchat": {"rigType": "Generic", "rootAnimatorAvatarReference": True, "playableLayers": ["Base", "Action", "FX"], "rootControllerBlank": True, "writeDefaults": "Off", "localBuildTest": "required"},
}
with open(REPORT, "w", encoding="utf-8") as handle:
    json.dump(report, handle, indent=2)
    handle.write("\n")
print(json.dumps({"blend": BLEND, "glb": GLB, "fbx": FBX, "preview": PREVIEW, "report": REPORT, "triangles": triangles, "bytes": os.path.getsize(GLB)}))
