// src/game/servants/materials/archer/ArcherMaterials.js
import { MicroAction } from "../../../MicroAction.js";
import { Skill } from "../../../Skill.js";
import { TargetingType } from "../../../targeting/TargetingTypes.js";
import { Combat } from "../../../Combat.js";
import { VehicleUtils } from "../../../utils/VehicleUtils.js";
// ===== Summer Anastasia =====

// ===== Water Boat DEFINITIONS =====

export const waterBoatNPs = {};

// waterBoat Actions
export const waterBoatActions = {};

export const waterBoatTriggerEffects = {};

// Ice Golem Skills
export const waterBoatSkills = {};

// Ice Golem Attributes
export const waterBoatAttributes = {
  name: "Water Boat",
  class: "ArcherMaterial",
  type: "Vehicle",

  // Base Stats (weaker than servants but still combat capable)
  baseHp: 200,
  maxHp: 200,
  baseDef: 2,
  baseMovementRange: 3,
  rangeOfBasicAttack: 1,

  // Combat Stats
  strength: 60,
  magic: 40,

  // Vision and Targeting
  visionRange: 3,

  // Agility Stats
  baseAgility: 6,
  maxAgility: 6,

  // Luck Stats
  baseLuck: 1,
  maxLuck: 1,

  // Sustainability
  sustainability: null,

  // Visual
  sprite: "dist/sprites/flying_boat_3x3.webp",

  // Combat tracking
  combatSent: [],
  combatReceived: {},
  processedCombatSent: [],
  processedCombatReceived: [],
  canCounter: false,
  counteringAgainstWho: null,
  agilityChecks: null,
  luckChecks: null,

  // Summon-specific properties
  summonDuration: 10, // Lasts 10 turns
  maxSummons: 2, // Anastasia can have max 2 ice golems at once

  // Vehicle-specific attributes
  dimensions: {
    width: 3,
    height: 3,
  },
  maxPassengers: 6,
  movementLeft: 0,
  hasAttacked: false,
  isVehicle: true,
};

// Ice Golem Template
export const waterBoatTemplate = {
  ...waterBoatAttributes,
  statusIfHit: null,
  backUpStatus: null,
  triggerEffects: [],
  skills: [],
  noblePhantasms: [], // Summons typically don't have NPs
  reactions: [],
  actions: {
    common: [],
    unique: [],
  },
  effects: [],
};

// Ice Golem creation function
export const createWaterBoat = (summoner, position, gameState) => {
  return {
    ...waterBoatTemplate,
    id: `water_boat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${summoner.name}'s Water Boat`,

    // Position and team
    x: position.x,
    y: position.y,
    z: 1, // if it is a ground unit then 1, if not it should be 2
    team: summoner.team,
    hp: waterBoatAttributes.baseHp,

    // Summon-specific properties
    summoner: summoner.id, // Tied to the summoner
    summonedAt: gameState.currentTurn,

    // Contract system (summons inherit summoner's contract status)
    contract: {
      contractStatus: summoner.contract?.contractStatus || "Free",
      party: "Summon",
      contractedTo: summoner.contract?.contractedTo || null,
    },

    containedUnits: [], // Array of unit IDs inside this vehicle
    boardCells: VehicleUtils.generateBoardCells(
      vehicleTemplate.dimensions,
      x,
      y,
      z
    ),
    // Add vehicle-specific states, if the vehicle can't move or attack this turn
    // movementLeft: vehicleTemplate.movementRange || 0,
    // hasAttacked: false,
    // isVehicle: true,
  };
};
