// src/game/triggerEffects/CommonTriggerEffects.js
import { TriggerEffect } from "../TriggerEffect.js";
import { EventTypes } from "../EventTypes.js";

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

    // Check if it's the right timing based on turns per round
    const turnsPerRound = gameState.turnsPerRound || 2;
    const turnsSinceRoundStart = (gameState.currentTurn - 1) % turnsPerRound;
    const intervalTurns = Math.max(1, Math.floor(turnsPerRound / 3)); // Every ⅓ of round

    const shouldActivateThisTurn =
      (turnsSinceRoundStart + 1) % intervalTurns === 0;

    console.log(`💀 CURSE CHECK for ${unit.name}:`, {
      hasCurse,
      currentTurn: gameState.currentTurn,
      turnsPerRound,
      intervalTurns,
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
        const curseEffects =
          updatedUnit.effects?.filter((e) => e.name === "Curse") || [];
        const totalCurseStages = curseEffects.length;
        const curseDamage = totalCurseStages * 25; // 25 damage per stage

        console.log(
          `💀 CURSE DAMAGE: ${unit.name} has ${totalCurseStages} curse stages = ${curseDamage} damage`
        );

        if (curseDamage > 0) {
          // Apply curse damage
          updatedUnit.hp = Math.max(0, updatedUnit.hp - curseDamage);

          console.log(
            `💀 CURSE DAMAGE: ${unit.name} HP: ${gameUnit.hp} → ${updatedUnit.hp}`
          );

          // If unit dies from curse, remove all effects (including curses)
          if (updatedUnit.hp <= 0) {
            console.log(`💀 CURSE DEATH: ${unit.name} died from curse damage`);
            updatedUnit.effects = [];
            updatedUnit.triggerEffects = [];
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

// Burn Trigger Effect - Similar to curse but with different timing/effects
export const BurnTriggerEffect = new TriggerEffect({
  eventType: EventTypes.TURN_START,
  name: "Burn Damage",
  description: "Deals burn damage at the start of affected unit's turn",
  source: "Burn Debuff",
  priority: 9,

  conditionLogic: (eventData, gameState, unit) => {
    // Only trigger if this unit has burn effects AND it's the start of their team's turn
    const hasBurn = unit.effects?.some((effect) => effect.name === "Burn");
    const isTheirTeamsTurn = gameState.turn === unit.team;

    return hasBurn && isTheirTeamsTurn;
  },

  effectLogic: (eventData, gameState, unit) => {
    console.log(`🔥 BURN DAMAGE: Processing for ${unit.name}`);

    const updatedUnits = gameState.units.map((gameUnit) => {
      if (gameUnit.id === unit.id) {
        let updatedUnit = { ...gameUnit };

        // Calculate burn damage (different from curse)
        const burnEffects =
          updatedUnit.effects?.filter((e) => e.name === "Burn") || [];
        const burnDamage = burnEffects.reduce(
          (total, effect) => total + (effect.value || 15),
          0
        );

        if (burnDamage > 0) {
          updatedUnit.hp = Math.max(0, updatedUnit.hp - burnDamage);
          console.log(
            `🔥 BURN DAMAGE: ${unit.name} took ${burnDamage} burn damage`
          );

          // Remove one burn effect after damage (burns consume themselves)
          if (updatedUnit.effects) {
            const burnIndex = updatedUnit.effects.findIndex(
              (e) => e.name === "Burn"
            );
            if (burnIndex !== -1) {
              updatedUnit.effects.splice(burnIndex, 1);
              console.log(`🔥 BURN: Removed one burn effect from ${unit.name}`);
            }
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

// Example: Regeneration Trigger Effect - Positive common effect
export const RegenerationTriggerEffect = new TriggerEffect({
  eventType: EventTypes.TURN_START,
  name: "Regeneration Healing",
  description: "Heals unit at the start of their turn",
  source: "Regeneration Buff",
  priority: 8,

  conditionLogic: (eventData, gameState, unit) => {
    const hasRegen = unit.effects?.some(
      (effect) => effect.name === "Regeneration"
    );
    const isTheirTeamsTurn = gameState.turn === unit.team;

    return hasRegen && isTheirTeamsTurn;
  },

  effectLogic: (eventData, gameState, unit) => {
    console.log(`💚 REGENERATION: Processing for ${unit.name}`);

    const updatedUnits = gameState.units.map((gameUnit) => {
      if (gameUnit.id === unit.id) {
        let updatedUnit = { ...gameUnit };

        const regenEffects =
          updatedUnit.effects?.filter((e) => e.name === "Regeneration") || [];
        const healingAmount = regenEffects.reduce(
          (total, effect) => total + (effect.value || 20),
          0
        );

        if (healingAmount > 0) {
          updatedUnit.hp = Math.min(
            updatedUnit.maxHp || updatedUnit.baseHp,
            updatedUnit.hp + healingAmount
          );
          console.log(
            `💚 REGENERATION: ${unit.name} healed for ${healingAmount} HP`
          );
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

// Export all common trigger effects
export const CommonTriggerEffects = {
  CurseTriggerEffect,
  BurnTriggerEffect,
  RegenerationTriggerEffect,
};
