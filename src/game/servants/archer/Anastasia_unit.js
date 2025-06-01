// src/game/servants/archer/Anastasia_unit.js
import { MicroAction } from "../../MicroAction.js";
import { Skill } from "../../Skill.js";
import { TargetingType } from "../../targeting/TargetingTypes.js";
import { Combat } from "../../Combat.js";
import { Action } from "../../actions/Action.js";
import { ActionType } from "../../actions/ActionTypes.js";
import { NoblePhantasm } from "../../NoblePhantasm.js";
import { TriggerEffect } from "../../TriggerEffect.js";
import { EventTypes } from "../../EventTypes.js";
import { applyEffect } from "../../EffectApplication.js";
import { VehicleUtils } from "../../utils/VehicleUtils.js";
import { createIceGolem } from "../materials/archer/ArcherMaterials.js";
import { createWaterBoat } from "../materials/archer/ArcherMaterials.js";

const iceSpikeGolemMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 5,
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
// ===== ANASTASIA'S SUMMONING SKILL =====
const CreateWaterBoatMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT,
  range: 3,
  dimensions: { width: 3, height: 3 }, // ADD dimensions for the AOE
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("🚤❄️ Anastasia summoning Water Boat");

    // Check summon limit (FIXED)
    const existingWaterBoats = gameState.units.filter(
      (unit) => unit.summoner === caster.id && unit.name === "Water Boat"
    );

    if (existingWaterBoats.length >= 1) {
      console.log(
        `❌ Cannot summon: ${caster.name} already has ${existingWaterBoats.length}/1 Water Boats`
      );
      return gameState;
    }

    // Get the center position from the affected cells
    // For a 3x3 AOE, we want to place the vehicle's origin (top-left) appropriately
    const cellsArray = Array.from(affectedCells);

    if (cellsArray.length === 0) {
      console.log("❌ No affected cells for water boat summoning");
      return gameState;
    }

    // Parse all affected cell coordinates
    const cellCoords = cellsArray.map((cell) => {
      const [x, y] = cell.split(",").map(Number);
      return { x, y };
    });

    // Find the top-left corner of the affected area to use as vehicle origin
    const minX = Math.min(...cellCoords.map((coord) => coord.x));
    const minY = Math.min(...cellCoords.map((coord) => coord.y));

    const vehicleOriginX = minX;
    const vehicleOriginY = minY;

    console.log(
      `🚤 Placing water boat origin at (${vehicleOriginX}, ${vehicleOriginY})`
    );

    // Check if the entire 3x3 area is clear for the vehicle
    const canPlace = VehicleUtils.canVehicleMoveTo(
      { dimensions: { width: 3, height: 3 } },
      vehicleOriginX,
      vehicleOriginY,
      1, // z level
      gameState,
      11 // grid size
    );

    if (!canPlace) {
      console.log("❌ Cannot summon water boat: Area is not clear");
      return gameState;
    }

    // Create the water boat
    const waterBoat = createWaterBoat(
      caster,
      { x: vehicleOriginX, y: vehicleOriginY },
      gameState
    );
    console.log(
      `✅ ${waterBoat.name} summoned at (${vehicleOriginX}, ${vehicleOriginY})`
    );
    return {
      ...gameState,
      units: [...gameState.units, waterBoat],
    };
  },
});

// Golem summoning MicroAction for Anastasia
const summonIceGolemMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 3,
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("❄️🤖 Anastasia summoning Ice Golem");

    // Check summon limit (FIXED)
    const existingGolems = gameState.units.filter(
      (unit) => unit.summoner === caster.id && unit.type === "Ice Golem"
    );

    if (existingGolems.length >= 2) {
      console.log(
        `❌ Cannot summon: ${caster.name} already has ${existingGolems.length}/2 golems`
      );
      return gameState;
    }

    // Get target position from affectedCells (FIXED)
    const targetCell = Array.from(affectedCells)[0];
    const [x, y] = targetCell.split(",").map(Number);

    // Check if cell is empty (FIXED)
    const isOccupied = gameState.units.some(
      (unit) => unit.x === x && unit.y === y
    );
    if (isOccupied) {
      console.log("❌ Cannot summon golem: Target cell is occupied");
      return gameState;
    }

    // Create the ice golem (FIXED)
    const iceGolem = createIceGolem(caster, { x, y }, gameState);
    console.log(`✅ ${iceGolem.name} summoned at (${x}, ${y})`);

    return {
      ...gameState,
      units: [...gameState.units, iceGolem],
    };
  },
});

const bindingChainsMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT,
  range: 4,
  dimensions: { width: 3, height: 3 },
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("⛓️ Executing Binding Chains:");

    // Define immobility debuffs that will benefit from specific caster bonuses
    const immobilityEffects = [
      {
        name: "Root",
        type: "Immobilize",
        value: 0, // Immobilization doesn't need a value
        duration: 2,
        description: "Magical roots prevent movement",
        category: "Immobility Debuffs",
        archetype: "debuff",
      },
      {
        name: "Slow",
        type: "SpeedDown",
        value: 50,
        duration: 3,
        description: "Movement speed drastically reduced",
        category: "Immobility Debuffs",
        archetype: "debuff",
      },
      {
        name: "Paralyze",
        type: "Stun",
        value: 0, // Stun doesn't need a value
        duration: 1,
        description: "Completely unable to act",
        category: "Immobility Debuffs",
        archetype: "debuff",
      },
    ];

    const applicationResults = [];

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        console.log(`⛓️ Targeting ${unit.name} with binding chains`);

        let currentUnit = { ...unit };
        let currentCaster = { ...caster };
        const unitResults = [];

        // Apply each immobility effect
        immobilityEffects.forEach((effect, index) => {
          console.log(
            `⛓️ Effect ${index + 1}/3: Applying ${effect.name} to ${unit.name}`
          );

          const application = applyEffect(
            currentCaster,
            currentUnit,
            effect,
            gameState,
            "Skill",
            100
          );

          const result = {
            target: unit.name,
            effect: effect.name,
            success: application.wasSuccessful,
            roll: application.applicationResults.rollResult,
            chance: application.applicationResults.finalSuccessChance,
            consumedCasterEffects:
              application.applicationResults.consumedCasterEffects?.length || 0,
            consumedTargetDefenses:
              application.applicationResults.consumedTargetDefenses?.length ||
              0,
          };

          unitResults.push(result);

          // Update both units for next iteration
          currentCaster = application.updatedCaster;
          currentUnit = application.updatedTarget;

          if (application.wasSuccessful) {
            console.log(`✅ ${effect.name} applied to ${unit.name}`);
          } else {
            console.log(`❌ ${effect.name} resisted by ${unit.name}`);
          }

          // Log caster effect consumption
          if (result.consumedCasterEffects > 0) {
            console.log(
              `🔮 ${result.consumedCasterEffects} caster enhancement(s) consumed for ${effect.name}`
            );
          }
        });

        applicationResults.push({
          target: unit.name,
          effects: unitResults,
          successCount: unitResults.filter((r) => r.success).length,
          totalCasterEffectsConsumed: unitResults.reduce(
            (sum, r) => sum + r.consumedCasterEffects,
            0
          ),
          totalTargetDefensesConsumed: unitResults.reduce(
            (sum, r) => sum + r.consumedTargetDefenses,
            0
          ),
        });

        // Update the caster in gameState with the final state
        // (In a real implementation, you'd want to handle this at the gameState level)
        caster = currentCaster;

        return currentUnit;
      }
      return unit;
    });

    // Log comprehensive results
    console.log("⛓️ Binding Chains Results:");
    applicationResults.forEach((result) => {
      console.log(
        `⛓️ ${result.target}: ${result.successCount}/3 effects applied`
      );
      console.log(
        `   🔮 Caster effects consumed: ${result.totalCasterEffectsConsumed}`
      );
      console.log(
        `   🛡️ Target defenses consumed: ${result.totalTargetDefensesConsumed}`
      );

      result.effects.forEach((effect) => {
        const status = effect.success ? "✅" : "❌";
        const casterText =
          effect.consumedCasterEffects > 0
            ? ` (${effect.consumedCasterEffects} caster)`
            : "";
        const targetText =
          effect.consumedTargetDefenses > 0
            ? ` (${effect.consumedTargetDefenses} target)`
            : "";
        console.log(
          `      ${status} ${effect.effect}: ${effect.roll}/${effect.chance}%${casterText}${targetText}`
        );
      });
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

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

    // Initialize combatSent as an array if it doesn't exist
    caster.combatSent = [];

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        const backUpUnit = JSON.parse(JSON.stringify(unit));
        // Create modified attributes for the copy

        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];

        const casterDeepCopy = JSON.parse(JSON.stringify(caster));

        const unitDeepCopy = JSON.parse(JSON.stringify(unit));

        // const newHp = Math.max(0, modifiedUnit.hp - (5 * caster.atk));

        const combat = new Combat({
          typeOfAttackCausingIt: "Skill",
          proportionOfMagicUsed: 1, // 30% of magic
          proportionOfStrengthUsed: 0, // 120% of strength
          attacker: casterDeepCopy,
          defender: unitDeepCopy,
          gameState: gameState,
          integratedAttackMultiplier: 5,
          integratedAttackFlatBonus: 0,
        });
        const initiationResults = combat.initiateCombat();
        // Store only the necessary combat data, avoiding circular references
        caster.combatSent.push(
          JSON.parse(JSON.stringify(combat.combatResults))
        );
        console.log("Sent combat:", caster.combatSent);

        unit.combatReceived = JSON.parse(JSON.stringify(combat.combatResults));
        console.log("received combat:", unit.combatReceived);

        // modifiedUnit.combatReceived = JSON.parse(
        //   JSON.stringify(combat.combatResults)
        // );

        const newEffect = {
          name: "uwu",
          duration: 7,
          appliedAt: gameState.currentTurn,
          description: "Under the effect of Mahalapraya",
        };

        // Modify the copy
        // modifiedUnit.hp = newHp;
        unit.effectsReceived = [...currentEffects, newEffect];

        console.log("Applying effect to unit:", {
          unitName: unit.name,
          current: unit.hp,
          newEffect,
        });

        // Create a copy of the unit for statusIfHit
        const modifiedUnit = JSON.parse(JSON.stringify(unit));

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

// MicroAction that applies curse to enemies in an area
const cursedIceMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT,
  range: 4,
  dimensions: { width: 5, height: 5 },
  applyCornerRule: false,
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("❄️💀 Executing Cursed Ice with Trigger Effects:", {
      caster: caster.name,
      affectedCellsCount: affectedCells.size,
    });

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
        const currentTriggerEffects = Array.isArray(unit.triggerEffects)
          ? unit.triggerEffects
          : [];

        // Create multiple curse effects (stages)
        const curseEffect1 = {
          name: "Curse",
          type: "Curse",
          duration: 5,
          appliedAt: gameState.currentTurn,
          value: 25,
          description: "Cursed by frozen despair - Stage 1",
          source: "Cursed Ice",
          stage: 1,
        };

        // Check if unit already has curse effects
        const existingCurses = currentEffects.filter(
          (effect) => effect.name === "Curse"
        );

        if (existingCurses.length > 0) {
          // Find the highest stage curse
          const highestStageCurse = existingCurses.reduce((highest, curse) => {
            return (curse.stage || 1) > (highest.stage || 1) ? curse : highest;
          }, existingCurses[0]);

          const currentStage = highestStageCurse.stage || 1;
          const newStage = currentStage + curseEffect1.stage;
          const newValue = 25 * newStage;

          console.log(
            `❄️💀 CURSE: ${unit.name} already has curse (Stage ${currentStage}), upgrading to Stage ${newStage}`
          );

          // Alter curseEffect1 to be the upgraded curse
          curseEffect1 = {
            ...curseEffect1,
            stage: newStage,
            value: newValue,
            description: `Cursed by frozen despair - Stage ${newStage}`,
          };

          console.log(`❄️💀 CURSE: ${unit.name} curse upgraded:`, {
            previousStage: currentStage,
            newStage: newStage,
            newValue: newValue,
          });
        }

        let newTriggerEffects = currentTriggerEffects;

        // TRIGGER CREATES TRIGGER: Add curse trigger if unit doesn't have it
        if (!hasCurseTrigger) {
          console.log(
            `❄️💀 ADDING CURSE TRIGGER: ${unit.name} will now take curse damage over time`
          );

          const curseTriggerReference = {
            id: "CurseTriggerEffect",
            appliedAt: gameState.currentTurn,
            source: "Cursed Ice Application",
          };

          newTriggerEffects = [...currentTriggerEffects, curseTriggerReference];
        }

        return {
          ...unit,
          effects: [...currentEffects, curseEffect1],
          triggerEffects: newTriggerEffects,
        };
      }
      return unit;
    });

    const newGameState = {
      ...gameState,
      units: updatedUnits,
    };

    console.log("❄️💀 Cursed Ice execution result:", {
      updatedUnitsCount: updatedUnits.length,
      cursedUnits: updatedUnits.filter((u) =>
        u.effects?.some((e) => e.name === "Curse")
      ).length,
      unitsWithCurseTrigger: updatedUnits.filter((u) =>
        u.triggerEffects?.some((tr) => tr.id === "CurseTriggerEffect")
      ).length,
    });

    return newGameState;
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
  IceCurse: new Skill(
    "Cursed Ice",
    "Summons cursed ice that afflicts enemies in a 5x5 area with multiple curse effects",
    3, // cooldown in turns
    4, // range - can target up to 4 cells away
    [cursedIceMicroAction],
    false, // not an attack skill (doesn't trigger attack-related effects)
    false, // doesn't count against attack limit
    false // not reactionary
  ),
  BindingChains: new Skill(
    "Binding Chains",
    "Attempts to apply Root (2 turns), Slow (-50% speed for 3 turns), and Paralyze (1 turn) to all enemies in a 3x3 area. Benefits from immobility debuff enhancements and consumes limited-use caster bonuses.",
    4, // cooldown
    4, // range
    [bindingChainsMicroAction],
    false, // not an attack
    false, // doesn't count towards attack limit
    false // not reactionary
  ),
  SummonIceGolem: new Skill(
    "Summon Ice Golem",
    "Creates an ice golem ally that fights for 10 turns. Max 2 golems at once.",
    8, // long cooldown
    3, // range
    [summonIceGolemMicroAction],
    false, // not an attack
    false, // doesn't count towards attack limit
    false // not reactionary
  ),
  CreateWaterBoat: new Skill(
    "Summons a Water Boat",
    "Creates a waterBoat",
    8, // long cooldown
    3, // range
    [CreateWaterBoatMicroAction],
    false, // not an attack
    false, // doesn't count towards attack limit
    false // not reactionary
  ),
  IceSpike: new Skill(
    "Ice Spike",
    "Golem attacks with a sharp ice projectile",
    2, // cooldown
    5, // range
    [iceSpikeGolemMicroAction],
    true, // isAttack
    true, // counts towards attack limit
    false // not reactionary
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
  movementRange: 5,
  movementLeft: 5,
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
  baseLuck: 2,
  maxLuck: 12,
  // Sustainability
  sustainability: "4",
  // Visual
  sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp",
  combatSent: [],
  combatReceived: {},
  processedCombatSent: [],
  processedCombatReceived: [],
  canCounter: false,
  counteringAgainstWho: null,
  agilityChecks: null,
  luckChecks: null,
  aboardVehicle: null, // ID of vehicle this unit is aboard, null if not aboard
  vehicleRelativePosition: null, // {x, y} relative position within vehicle
  isVehicle: false, // Mark regular units as not vehicles
};

export const AnastasiaTriggerEffects = {};

// Export complete Anastasia unit template
export const AnastasiaTemplate = {
  ...AnastasiaAttributes,
  // These will be populated by UnitUtils methods when needed
  statusIfHit: null,
  backUpStatus: null,
  triggerEffects: [
    // Initially empty - trigger effects are added dynamically by skills/buffs
  ],
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
    {
      id: "IceCurse",
      onCooldownUntil: 0,
      isAttack: false,
      affectsAttackCount: false,
    },
    {
      id: "BindingChains",
      onCooldownUntil: 0,
      isAttack: false,
      affectsAttackCount: false,
    },
    {
      id: "SummonIceGolem",
      onCooldownUntil: 0,
      isAttack: false,
      affectsAttackCount: false,
    },
    {
      id: "CreateWaterBoat",
      onCooldownUntil: 0,
      isAttack: false,
      affectsAttackCount: false,
    },
    {
      id: "IceSpike",
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
