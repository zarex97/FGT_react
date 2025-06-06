// EventTypes.js
export const EventTypes = {
  // Movement Events
  MOVE_START: "MOVE_START",
  MOVE_END: "MOVE_END",

  // Turn/Round Events
  TURN_START: "TURN_START",
  TURN_END: "TURN_END",
  ROUND_START: "ROUND_START",
  ROUND_END: "ROUND_END",

  // Combat Events
  COMBAT_INITIATED: "COMBAT_INITIATED",
  SUCCESSFUL_ATTACK: "SUCCESSFUL_ATTACK",
  RECEIVE_DAMAGE: "RECEIVE_DAMAGE",
  HP_LOSS: "HP_LOSS",
  UNIT_DEFEATED: "UNIT_DEFEATED",

  // Skill/Action Events
  USE_SKILL: "USE_SKILL",
  USE_NP: "USE_NP",
  USE_ACTION: "USE_ACTION",

  // Detection Events
  DETECTION_ATTEMPT: "DETECTION_ATTEMPT",

  // Effect Events
  EFFECT_APPLIED: "EFFECT_APPLIED",
  EFFECT_EXPIRED: "EFFECT_EXPIRED",

  // Custom Events (can be added as needed)
  CUSTOM: "CUSTOM",
};
