import { MicroAction } from "../../MicroAction.js";
import { Action } from "../../actions/Action.js";
import { ActionType } from "../../actions/ActionTypes.js";
import { NoblePhantasm } from "../../NoblePhantasm.js";
import { TargetingType } from "../../targeting/TargetingTypes.js";
import { Combat } from "../../Combat.js";

// MicroAction for Use Command Seal
const useCommandSealMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 5, // Command seal can reach within master's zone
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("⚡ Executing Use Command Seal:");

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team === caster.team && // Same team
        affectedCells.has(`${unit.x},${unit.y}`) &&
        caster.contract.contractedTo === unit.id // Must be contracted to target
      ) {
        console.log(`⚡ Applying Command Seal boost to ${unit.name}`);

        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
        const commandSealEffect = {
          name: "Command Seal Boost",
          type: "PowerUp",
          duration: 3,
          appliedAt: gameState.currentTurn,
          value: 30,
          flatOrMultiplier: "multiplier",
          description: "Empowered by Master's Command Seal",
          source: "Use Command Seal",
        };

        return {
          ...unit,
          effects: [...currentEffects, commandSealEffect],
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

// MicroAction for Magic Crest Noble Phantasm
const magicCrestMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 2, // Master's basic attack range
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("🔮 Executing Magic Crest:");

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        console.log(`🔮 Targeting ${unit.name} with Magic Crest`);

        const modifiedUnit = JSON.parse(JSON.stringify(unit));
        const backUpUnit = modifiedUnit;

        const combat = new Combat({
          typeOfAttackCausingIt: "Noble Phantasm",
          proportionOfMagicUsed: 1, // 100% magic
          proportionOfStrengthUsed: 0, // no strength
          attacker: caster,
          defender: modifiedUnit,
          gameState: gameState,
          integratedAttackMultiplier: 2,
          integratedAttackFlatBonus: 0,
        });

        const initiationResults = combat.initiateCombat();
        caster.combatSent = JSON.parse(JSON.stringify(combat.combatResults));
        modifiedUnit.combatReceived = JSON.parse(
          JSON.stringify(combat.combatResults)
        );

        console.log("🔮 Magic Crest combat results:", combat.combatResults);

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

// Master Noble Phantasms
export const MasterNPs = {
  MagicCrest: new NoblePhantasm(
    "Magic Crest",
    "Channels the family's magical legacy into a focused magical attack",
    30, // cooldown
    2, // range matches rangeOfBasicAttack
    [magicCrestMicroAction],
    true, // isAttack
    true, // affectsAttackCount
    false, // isReactionary
    4 // usableFromRound
  ),
};

// Master Actions
export const MasterActions = {
  common: [
    {
      UseCommandSeal: new Action(
        "Use Command Seal",
        "Empowers contracted servant with a Command Seal, providing significant power boost",
        5, // cooldown
        5, // range - covers master's zone
        [useCommandSealMicroAction],
        ActionType.common,
        false, // not reactionary
        false, // doesn't count as attack
        false // not an attack
      ),
    },
  ],
  unique: {},
};

// Masters don't have skills
export const MasterSkills = {};

// Define Master's base stats and attributes
export const MasterAttributes = {
  name: "Master Of",
  class: "Master",
  // Base Stats
  baseHp: 250,
  maxHp: 250,
  baseDef: 1,
  baseMovementRange: 2,
  rangeOfBasicAttack: 2,
  // Combat Stats
  strength: 50, // Physical attack power
  magic: 0, // Magical attack power
  // Vision and Targeting
  visionRange: 2,
  // Agility Stats
  baseAgility: 8,
  maxAgility: 8,
  // Luck Stats
  baseLuck: 12,
  maxLuck: 12,
  // Sustainability
  sustainability: null,
  // Visual
  sprite: "dist/sprites/master_portrait.webp",
  combatSent: [],
  combatReceived: {},
  processedCombatSent: [],
  processedCombatReceived: [],
  canCounter: false,
  counteringAgainstWho: null,
  agilityChecks: null,
  luckChecks: null,
  // Contract system
  contract: {
    contractStatus: "Free", // "Contracted", "Unbound", or "Free"
    party: "Master", // "Servant" or "Master"
    contractedTo: null, // unit's id or null
  },
  // Master-specific properties
  commandSealsRemaining: 3, // Masters typically start with 3 command seals
  zoneCoverageRange: 5, // Range within which servants can use Noble Phantasms
};

export const MasterTriggerEffects = {};

// Export complete Master unit template
export const MasterTemplate = {
  ...MasterAttributes,
  // These will be populated by UnitUtils methods when needed
  statusIfHit: null,
  backUpStatus: null,
  triggerEffects: [
    // Initially empty - trigger effects are added dynamically
  ],
  skills: [
    // Masters don't have skills
  ],
  noblePhantasms: [
    {
      id: "MagicCrest",
      name: "Magic Crest",
      description:
        "Channels the family's magical legacy into a focused magical attack",
      cooldown: 30,
      onCooldownUntil: 0,
      isAttack: true,
      affectsAttackCount: true,
    },
  ],
  reactions: [
    // Masters typically don't have reactions, but could be added if needed
  ],
  actions: {
    common: [
      {
        id: "UseCommandSeal",
        onCooldownUntil: 0,
      },
    ],
    unique: [],
  },
};
