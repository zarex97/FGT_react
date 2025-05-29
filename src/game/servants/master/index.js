// src/game/servants/master/index.js
import {
  MasterSkills,
  MasterTemplate,
  MasterActions,
  MasterNPs,
  MasterTriggerEffects,
} from "./Master_unit.js";

export const Masters = {
  Master: {
    template: MasterTemplate,
    skills: MasterSkills,
    actions: MasterActions,
    noblePhantasms: MasterNPs,
    triggerEffects: {},
  },
  // Add other master here here
};
