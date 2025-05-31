// src/game/servants/materials/archer/ArcherMaterials.js
import { MicroAction } from "../../../MicroAction.js";
import { Skill } from "../../../Skill.js";
import { TargetingType } from "../../../targeting/TargetingTypes.js";
import { Combat } from "../../../Combat.js";
import { VehicleUtils } from "../../../utils/VehicleUtils.js";

// ===== Summer Anastasia =====

// ===== ICE GOLEM DEFINITIONS =====

// Ice Spike skill for the golem
const iceSpikeGolemMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 1,
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("🧊⚡ Ice Golem executing Ice Spike");

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        console.log(`🧊 Ice Golem targeting ${unit.name} with Ice Spike`);

        const modifiedUnit = JSON.parse(JSON.stringify(unit));
        const backUpUnit = modifiedUnit;

        const combat = new Combat({
          typeOfAttackCausingIt: "Skill",
          proportionOfMagicUsed: 0.7,
          proportionOfStrengthUsed: 0.3,
          attacker: caster,
          defender: modifiedUnit,
          gameState: gameState,
          integratedAttackMultiplier: 1.5,
          integratedAttackFlatBonus: 0,
        });
        const initiationResults = combat.initiateCombat();
        caster.combatSent.push(
          JSON.parse(JSON.stringify(combat.combatResults))
        );
        console.log("Sent combat:", caster.combatSent);

        unit.combatReceived = JSON.parse(JSON.stringify(combat.combatResults));
        console.log("received combat:", unit.combatReceived);
        modifiedUnit.combatReceived = JSON.parse(
          JSON.stringify(combat.combatResults)
        );

        return {
          ...unit,
          statusIfHit: modifiedUnit,
          backUpStatus: backUpUnit,
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

export const IceGolemNPs = {};

// IceGolem Actions
export const IceGolemActions = {};

export const IceGolemTriggerEffects = {};

// Ice Golem Skills
export const IceGolemSkills = {
  IceSpike: new Skill(
    "Ice Spike",
    "Golem attacks with a sharp ice projectile",
    2, // cooldown
    1, // range
    [iceSpikeGolemMicroAction],
    true, // isAttack
    true, // counts towards attack limit
    false // not reactionary
  ),
};

// Ice Golem Attributes
export const IceGolemAttributes = {
  name: "Ice Golem",
  class: "ArcherMaterial",
  type: "Golem",

  // Base Stats (weaker than servants but still combat capable)
  baseHp: 200,
  maxHp: 200,
  baseDef: 2,
  baseMovementRange: 3,
  movementRange: 3,
  movementLeft: 3,
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
  sprite: "dist/sprites/ice_golem_portrait.png",

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
};

// Ice Golem Template
export const IceGolemTemplate = {
  ...IceGolemAttributes,
  statusIfHit: null,
  backUpStatus: null,
  triggerEffects: [],
  skills: [
    {
      id: "IceSpike",
      onCooldownUntil: 0,
      isAttack: true,
      affectsAttackCount: true,
    },
  ],
  noblePhantasms: [], // Summons typically don't have NPs
  reactions: [],
  actions: {
    common: [],
    unique: [],
  },
  effects: [],
};

// Ice Golem creation function
export const createIceGolem = (summoner, position, gameState) => {
  return {
    ...IceGolemTemplate,
    id: `ice_golem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // Position and team
    x: position.x,
    y: position.y,
    team: summoner.team,
    hp: IceGolemAttributes.baseHp,

    // Summon-specific properties
    summoner: summoner.id, // Tied to the summoner
    summonedAt: gameState.currentTurn,

    // Contract system (summons inherit summoner's contract status)
    contract: {
      contractStatus: summoner.contract?.contractStatus || "Free",
      party: "Summon",
      contractedTo: summoner.contract?.contractedTo || null,
    },
  };
};

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
  MovementRange: 3,
  movementLeft: 3,
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
  isBiggerThanOneCell: false,
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
  const { x, y } = position; // Extract x, y from position object
  const z = 1; // Set z level (if it is a ground unit it should 1, otherwise it should 2)

  return {
    ...waterBoatTemplate,
    id: `water_boat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // Position and team
    x: x,
    y: y,
    z: z,
    team: summoner.team,
    hp: waterBoatAttributes.baseHp,

    // Summon-specific properties
    summoner: summoner.id,
    summonedAt: gameState.currentTurn,

    // Contract system
    contract: {
      contractStatus: summoner.contract?.contractStatus || "Free",
      party: "Summon",
      contractedTo: summoner.contract?.contractedTo || null,
    },

    // Vehicle-specific properties (FIXED)
    containedUnits: [],
    boardCells: VehicleUtils.generateBoardCells(
      waterBoatAttributes.dimensions, // Fixed: use waterBoatAttributes instead of vehicleTemplate
      x,
      y,
      z
    ),
    movementLeft: waterBoatAttributes.baseMovementRange || 0,
    hasAttacked: false,
    isVehicle: true,
  };
};
