import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  HIDE_COST,
  HOUSE_MAKER,
  HOUSE_STALL,
  MAX_HIDES,
  applyMillKits,
  canDrape,
  canLicenseStall,
  decodeAnyTicket,
  decodeHideTicket,
  drape,
  encodeHideTicket,
  encodeMillwright,
  hideSrcOf,
  isHideSrc,
  makeHide,
  millKitLine,
  millwrightFee,
  rejectModelFile,
  splitPurse,
  stallMillOf,
  stripHide,
} from "./hides.ts";
import { BAY_BY_ID } from "./bay.ts";
import { mulberry32 } from "./rng.ts";
import { rollSpider } from "./spiders.ts";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("a 3D model file is refused and a picture is asked for instead", () => {
  assert.match(
    rejectModelFile({ name: "tarantula.glb", type: "model/gltf-binary", size: 1200 }) ?? "",
    /picture of the spider/,
  );
  assert.match(rejectModelFile({ name: "spider.fbx", type: "", size: 40 }) ?? "", /picture/);
  assert.match(rejectModelFile({ name: "Avatar.vrca", type: "application/octet-stream", size: 8000 }) ?? "", /picture of the spider/);
  assert.equal(rejectModelFile({ name: "yard-orb.png", type: "image/png", size: 2400 }), null);
});

test("hide tickets round-trip a picture another yard can hang", () => {
  const ticket = encodeHideTicket({ name: "Porch orb", src: PNG });
  assert.ok(ticket.startsWith("SFHIDE.1."));
  const decoded = decodeHideTicket(`  ${ticket}  `);
  assert.ok(!("error" in decoded));
  if ("error" in decoded) return;
  assert.equal(decoded.name, "Porch orb");
  assert.equal(decoded.src, PNG);
  assert.ok(isHideSrc(decoded.src));
  const bad = decodeHideTicket("not-a-ticket");
  assert.ok("error" in bad);
});

test("the rack refuses a seventh hide and duplicate pictures", () => {
  const hides = Array.from({ length: MAX_HIDES }, (_, i) => {
    const made = makeHide(`Hide ${i}`, PNG.replace("AfFcSJ", `AfFcS${i}`), []);
    assert.ok("hide" in made);
    return "hide" in made ? made.hide : undefined;
  }).filter((hide): hide is NonNullable<typeof hide> => Boolean(hide));
  const full = makeHide("Overflow", PNG, hides);
  assert.ok("error" in full);
  const first = makeHide("One", PNG, []);
  assert.ok("hide" in first);
  if (!("hide" in first)) return;
  const dup = makeHide("Two", PNG, [first.hide]);
  assert.ok("error" in dup);
});

test("draping a hide costs purse and stays until stripped", () => {
  const spider = rollSpider(mulberry32(9), { speciesId: "hentz", stage: "adult" });
  const made = makeHide("Clay mill", PNG, []);
  assert.ok("hide" in made);
  if (!("hide" in made)) return;
  assert.equal(canDrape(spider, made.hide, 10, 0), `Need $${HIDE_COST}`);
  assert.equal(canDrape({ ...spider, stage: "nymph" }, made.hide, 80, 0), "Let the nymph harden first");
  assert.equal(canDrape(spider, made.hide, 80, 0), null);
  const worn = drape(spider, made.hide);
  assert.equal(worn.hideId, made.hide.id);
  assert.equal(hideSrcOf(worn, [made.hide]), PNG);
  assert.equal(canDrape(worn, made.hide, 80, 0), "Already wearing that hide");
  assert.equal(stripHide(worn).hideId, undefined);
});

test("a millwright ticket carries hide, steel, maker, and a 15 percent house cut", () => {
  assert.deepEqual(splitPurse(40), { house: 6, maker: 34 });
  const ticket = encodeMillwright({
    name: "Pit mill",
    src: PNG,
    maker: "Porch Crew",
    kits: { eye: "bonnet-eye", legs: "not-a-job" },
    price: 40,
  });
  assert.ok(ticket.startsWith("SFMILL.1."));
  const mill = decodeAnyTicket(ticket);
  assert.ok(!("error" in mill));
  if ("error" in mill) return;
  assert.equal(mill.maker, "Porch Crew");
  assert.equal(mill.price, 40);
  assert.equal(mill.kits.eye, "bonnet-eye");
  assert.equal(mill.kits.legs, undefined);
  assert.equal(millwrightFee(mill, "Porch Crew"), 0);
  assert.equal(millwrightFee(mill, "Other Yard"), 40);
  const spider = rollSpider(mulberry32(11), { speciesId: "hentz", stage: "adult" });
  const bolted = applyMillKits(spider, mill.kits);
  assert.equal(bolted.grafts?.eye, "bonnet-eye");
});

test("house mills hang a picture, bolt listed steel, and always pay the house", () => {
  const tape = stallMillOf("tape-mill");
  assert.ok(tape);
  if (!tape) return;
  assert.equal(tape.maker, HOUSE_MAKER);
  assert.ok(isHideSrc(tape.src));
  assert.equal(millKitLine(tape.kits), "Joint tape");
  assert.equal(millwrightFee(tape, HOUSE_MAKER), 36);
  assert.equal(canLicenseStall(tape, 48, 0, [], "Porch Crew"), null);
  assert.equal(canLicenseStall(tape, 10, 0, [], "Porch Crew"), "Need $36");
  const optic = stallMillOf("optic-mill");
  assert.ok(optic);
  if (!optic) return;
  assert.match(canLicenseStall(optic, 400, 0, [], "Porch Crew") ?? "", /State Circuit/);
  assert.equal(canLicenseStall(optic, 400, 4, [], "Porch Crew"), null);
  for (const mill of HOUSE_STALL) {
    assert.ok(existsSync(resolve(process.cwd(), "public", mill.src.replace(/^\//, ""))), mill.src);
    for (const [slot, id] of Object.entries(mill.kits)) {
      assert.equal(BAY_BY_ID[id!]?.slot, slot, `${mill.id} ${slot}`);
    }
    assert.ok(mill.name.length <= 18, mill.name);
  }
});
