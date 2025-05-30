export const CivilianAttributes = {
  name: "Civilian",
  class: "Civilian",
  // Base Stats
  baseHp: 1, // Dies instantly when attacked
  maxHp: 1,
  baseDef: 0,
  baseMovementRange: 3,
  rangeOfBasicAttack: 0, // Cannot attack
  // Combat Stats
  strength: 0,
  magic: 0,
  // Vision and Targeting
  visionRange: 3,
  // Agility Stats
  baseAgility: 10,
  maxAgility: 10,
  // Luck Stats
  baseLuck: 5,
  maxLuck: 5,
  // Sustainability
  sustainability: null,
  // Visual
  sprite: "dist/sprites/civilian_portrait.webp",
  // No combat capabilities
  combatSent: [],
  combatReceived: {},
  // Contract system (civilians don't participate in contracts)
  contract: {
    contractStatus: "Free",
    party: "Civilian",
    contractedTo: null,
  },
};

export const CivilianNPs = {};

// Civilian Actions
export const CivilianActions = {};

export const CivilianSkills = {};

export const CivilianTriggerEffects = {};

export const CivilianTemplate = {
  ...CivilianAttributes,
  statusIfHit: null,
  backUpStatus: null,
  triggerEffects: [],
  skills: [], // No skills
  noblePhantasms: [], // No Noble Phantasms
  reactions: [], // No reactions
  actions: {
    common: [], // Only movement, no actions
    unique: [],
  },
};
