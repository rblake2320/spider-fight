import { MOVES, SPECIES } from "./content";
import type { Rival } from "./types";

export type RivalWebProfile = {
  speciesId: string;
  species: string;
  web: string;
  move: string;
};

/** The authored species a crew can bring to the stick, shown before the call. */
export function rivalWebProfiles(rival: Pick<Rival, "bias">): RivalWebProfile[] {
  const seen = new Set<string>();
  return rival.bias.flatMap((speciesId) => {
    const species = SPECIES[speciesId];
    if (!species || seen.has(speciesId)) return [];
    seen.add(speciesId);
    return [{ speciesId, species: species.common, web: species.web.name, move: MOVES[species.web.move].name }];
  });
}
