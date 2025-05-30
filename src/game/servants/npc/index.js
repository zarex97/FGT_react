// src/game/servants/npc/index.js
import {
  CivilianSkills,
  CivilianTemplate,
  CivilianActions,
  CivilianNPs,
  CivilianTriggerEffects,
} from "./Civilian_unit.js";

export const Civilians = {
  Civilian: {
    template: CivilianTemplate,
    skills: CivilianSkills,
    actions: CivilianActions,
    noblePhantasms: CivilianNPs,
    triggerEffects: {},
  },
  // Add other master here here
};
