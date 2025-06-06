// src/game/triggerEffects/CommonTriggerEffects.js
import { TriggerEffect } from "../TriggerEffect.js";
import { EventTypes } from "../EventTypes.js";
import { convertFractionalDuration } from "../utils/DurationHelper.js";
import { isUnitInOwnBase } from "../utils/DistanceUtils.js";
import { DiceUtils } from "../utils/DiceUtils.js";
import { RankUtils } from "../utils/RankUtils.js";
import { applyEffect } from "../EffectApplication.js";

// Curse Trigger Effect - Activates at end of turn for cursed units
export const CurseTriggerEffect = new TriggerEffect({
  eventType: EventTypes.TURN_END,
  name: "Curse Damage",
  description: "Deals curse damage at the end of turn based on curse stages",
  source: "Curse Debuff",
  priority: 10, // High priority to process curse damage early

  conditionLogic: (eventData, gameState, unit) => {
    // Only trigger if this unit has curse effects AND it's their team's turn ending
    const hasCurse = unit.effects?.some((effect) => effect.name === "Curse");
    const curseEffect = unit.effects?.find((effect) => effect.name === "Curse");
    if (!curseEffect) {
      console.log(`💀 CURSE does no exist for ${unit.name}:`);
      return false;
    }

    const currentTurn = gameState.currentTurn;
    const turnsPerRound = gameState.turnsPerRound || 2;
    // Calculate interval turns (every 1/3 of a round)
    const intervalTurns = convertFractionalDuration("1/3", turnsPerRound);

    // Get when the curse was applied and when it last triggered
    const appliedAt = curseEffect.appliedAt;
    const lastActivated = curseEffect.lastTurnSinceActivated || appliedAt;

    // Calculate when the next activation should occur
    const turnsSinceLastActivation = currentTurn - lastActivated;
    const shouldActivateThisTurn = turnsSinceLastActivation >= intervalTurns;

    console.log(`💀 CURSE CHECK for ${unit.name}:`, {
      currentTurn,
      appliedAt,
      lastActivated,
      intervalTurns,
      turnsSinceLastActivation,
      shouldActivateThisTurn,
    });

    return hasCurse && shouldActivateThisTurn;
  },

  effectLogic: (eventData, gameState, unit) => {
    console.log(`💀 CURSE DAMAGE: Processing for ${unit.name}`);

    const updatedUnits = gameState.units.map((gameUnit) => {
      if (gameUnit.id === unit.id) {
        let updatedUnit = { ...gameUnit };

        // Calculate total curse stages
        const curseEffect = updatedUnit.effects?.find(
          (e) => e.name === "Curse"
        );
        const totalCurseStages = curseEffect?.stage || 0;
        const curseDamage = totalCurseStages * 25; // 25 damage per stage

        console.log(
          `💀 CURSE DAMAGE: ${unit.name} has ${totalCurseStages} curse stages = ${curseDamage} damage`
        );

        if (curseDamage > 0) {
          // Apply curse damage
          updatedUnit.hp = Math.max(0, updatedUnit.hp - curseDamage);

          // Update lastTurnSinceActivated for all curse effects
          updatedUnit.effects = updatedUnit.effects.map((effect) => {
            if (effect.name === "Curse") {
              return {
                ...effect,
                lastTurnSinceActivated: gameState.currentTurn,
              };
            }
            return effect;
          });

          console.log(
            `💀 CURSE DAMAGE: ${unit.name} HP: ${gameUnit.hp} → ${updatedUnit.hp}`
          );

          // If unit dies from curse, remove all effects (including curses)
          if (updatedUnit.hp <= 0) {
            console.log(`💀 CURSE DEATH: ${unit.name} died from curse damage`);
            // updatedUnit.effects = [];
            // updatedUnit.triggerEffects = [];
          }
        }

        return updatedUnit;
      }
      return gameUnit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// Territory Creation Trigger Effect - Activates on movement end to check base positioning
export const TerritoryCreationTriggerEffect = new TriggerEffect({
  eventType: EventTypes.MOVE_END,
  name: "Territory Creation",
  description:
    "Manages territorial bonuses based on position relative to home base",
  source: "Territory Creation Passive",
  priority: 5, // Medium priority - should run after movement but before other effects

  conditionLogic: (eventData, gameState, unit) => {
    // Only trigger if this unit has Territory Creation trigger reference
    const hasTerritoryCreation = unit.triggerEffects?.some(
      (triggerRef) => triggerRef.id === "TerritoryCreationTriggerEffect"
    );

    console.log(`🏰 TERRITORY CHECK for ${unit.name}:`, {
      hasTerritoryCreation,
      unitPosition: { x: unit.x, y: unit.y, z: unit.z },
    });

    return hasTerritoryCreation;
  },

  effectLogic: (eventData, gameState, unit) => {
    console.log(`🏰 TERRITORY CREATION: Processing for ${unit.name}`);

    // Helper function to find the highest Territory Creation rank among allies
    const findHighestTerritoryRank = (team, units) => {
      let highestRank = null;
      let highestUnit = null;

      units.forEach((u) => {
        if (u.team === team) {
          const territoryTrigger = u.triggerEffects?.find(
            (tr) => tr.id === "TerritoryCreationTriggerEffect"
          );
          if (territoryTrigger) {
            if (
              !highestRank ||
              RankUtils.compareRanks(territoryTrigger.rank, highestRank) > 0
            ) {
              highestRank = territoryTrigger.rank;
              highestUnit = u;
            }
          }
        }
      });

      return { rank: highestRank, unit: highestUnit };
    };

    const updatedUnits = gameState.units.map((gameUnit) => {
      let updatedUnit = { ...gameUnit };

      // Get Territory Creation trigger data for this unit
      const territoryTrigger = updatedUnit.triggerEffects?.find(
        (tr) => tr.id === "TerritoryCreationTriggerEffect"
      );

      if (territoryTrigger && gameUnit.id === unit.id) {
        // PASSIVE 1: Attack Bonus - only for the unit with Territory Creation
        const baseStatus = isUnitInOwnBase(updatedUnit, gameState);
        const isInOwnBase = baseStatus.isInOwnBase;

        console.log(`🏰 ${unit.name} base status:`, {
          isInOwnBase,
          territoryStatus: baseStatus.territoryStatus,
          hasBase: baseStatus.hasBase,
        });

        // Remove any existing Territory Creation attack effects
        updatedUnit.effects = (updatedUnit.effects || []).filter(
          (effect) => effect.source !== "Territory Creation Attack"
        );

        if (isInOwnBase) {
          // Create dice formula string for attack bonus (NO ROLLING)
          const baseAttackValue =
            territoryTrigger.attackBase + territoryTrigger.attackModifier;
          const attackFormula = `1d${territoryTrigger.attackDie}+${baseAttackValue}`;

          const attackBonusEffect = {
            name: `Territory Attack Bonus (${territoryTrigger.rank})`,
            description: `Territorial mastery grants variable attack bonus while in home base (${attackFormula})`,
            type: "AttackUp",
            value: baseAttackValue, // Base value without dice
            variableValue: attackFormula, // Store the formula for combat system to roll
            duration: null, // Permanent while in base
            appliedAt: gameState.currentTurn,
            source: "Territory Creation Attack",
            npValue: baseAttackValue + 10, // Base value for NPs
            archetype: "buff",
            removable: true, // Can be removed when leaving base
            category: "offensiveBuffs",
            flatOrMultiplier: "flat",
            sourceLetterRank: territoryTrigger.rank,
            uses: null,
          };

          updatedUnit.effects = [
            ...(updatedUnit.effects || []),
            attackBonusEffect,
          ];

          console.log(
            `🏰 ATTACK BONUS: ${unit.name} gained territorial attack bonus in base`,
            {
              formula: attackFormula,
              baseValue: baseAttackValue,
              rank: territoryTrigger.rank,
            }
          );
        } else {
          console.log(
            `🏰 ATTACK BONUS: ${unit.name} lost attack bonus (outside base)`
          );
        }
      }

      // PASSIVE 2: Defense Bonus - affects all allied units in base (but only from highest rank Territory Creation)
      const highestTerritory = findHighestTerritoryRank(
        updatedUnit.team,
        gameState.units
      );

      if (highestTerritory.rank && highestTerritory.unit) {
        const baseStatus = isUnitInOwnBase(updatedUnit, gameState);
        const isInOwnBase = baseStatus.isInOwnBase;

        // Get the highest rank Territory Creation trigger data
        const highestTerritoryTrigger =
          highestTerritory.unit.triggerEffects?.find(
            (tr) => tr.id === "TerritoryCreationTriggerEffect"
          );

        // Remove any existing Territory Creation defense effects
        updatedUnit.effects = (updatedUnit.effects || []).filter(
          (effect) => effect.source !== "Territory Creation Defense"
        );

        if (isInOwnBase && highestTerritoryTrigger) {
          // Create dice formula string for defense bonus (NO ROLLING)
          const baseDefenseValue =
            highestTerritoryTrigger.defenseBase +
            highestTerritoryTrigger.defenseModifier;
          const defenseFormula = `3d10+${baseDefenseValue}`;

          const defenseBonusEffect = {
            name: `Territory Defense Bonus (${highestTerritory.rank})`,
            description: `Territorial protection reduces incoming damage while in home base (${defenseFormula})`,
            type: "DefenseUp",
            value: baseDefenseValue, // Base value without dice
            variableValue: defenseFormula, // Store the formula for combat system to roll
            duration: null, // Permanent while in base
            appliedAt: gameState.currentTurn,
            source: "Territory Creation Defense",
            npValue: baseDefenseValue + 5, // Base value for NPs
            archetype: "buff",
            removable: true, // Can be removed when leaving base
            category: "defensiveBuffs",
            flatOrMultiplier: "flat",
            sourceLetterRank: highestTerritory.rank,
            uses: null,
            providedBy: highestTerritory.unit.id,
          };

          updatedUnit.effects = [
            ...(updatedUnit.effects || []),
            defenseBonusEffect,
          ];

          console.log(
            `🏰 DEFENSE BONUS: ${updatedUnit.name} gained territorial defense bonus in base`,
            {
              providedBy: highestTerritory.unit.name,
              rank: highestTerritory.rank,
              formula: defenseFormula,
              baseValue: baseDefenseValue,
            }
          );
        } else if (!isInOwnBase) {
          console.log(
            `🏰 DEFENSE BONUS: ${updatedUnit.name} lost defense bonus (outside base)`
          );
        }
      }

      return updatedUnit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// Item Construction Trigger Effect - Activates on movement end to manage aura effects
// Item Construction Trigger Effect - Activates on movement end to manage aura effects
export const ItemConstructionTriggerEffect = new TriggerEffect({
  eventType: EventTypes.MOVE_END,
  name: "Item Construction Aura",
  description: "Manages Item Construction aura effects for allies within range",
  source: "Item Construction Passive",
  priority: 4, // Medium-high priority - should run after movement

  conditionLogic: (eventData, gameState, unit) => {
    // Only trigger if any unit has Item Construction trigger reference
    const hasItemConstruction = gameState.units.some((u) =>
      u.triggerEffects?.some(
        (triggerRef) => triggerRef.id === "ItemConstructionTriggerEffect"
      )
    );

    console.log(`🔧 ITEM CONSTRUCTION CHECK:`, {
      hasItemConstruction,
      totalUnits: gameState.units.length,
    });

    return hasItemConstruction;
  },

  effectLogic: (eventData, gameState, unit) => {
    console.log(`🔧 ITEM CONSTRUCTION: Processing aura effects`);

    // Helper function to calculate 2D Manhattan distance for aura range
    const calculateDistance = (pos1, pos2) => {
      return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    };

    // Helper function to find the highest Item Construction rank affecting a unit
    const findHighestItemConstructionRank = (targetUnit, units) => {
      let highestRank = null;
      let providingUnit = null;

      units.forEach((u) => {
        if (u.team === targetUnit.team) {
          const itemConstructionTrigger = u.triggerEffects?.find(
            (tr) => tr.id === "ItemConstructionTriggerEffect"
          );

          if (itemConstructionTrigger) {
            // Check if target unit is within aura range
            const distance = calculateDistance(
              { x: u.x, y: u.y },
              { x: targetUnit.x, y: targetUnit.y }
            );

            if (distance <= itemConstructionTrigger.auraRange) {
              if (
                !highestRank ||
                RankUtils.compareRanks(
                  itemConstructionTrigger.rank,
                  highestRank
                ) > 0
              ) {
                highestRank = itemConstructionTrigger.rank;
                providingUnit = u;
              }
            }
          }
        }
      });

      return { rank: highestRank, unit: providingUnit };
    };

    const updatedUnits = gameState.units.map((targetUnit) => {
      let updatedUnit = { ...targetUnit };

      // Remove all existing Item Construction aura effects (direct manipulation for removal)
      const beforeRemoval = (updatedUnit.effects || []).length;
      updatedUnit.effects = (updatedUnit.effects || []).filter(
        (effect) =>
          !(
            effect.source === "Item Construction Debuff Success" ||
            effect.source === "Item Construction Debuff Resistance"
          )
      );
      const afterRemoval = updatedUnit.effects.length;

      if (beforeRemoval > afterRemoval) {
        console.log(
          `🔧 REMOVED: ${
            beforeRemoval - afterRemoval
          } Item Construction effects from ${updatedUnit.name}`
        );
      }

      // Find the highest rank Item Construction affecting this unit
      const highestItemConstruction = findHighestItemConstructionRank(
        updatedUnit,
        gameState.units
      );

      if (highestItemConstruction.rank && highestItemConstruction.unit) {
        const itemConstructionTrigger =
          highestItemConstruction.unit.triggerEffects?.find(
            (tr) => tr.id === "ItemConstructionTriggerEffect"
          );

        if (itemConstructionTrigger) {
          console.log(
            `🔧 AURA EFFECT: ${updatedUnit.name} receives Item Construction (${highestItemConstruction.rank}) from ${highestItemConstruction.unit.name}`
          );

          // Create Debuff Success Rate Increase effect
          const debuffSuccessEffect = {
            name: `Item Construction - Debuff Success (${highestItemConstruction.rank})`,
            description: `Crafted items increase debuff success rate by ${itemConstructionTrigger.debuffSuccessValue}% (excludes Instakill, Death, Erase)`,
            type: "DebuffSuccessUp",
            value: itemConstructionTrigger.debuffSuccessValue,
            duration: null, // Permanent while in aura
            appliedAt: gameState.currentTurn,
            source: "Item Construction Debuff Success",
            npValue: itemConstructionTrigger.debuffSuccessValue,
            archetype: "buff",
            removable: true,
            category: "offensiveBuffs",
            flatOrMultiplier: "multiplier",
            sourceLetterRank: highestItemConstruction.rank,
            uses: null,
            providedBy: highestItemConstruction.unit.id,
            auraRange: itemConstructionTrigger.auraRange,
            exemptions: ["Instakill", "Death", "Erase"],
          };

          // Create Debuff Resistance effect
          const debuffResistanceEffect = {
            name: `Item Construction - Debuff Resistance (${highestItemConstruction.rank})`,
            description: `Crafted items provide ${itemConstructionTrigger.debuffResistanceValue}% debuff resistance (excludes Instakill, Death, Erase)`,
            type: "DebuffResistanceUp",
            value: itemConstructionTrigger.debuffResistanceValue,
            duration: null, // Permanent while in aura
            appliedAt: gameState.currentTurn,
            source: "Item Construction Debuff Resistance",
            npValue: itemConstructionTrigger.debuffResistanceValue,
            archetype: "buff",
            removable: true,
            category: "defensiveBuffs",
            flatOrMultiplier: "multiplier",
            sourceLetterRank: highestItemConstruction.rank,
            uses: null,
            providedBy: highestItemConstruction.unit.id,
            auraRange: itemConstructionTrigger.auraRange,
            exemptions: ["Instakill", "Death", "Erase"],
          };

          // Apply effects using EffectApplication for additions
          const debuffSuccessApplication = applyEffect(
            highestItemConstruction.unit,
            updatedUnit,
            debuffSuccessEffect,
            gameState,
            debuffSuccessEffect.name, // Effect type
            100 // 100% success rate by default to all effects unless stated otherwise
          );

          if (debuffSuccessApplication.wasSuccessful) {
            updatedUnit = debuffSuccessApplication.updatedTarget;
            console.log(
              `✅ Applied debuff success effect to ${updatedUnit.name}`
            );
          } else {
            console.log(
              `❌ Failed to apply debuff success effect to ${updatedUnit.name}`
            );
          }

          const debuffResistanceApplication = applyEffect(
            highestItemConstruction.unit,
            updatedUnit,
            debuffResistanceEffect,
            gameState,
            debuffResistanceEffect.name, // Effect type
            100 // 100% success rate by default to all effects unless stated otherwise
          );

          if (debuffResistanceApplication.wasSuccessful) {
            updatedUnit = debuffResistanceApplication.updatedTarget;
            console.log(
              `✅ Applied debuff resistance effect to ${updatedUnit.name}`
            );
          } else {
            console.log(
              `❌ Failed to apply debuff resistance effect to ${updatedUnit.name}`
            );
          }

          console.log(
            `🔧 AURA APPLIED: ${updatedUnit.name} gained Item Construction effects`,
            {
              providedBy: highestItemConstruction.unit.name,
              rank: highestItemConstruction.rank,
              debuffSuccess: itemConstructionTrigger.debuffSuccessValue,
              debuffResistance: itemConstructionTrigger.debuffResistanceValue,
            }
          );
        }
      } else {
        console.log(
          `🔧 NO AURA: ${updatedUnit.name} not within range of any Item Construction aura`
        );
      }

      return updatedUnit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// Export all common trigger effects
export const CommonTriggerEffects = {
  CurseTriggerEffect,
  TerritoryCreationTriggerEffect,
  ItemConstructionTriggerEffect,
};
