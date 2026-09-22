import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = resolve(root, "assets/3d/original-yard-spider.blend");
const inspector = resolve(root, "scripts/inspect-original-spider-rig.py");
const candidates = [process.env.BLENDER_PATH, "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe", "blender"].filter(Boolean);
const blender = candidates.find((candidate) => candidate === "blender" || existsSync(candidate));

if (!blender) throw new Error("Blender was not found. Set BLENDER_PATH to verify the saved spider source.");
const output = execFileSync(blender, ["-b", source, "--python", inspector], { cwd: root, encoding: "utf8" });
const resultLine = output.split(/\r?\n/).find((line) => line.startsWith("{\"bones\""));
if (!resultLine) throw new Error(`Spider source inspector produced no report:\n${output}`);
const result = JSON.parse(resultLine);
if (result.missingBones.length || result.missingActions.length) throw new Error(`Saved spider source is incomplete: ${resultLine}`);
console.log(`[spider-rig] saved source valid: ${result.bones} bones, ${result.actions.length} actions`);
