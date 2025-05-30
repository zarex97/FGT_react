// src/game/utils/SummonUtils.js
// Utility functions for managing summon-type entities

export const SummonUtils = {
  // Remove expired summons
  removeExpiredSummons: (gameState) => {
    const updatedUnits = gameState.units.filter((unit) => {
      if (unit.type === "Summon" && unit.summonDuration) {
        const turnsAlive = gameState.currentTurn - unit.summonedAt;
        if (turnsAlive >= unit.summonDuration) {
          console.log(
            `⏰ ${unit.name} duration expired, removing from battlefield`
          );
          return false;
        }
      }
      return true;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },

  // Remove summons when summoner dies
  removeSummonsBySummoner: (gameState, summonerId) => {
    const updatedUnits = gameState.units.filter((unit) => {
      if (unit.summoner === summonerId) {
        console.log(`💀 ${unit.name} disappears as their summoner is defeated`);
        return false;
      }
      return true;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },

  // Get all summons belonging to a unit
  getSummonsByOwner: (gameState, ownerId) => {
    return gameState.units.filter((unit) => unit.summoner === ownerId);
  },

  // Check if a unit can summon more creatures (summon limits)
  canSummon: (summoner, gameState, maxSummons = 3) => {
    const currentSummons = SummonUtils.getSummonsByOwner(
      gameState,
      summoner.id
    );
    return currentSummons.length < maxSummons;
  },

  // Get remaining duration for a summon
  getRemainingDuration: (summon, gameState) => {
    if (!summon.summonDuration) return -1; // Permanent
    const turnsAlive = gameState.currentTurn - summon.summonedAt;
    return Math.max(0, summon.summonDuration - turnsAlive);
  },

  // Update all summons' duration counters (call each turn)
  updateSummonDurations: (gameState) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.type === "Summon" && unit.summonDuration) {
        const remainingDuration = SummonUtils.getRemainingDuration(
          unit,
          gameState
        );
        return {
          ...unit,
          remainingDuration: remainingDuration,
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
};
