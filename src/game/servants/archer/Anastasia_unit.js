// src/game/servants/archer/Anastasia_unit.js
import { MicroAction } from "../../MicroAction";
import { Skill } from "../../Skill";
import { TargetingType } from "../../targeting/TargetingTypes";
import { Combat } from "../../Combat";
import { Action } from "../../actions/Action";
import { ActionType } from "../../actions/ActionTypes";
import { NoblePhantasm } from "../../NoblePhantasm";

const snegletaDefenseDownMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 3, // rangeOfBasicAttack + 1
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        const modifiedUnit = JSON.parse(JSON.stringify(unit));
        const backUpUnit = modifiedUnit;

        const currentEffects = Array.isArray(modifiedUnit.effects)
          ? modifiedUnit.effects
          : [];
        const defenseDownEffect = {
          name: "DefenseDown",
          type: "DefenseDown",
          duration: 2,
          appliedAt: gameState.currentTurn,
          value: 30,
          flatOrMultiplier: "multiplier",
          source: "Snegleta・Snegurochka",
        };

        modifiedUnit.effects = [...currentEffects, defenseDownEffect];

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

// Create the MicroAction for the damage and skill seal
const snegletaDamageAndSealMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 3, // rangeOfBasicAttack + 1
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        // Use existing statusIfHit to build upon previous effects (needed for NPs, actions, anything that has more than 1 microAction)
        const modifiedUnit = unit.statusIfHit;
        const backUpUnit = modifiedUnit;

        const combat = new Combat({
          typeOfAttackCausingIt: "Noble Phantasm",
          proportionOfMagicUsed: 1, // 100% magic
          proportionOfStrengthUsed: 0, // no strength
          attacker: caster,
          defender: modifiedUnit,
          gameState: gameState,
          integratedAttackMultiplier: 3.5,
          integratedAttackFlatBonus: 0,
        });

        const initiationResults = combat.initiateCombat();
        caster.combatSent = JSON.parse(JSON.stringify(combat.combatResults));
        modifiedUnit.combatReceived = JSON.parse(
          JSON.stringify(combat.combatResults)
        );

        const currentEffects = Array.isArray(modifiedUnit.effects)
          ? modifiedUnit.effects
          : [];
        const skillSealEffect = {
          name: "SkillSeal",
          type: "SkillSeal",
          duration: 1,
          appliedAt: gameState.currentTurn,
          description: "Cannot use skills",
          source: "Snegleta・Snegurochka",
        };

        modifiedUnit.effects = [...currentEffects, skillSealEffect];

        // Add debug logging
        console.log("NP Second MicroAction Effects:", {
          unit: unit.name,
          previousEffects: currentEffects,
          newEffects: modifiedUnit.effects,
          combatResults: combat.combatResults,
        });

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

// Define Anastasia's skills' MicroActions
const mahalaprayaMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT,
  range: 6,
  dimensions: { width: 7, height: 7 },
  applyCornerRule: false,
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("Executing Mahalapraya MicroAction:", {
      caster,
      affectedCellsCount: affectedCells.size,
      currentGameState: gameState,
    });

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        // Create a copy of the unit for statusIfHit
        const modifiedUnit = JSON.parse(JSON.stringify(unit));

        const backUpUnit = modifiedUnit;
        // Create modified attributes for the copy

        const currentEffects = Array.isArray(modifiedUnit.effects)
          ? modifiedUnit.effects
          : [];

        // const newHp = Math.max(0, modifiedUnit.hp - (5 * caster.atk));

        const combat = new Combat({
          typeOfAttackCausingIt: "Skill",
          proportionOfMagicUsed: 1, // 30% of magic
          proportionOfStrengthUsed: 0, // 120% of strength
          attacker: caster,
          defender: modifiedUnit,
          gameState: gameState,
          integratedAttackMultiplier: 5,
          integratedAttackFlatBonus: 0,
        });
        const initiationResults = combat.initiateCombat();
        // Store only the necessary combat data, avoiding circular references
        caster.combatSent = JSON.parse(JSON.stringify(combat.combatResults));
        console.log(caster.combatSent);
        modifiedUnit.combatReceived = JSON.parse(
          JSON.stringify(combat.combatResults)
        );

        const newEffect = {
          name: "uwu",
          duration: 7,
          appliedAt: gameState.currentTurn,
          description: "Under the effect of Mahalapraya",
        };

        // Modify the copy
        // modifiedUnit.hp = newHp;
        modifiedUnit.effects = [...currentEffects, newEffect];

        console.log("Applying effect to unit:", {
          unitName: unit.name,
          current: unit.hp,
          newEffect,
        });

        return {
          ...unit,
          statusIfHit: modifiedUnit,
          backUpStatus: backUpUnit,
        };
      }
      return unit;
    });

    const newGameState = {
      ...gameState,
      units: updatedUnits,
    };

    console.log("MicroAction execution result:", {
      updatedUnitsCount: updatedUnits.length,
      affectedUnits: updatedUnits.filter((u) =>
        u.effects?.some((e) => e.name === "uwu")
      ),
    });

    return newGameState;
  },
});

const selfBuffMicroAction = new MicroAction({
  targetingType: TargetingType.SELF,
  range: 0, // Not used for SELF targeting
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.id === caster.id) {
        return {
          ...unit,
          effects: [
            ...(unit.effects || []),
            {
              name: "PowerUp",
              duration: 3,
              appliedAt: gameState.currentTurn,
            },
          ],
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

// Example of AOE_FROM_POINT_WITHIN_RANGE
const constrainedExplosionMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT_WITHIN_RANGE,
  range: 6,
  dimensions: { width: 7, height: 7 },
  applyCornerRule: true,
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        return {
          ...unit,
          hp: Math.max(0, unit.hp - 5),
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

const dodgeMicroAction = new MicroAction({
  targetingType: TargetingType.SELF,
  range: 0,
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.id === caster.id) {
        return {
          ...unit,
          effects: [
            ...(unit.effects || []),
            {
              name: "Dodge",
              type: "DefenseUp",
              duration: 1,
              appliedAt: gameState.currentTurn,
              value: 50,
              flatOrMultiplier: "multiplier",
            },
          ],
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

export const AnastasiaNPs = {
  SnegletaSnegurochka: new NoblePhantasm(
    "Snegleta・Snegurochka: Summer Snow, Beautiful Drops of Hoarfrost",
    "Weakens enemy defenses and seals their skills while dealing massive magical damage",
    42, // cooldown
    3, // rangeOfBasicAttack + 1
    [snegletaDefenseDownMicroAction, snegletaDamageAndSealMicroAction],
    true, // isAttack
    true, // affectsAttackCount
    false, // isReactionary
    6 // usableFromRound
  ),
};

export const AnastasiaActions = {
  common: {
    dodge: new Action(
      "Dodge",
      "Increases defense by 50% until next turn",
      3, // cooldown
      0, // self-targeting
      [dodgeMicroAction],
      ActionType.common,
      true, // is reactionary
      false,
      false
    ),
  },
  unique: {},
};

// Define Anastasia's skills
export const AnastasiaSkills = {
  Mahalapraya: new Skill(
    "Mahalapraya",
    "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
    5, // cooldown
    6, // range
    [mahalaprayaMicroAction],
    true, // isAttack
    true, //counts towards limit of attacks
    true
  ),
  selfBuff: new Skill(
    "Self Buff",
    "self_targeting test: buffs itself",
    3, // cooldown
    1, // range
    [selfBuffMicroAction],
    false, // isAttack
    false //counts towards limit of attacks
  ),

  constrainedExplosion: new Skill(
    "aoe within range",
    "aoe from point test: ",
    4, // cooldown
    6, // range
    [constrainedExplosionMicroAction],
    true, // isAttack
    true //counts towards limit of attacks
  ),
};

// Define Anastasia's base stats and attributes
export const AnastasiaAttributes = {
  name: "Anastasia",
  class: "Archer",
  // Base Stats
  baseHp: 500,
  maxHp: 500,
  baseDef: 1,
  baseMovementRange: 5,
  rangeOfBasicAttack: 2,
  // Combat Stats
  strength: 80, // Physical attack power
  magic: 120, // Magical attack power
  // Vision and Targeting
  visionRange: 5,
  // Agility Stats
  baseAgility: 16,
  maxAgility: 20,
  // Luck Stats
  baseLuck: 8,
  maxLuck: 12,
  // Sustainability
  sustainability: "4",
  // Visual
  sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp",
  combatSent: {},
  combatReceived: {},
  canCounter: false,
};

// Export complete Anastasia unit template
export const AnastasiaTemplate = {
  ...AnastasiaAttributes,
  // These will be populated by UnitUtils methods when needed
  statusIfHit: null,
  backUpStatus: null,
  skills: [
    {
      id: "Mahalapraya",
      onCooldownUntil: 0,
      isAttack: true, // New property
      affectsAttackCount: true, // New property
    },
    {
      id: "selfBuff",
      onCooldownUntil: 0,
      isAttack: false,
      affectsAttackCount: false,
    },
    {
      id: "constrainedExplosion",
      onCooldownUntil: 0,
      isAttack: true,
      affectsAttackCount: true,
    },
  ],
  noblePhantasms: [
    {
      id: "SnegletaSnegurochka",
      name: "Snegleta・Snegurochka: Summer Snow, Beautiful Drops of Hoarfrost",
      description:
        "Weakens enemy defenses and seals their skills while dealing massive magical damage",
      cooldown: 42,
      onCooldownUntil: 0,
      isAttack: true,
      affectsAttackCount: true,
    },
  ],
  reactions: [
    {
      id: 1,
      name: "Instinct",
      description: "May evade incoming attacks",
    },
  ],
  actions: {
    common: [
      {
        id: "dodge",
        onCooldownUntil: 0,
      },
    ],
    unique: [
      {
        id: "winterEscape",
        onCooldownUntil: 0,
      },
    ],
  },
};

//notes, sucessive microActions chaining (see: SnegletaSnegurochka) will require for the 2nd and onward effect to change how modified unit is defined, modifiedUnit = unit.statusIfHit (see snegletaDamageAndSealMicroAction)
