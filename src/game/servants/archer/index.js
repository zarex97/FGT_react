// src/game/servants/archer/index.js
import {
  AnastasiaSkills,
  AnastasiaTemplate,
  AnastasiaActions,
  AnastasiaNPs,
  AnastasiaTriggerEffects,
} from "./Anastasia_unit.js";
import {
  GoghSkills,
  GoghTemplate,
  GoghActions,
  GoghNPs,
  GoghTriggerEffects,
} from "./Gogh_unit.js";

export const ArcherServants = {
  Anastasia: {
    template: AnastasiaTemplate,
    skills: AnastasiaSkills,
    actions: AnastasiaActions,
    noblePhantasms: AnastasiaNPs,
    triggerEffects: {}, // ADD this (empty for Anastasia since she has no trigger effects)
  },
  Gogh: {
    template: GoghTemplate,
    skills: GoghSkills,
    actions: GoghActions,
    noblePhantasms: GoghNPs,
    triggerEffects: GoghTriggerEffects,
  },
  // Add other Archer servants here
};
