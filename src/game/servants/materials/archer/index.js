// src/game/servants/materials/archer/index.js

import {
  IceGolemSkills,
  IceGolemTemplate,
  IceGolemActions,
  IceGolemNPs,
  IceGolemTriggerEffects,
} from "./ArcherMaterials.js";

export const ArcherMaterials = {
  IceGolem: {
    template: IceGolemTemplate,
    skills: IceGolemSkills,
    actions: IceGolemActions,
    noblePhantasms: IceGolemNPs,
    triggerEffects: {},
  },
  // Add other Archer materials here
};
