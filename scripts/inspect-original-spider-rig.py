"""Fail loudly when the saved Blender source loses the Spider Fight action library."""
import bpy
import json
import sys

EXPECTED_ACTIONS = {"idle", "intro", "lunge", "grapple", "feint", "brace", "yank", "drop", "hurt", "ko"}
EXPECTED_BONES = {"root", "abdomen", "cephalothorax"}
for side in ("l", "r"):
    for leg in range(1, 5):
        for part in ("coxa", "femur", "tibia", "tarsus"):
            EXPECTED_BONES.add(f"leg_{side}_{leg}_{part}")

rig = bpy.data.objects.get("RIG-original-yard-spider")
bones = {bone.name for bone in rig.data.bones} if rig else set()
actions = {action.name for action in bpy.data.actions}
missing_bones = sorted(EXPECTED_BONES - bones)
missing_actions = sorted(EXPECTED_ACTIONS - actions)
result = {"bones": len(bones), "actions": sorted(actions & EXPECTED_ACTIONS), "missingBones": missing_bones, "missingActions": missing_actions}
print(json.dumps(result))
if not rig or missing_bones or missing_actions:
    sys.exit(1)
