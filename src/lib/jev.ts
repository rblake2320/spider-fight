import { createServerFn } from "@tanstack/react-start";
import type { BoutSnap, CatchSnap, StickSnapshot } from "./jev-types";

export type { BoutSnap, CatchSnap, FighterSnap, StickSnapshot } from "./jev-types";

export const jevStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getTypeSafeKey } = await import("./jev.server");
  return { live: Boolean(getTypeSafeKey()) };
});

export const askRivalMove = createServerFn({ method: "POST" })
  .validator((input: StickSnapshot) => input)
  .handler(async ({ data }) => {
    const { decideRivalMove } = await import("./jev.server");
    return decideRivalMove(data);
  });

export const judgeBout = createServerFn({ method: "POST" })
  .validator((input: BoutSnap) => input)
  .handler(async ({ data }) => {
    const { judgeBout: run } = await import("./jev.server");
    return run(data);
  });

export const appraiseCatch = createServerFn({ method: "POST" })
  .validator((input: CatchSnap) => input)
  .handler(async ({ data }) => {
    const { appraiseCatch: run } = await import("./jev.server");
    return run(data);
  });
