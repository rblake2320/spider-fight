import assert from "node:assert/strict";
import test from "node:test";
import { callKo, callRound } from "./caller.ts";

test("the stick caller names the spider who edged the round", () => {
  const line = callRound({
    player: "Cinder",
    enemy: "Alley Tom",
    result: "edge",
    move: "lunge",
    timing: true,
    signature: true,
    venom: false,
    round: 2,
  });
  assert.match(line, /Cinder/);
  assert.match(callKo(true, "Cinder", "Alley Tom"), /holds the stick/);
  assert.match(callKo(false, "Cinder", "Alley Tom"), /takes it/);
});
