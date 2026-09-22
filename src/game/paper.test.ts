import assert from "node:assert/strict";
import test from "node:test";
import { pushPaper, writeClip } from "./paper.ts";

test("the stick paper names the winner and the wraps", () => {
  const win = writeClip({
    date: "2026-9-21",
    fighter: "Cinder",
    rival: "tom",
    out: { won: true, enemyName: "Alley Tom", stripped: [], sky: "storm" },
  });
  assert.match(win.headline, /Cinder took Alley Tom/);
  assert.match(win.headline, /storm/);
  const loss = writeClip({
    date: "2026-9-21",
    fighter: "Cinder",
    rival: "june",
    out: { won: false, enemyName: "June Bug", stripped: ["porch-twine"], sky: undefined },
  });
  assert.match(loss.headline, /dropped the wraps/);
  const paper = pushPaper([], win);
  assert.equal(pushPaper(paper, win).length, 1);
  assert.equal(pushPaper(paper, loss)[0]?.fighter, "Cinder");
});
