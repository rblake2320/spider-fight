import assert from "node:assert/strict";
import test from "node:test";
import { SPECIES_LIST } from "./content.ts";
import { millFingerprint, millLookOf } from "./mill-look.ts";

test("every species keeps its own mill silhouette", () => {
  const seen = new Map<string, string>();
  for (const spec of SPECIES_LIST) {
    const look = millLookOf(spec.id);
    const fp = millFingerprint(look);
    const clone = seen.get(fp);
    assert.equal(clone, undefined, `${spec.id} clones ${clone ?? "nobody"}`);
    seen.set(fp, spec.id);
  }
});

test("a widow is not a recolored Hentz", () => {
  const hentz = millLookOf("hentz");
  const widow = millLookOf("widow");
  assert.equal(widow.mark, "hourglass");
  assert.equal(hentz.mark, "folium");
  assert.notEqual(widow.abdShape, hentz.abdShape);
  assert.ok(widow.shiny > 0.6);
  assert.ok(widow.legThick < hentz.legThick);
  assert.notEqual(widow.skin, hentz.skin);
});

test("a bird-eater reads bigger than a jumper", () => {
  const pit = millLookOf("birdeater");
  const thread = millLookOf("jumper");
  assert.ok(pit.scale > thread.scale * 1.8);
  assert.ok(pit.hair > 0.8);
  assert.equal(thread.eyes, "jumper");
  assert.equal(pit.eyes, "tarantula");
});

test("recluse wears a violin, spiny wears spines", () => {
  assert.equal(millLookOf("recluse").mark, "violin");
  assert.equal(millLookOf("spiny").mark, "spines");
  assert.equal(millLookOf("spiny").abdShape, "crab");
  assert.equal(millLookOf("arrowhead").abdShape, "triangle");
  assert.equal(millLookOf("huntsman").legSpread > 1.3, true);
});

test("hourglass stays in the widow family", () => {
  for (const spec of SPECIES_LIST) {
    if (millLookOf(spec.id).mark === "hourglass") {
      assert.ok(spec.id === "widow" || spec.id === "brownwidow", spec.id);
    }
  }
});

test("hentz male and female keep different skins", () => {
  assert.notEqual(millLookOf("hentz", "female").skin, millLookOf("hentz", "male").skin);
});
