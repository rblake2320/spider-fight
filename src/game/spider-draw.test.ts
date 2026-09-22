import assert from "node:assert/strict";
import test from "node:test";
import { poseBlend, poseLegs, silkTaut } from "./spider-draw.ts";

test("pose blends ease in instead of snapping", () => {
  assert.equal(poseBlend(0, "lunge"), 0);
  assert.equal(poseBlend(1, "lunge"), 1);
  const mid = poseBlend(0.03, "lunge");
  assert.ok(mid > 0.1 && mid < 0.7);
  assert.ok(poseBlend(0.05, "lunge") > poseBlend(0.02, "lunge"));
});

test("a lunge throws the front legs farther than idle", () => {
  const idle = poseLegs("idle", 0);
  const lunge = poseLegs("lunge", 0);
  const frontIdle = idle[0]!.sweep + idle[1]!.sweep;
  const frontLunge = lunge[0]!.sweep + lunge[1]!.sweep;
  assert.ok(frontLunge > frontIdle + 0.8);
});

test("a KO curls the mill instead of matching idle", () => {
  const idle = poseLegs("idle", 0);
  const ko = poseLegs("ko", 0);
  const idleLift = idle.reduce((sum, leg) => sum + leg.lift, 0);
  const koLift = ko.reduce((sum, leg) => sum + leg.lift, 0);
  assert.ok(koLift > idleLift);
});

test("silk goes slack on a drop and stays taut on a still mill", () => {
  assert.ok(silkTaut(0, 0, "idle") > 0.9);
  assert.ok(silkTaut(0.8, 3, "drop") < silkTaut(0, 0, "idle"));
});
