import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { validateSpiderRig } from "./check-spider-rig.mjs";

const contract = JSON.parse(readFileSync(new URL("../assets/3d/spider-rig.contract.json", import.meta.url), "utf8"));

test("the spider rig contract holds every current fight action and eight leg chains", () => {
  assert.deepEqual(validateSpiderRig(contract), []);
});

test("a shipped asset cannot evade provenance or limb validation", () => {
  const bad = structuredClone(contract);
  bad.status = "ready";
  bad.asset.license = "UNVERIFIED";
  bad.asset.exports.web = "public/models/spider.glb";
  bad.skeleton.requiredBones = bad.skeleton.requiredBones.filter((bone) => bone !== "leg_r_4_tarsus");
  const errors = validateSpiderRig(bad);
  assert.ok(errors.includes("ready assets require a verified license"));
  assert.ok(errors.includes("missing required bone: leg_r_4_tarsus"));
  assert.ok(errors.some((error) => error.startsWith("missing web export:")));
});
