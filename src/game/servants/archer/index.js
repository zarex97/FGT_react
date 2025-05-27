// src/game/servants/archer/index.js
import {
  AnastasiaSkills,
  AnastasiaTemplate,
  AnastasiaActions,
  AnastasiaNPs,
} from "./Anastasia_unit";
import { GoghSkills, GoghTemplate, GoghActions, GoghNPs } from "./Gogh_unit";

export const ArcherServants = {
  Anastasia: {
    template: AnastasiaTemplate,
    skills: AnastasiaSkills,
    actions: AnastasiaActions,
    noblePhantasms: AnastasiaNPs,
  },
  Gogh: {
    template: GoghTemplate,
    skills: GoghSkills,
    actions: GoghActions,
    noblePhantasms: GoghNPs,
  },
  // Add other Archer servants here
};
