# Spider 3D rig and export contract

The game already renders eight articulated legs and the ten actions below in Canvas. This contract keeps a later 3D upgrade faithful to that game feel instead of replacing it with a generic creature animation.

`assets/3d/spider-rig.contract.json` is the canonical intake manifest. The repository now includes an original, low-poly `Original Yard Spider` as a Blender source, GLB web export, FBX engine export, and proof render. Run `npm run check:spider-rig` before accepting any model or export, then run `npm run verify:spider-rig-source` on a Blender-equipped machine to reopen the saved source and prove all bones and actions persisted. The checker reads the generated rig report and rejects missing bones, actions, export limits, Unreal setup, or VRChat setup. A third-party model stays `contract-only` until its license and downloadable source have been checked; that state cannot name any packaged files.

## Blender

Create an armature with `root`, `abdomen`, `cephalothorax`, and four `coxa → femur → tibia → tarsus` chains on each side. Apply rotation and scale, use outward normals, keep at most four weights per vertex, and author one named action for each game pose: `idle`, `intro`, `lunge`, `grapple`, `feint`, `brace`, `yank`, `drop`, `hurt`, and `ko`. Rebuild the original asset with `"C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" -b --python scripts/create-original-spider-rig.py`.

Export a web preview as GLB with skins and animations; it is capped at 30,000 triangles, 15 MB, and 1024 px textures. Export the engine rig as FBX with baked actions, `-Z` forward and `Y` up.

## Unreal

Set `abdomen` as the pelvis and make retarget chains named `body`, `leg_l_1` through `leg_l_4`, and `leg_r_1` through `leg_r_4`. Create both source and target IK Rigs, then create a named `SpiderNeutral` retarget pose before mapping the chains. Preview every action in the IK Retargeter and resolve every output-log warning before accepting an export. Epic’s retargeter can transfer between skeletons with different bone counts or orientations, but equivalent chain names and a matched retarget pose keep this spider’s eight-leg contact readable. [Epic IK Rig Retargeting](https://dev.epicgames.com/documentation/unreal-engine/ik-rig-animation-retargeting-in-unreal-engine)

## VRChat

This is a non-humanoid avatar: import it as a Generic FBX rig, reference that avatar object from the root Animator, leave its root controller blank, and place its controllers in Base, Action, and FX playable layers. Keep Write Defaults Off consistently across the controllers. Use Build & Test before any upload. [VRChat generic-avatar requirements](https://creators.vrchat.com/avatars/#generic-avatars)

The supplied [Sketchfab spider URL](https://sketchfab.com/3d-models/spider-eratigena-atrica-464d4c6773684786ac488a65d7020ff1) remains a research reference only. Its page could not be read by the project tooling, so no file, texture, or license claim from it is included here.
