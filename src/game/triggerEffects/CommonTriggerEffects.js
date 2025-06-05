// src/game/triggerEffects/CommonTriggerEffects.js
import { TriggerEffect } from "../TriggerEffect.js";
import { EventTypes } from "../EventTypes.js";
import { convertFractionalDuration } from "../utils/DurationHelper.js";
import { isUnitInOwnBase } from "../utils/DistanceUtils.js";
import { DiceUtils } from "../utils/DiceUtils.js";
import { RankUtils } from "../utils/RankUtils.js";

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

// Export all common trigger effects
export const CommonTriggerEffects = {
  CurseTriggerEffect,
  TerritoryCreationTriggerEffect,
};
