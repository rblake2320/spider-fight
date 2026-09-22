#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ACTIONS = ["idle", "intro", "lunge", "grapple", "feint", "brace", "yank", "drop", "hurt", "ko"];
const REQUIRED_BONES = ["root", "abdomen", "cephalothorax"];
const LEG_BONES = ["coxa", "femur", "tibia", "tarsus"];

function requireAll(errors, actual, expected, label) {
  const values = new Set(actual ?? []);
  for (const value of expected) if (!values.has(value)) errors.push(`rig report missing ${label}: ${value}`);
}

export function validateSpiderRig(contract, root = process.cwd()) {
  const errors = [];
  const asset = contract?.asset;
  const skeleton = contract?.skeleton;
  if (contract?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!["contract-only", "ready"].includes(contract?.status)) errors.push("status must be contract-only or ready");
  if (!asset?.sourceUrl?.startsWith("https://")) errors.push("asset.sourceUrl must be an HTTPS URL");
  if (contract?.status === "contract-only") {
    if (asset?.license !== "UNVERIFIED") errors.push("contract-only assets must retain license UNVERIFIED");
    if (asset?.sourceFile || Object.values(asset?.exports ?? {}).some(Boolean)) errors.push("contract-only assets cannot list source or export files");
  } else {
    if (!asset?.license || asset.license === "UNVERIFIED") errors.push("ready assets require a verified license");
    for (const [format, file] of Object.entries(asset?.exports ?? {})) {
      if (!file || !existsSync(resolve(root, file))) errors.push(`missing ${format} export: ${file ?? "none"}`);
      else if (format === "web" && statSync(resolve(root, file)).size > contract.limits.webFileMb * 1024 * 1024) errors.push("web export exceeds webFileMb limit");
    }
    if (!asset?.sourceFile || !existsSync(resolve(root, asset.sourceFile))) errors.push(`missing source file: ${asset?.sourceFile ?? "none"}`);
    if (!asset?.rigReport || !existsSync(resolve(root, asset.rigReport))) {
      errors.push(`missing rig report: ${asset?.rigReport ?? "none"}`);
    } else {
      const report = JSON.parse(readFileSync(resolve(root, asset.rigReport), "utf8"));
      requireAll(errors, report.bones, skeleton?.requiredBones ?? [], "bone");
      requireAll(errors, report.actions, REQUIRED_ACTIONS, "action");
      if (!Number.isInteger(report.triangleCount) || report.triangleCount > contract?.limits?.webTriangles) errors.push("rig report exceeds webTriangles limit");
      if (!Number.isInteger(report.webFileBytes) || report.webFileBytes > contract?.limits?.webFileMb * 1024 * 1024) errors.push("rig report exceeds webFileMb limit");
      if (!report?.unreal?.sourceIkRig || !report?.unreal?.targetIkRig || !report?.unreal?.retargetPose) errors.push("rig report needs source/target IK rigs and a retarget pose");
      const vrchat = report?.vrchat;
      if (vrchat?.rigType !== "Generic") errors.push("rig report requires a Generic VRChat rig");
      if (!vrchat?.rootAnimatorAvatarReference || !vrchat?.rootControllerBlank) errors.push("rig report requires a configured root Animator");
      if (JSON.stringify(vrchat?.playableLayers) !== JSON.stringify(["Base", "Action", "FX"])) errors.push("rig report requires Base, Action, FX playable layers");
      if (vrchat?.writeDefaults !== "Off" || vrchat?.localBuildTest !== "required") errors.push("rig report requires consistent Write Defaults Off and local Build & Test");
    }
  }
  const bones = new Set(skeleton?.requiredBones ?? []);
  for (const bone of REQUIRED_BONES) if (!bones.has(bone)) errors.push(`missing required bone: ${bone}`);
  for (const side of ["l", "r"]) for (let leg = 1; leg <= 4; leg += 1) for (const part of LEG_BONES) {
    const bone = `leg_${side}_${leg}_${part}`;
    if (!bones.has(bone)) errors.push(`missing required bone: ${bone}`);
  }
  for (const action of REQUIRED_ACTIONS) if (!(contract?.actions ?? []).includes(action)) errors.push(`missing action: ${action}`);
  for (const chain of skeleton?.retargetChains ?? []) if (!/^(body|leg_[lr]_[1-4])$/.test(chain)) errors.push(`invalid retarget chain: ${chain}`);
  if (skeleton?.retargetChains?.length !== 9) errors.push("retargetChains must have body plus eight leg chains");
  return errors;
}

function main() {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const root = resolve(here, "..");
  const contractPath = resolve(root, "assets/3d/spider-rig.contract.json");
  const errors = validateSpiderRig(JSON.parse(readFileSync(contractPath, "utf8")), root);
  if (errors.length) {
    console.error(`[spider-rig] failed: ${errors.join("; ")}`);
    process.exit(1);
  }
  console.log("[spider-rig] export valid: 8 leg chains, 10 fight actions, Unreal and VRChat gates active");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
