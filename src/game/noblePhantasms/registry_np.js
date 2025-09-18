// src/game/noblePhantasms/registry_np.js
import { MicroAction } from "../MicroAction.js";
import { TargetingLogic } from "../targeting/TargetingLogic.js";
import { TargetingType } from "../targeting/TargetingTypes.js";
import { NoblePhantasm } from "../NoblePhantasm.js";
import { ServantRegistry } from "../servants/registry_character.js";

// Updated NPImplementations with namespacing
export const NPImplementations = Object.values(ServantRegistry).reduce(
  (acc, servantClass) => {
    Object.values(servantClass).forEach((servant) => {
      // Get character name from template for unique keys
      const characterName = servant.template?.name;

      console.log("Processing servant for NPs:", {
        name: characterName,
        hasNPs: !!servant.noblePhantasms,
      });

      if (characterName && servant.noblePhantasms) {
        Object.entries(servant.noblePhantasms).forEach(([npName, npImpl]) => {
          // Create namespaced key to prevent collisions
          const uniqueKey = `${characterName}_${npName}`;
          console.log("Adding NP with unique key:", uniqueKey, npImpl);
          acc[uniqueKey] = npImpl;
        });
      }
    });
    return acc;
  },
  {}
);

export const getServantNPs = (servantClass, servantName) => {
  const nps = ServantRegistry[servantClass]?.[servantName]?.noblePhantasms;
  console.log("Getting NPs for", servantClass, servantName, ":", nps);
  return nps;
};
export const getNPImplementation = (npId) => {
  console.log("Getting NP Implementation for:", npId);
  console.log("Available NPs:", NPImplementations);
  return NPImplementations[npId];
};

export const isNPOnCooldown = (npRef, currentTurn) => {
  if (!npRef || typeof npRef.onCooldownUntil !== "number") return false;
  return currentTurn <= npRef.onCooldownUntil;
};

export const canUseNPOnThisRound = (npRef, npImpl, currentRound) => {
  if (!npRef || !npImpl) {
    throw new Error("Invalid Noble Phantasm reference or implementation");
  }

  if (typeof currentRound !== "number") {
    throw new Error("Invalid round number");
  }

  if (currentRound < npImpl.usableFromRound) {
    return {
      canUse: false,
      reason: `Noble Phantasm can only be used from round ${npImpl.usableFromRound} onwards (current round: ${currentRound})`,
      roundsRemaining: npImpl.usableFromRound - currentRound,
    };
  }

  return {
    canUse: true,
    reason: null,
    roundsRemaining: 0,
  };
};

export const executeNP = (npRef, gameState, caster, targetX, targetY) => {
  const npImpl = getNPImplementation(npRef.id);

  // Validation checks
  if (!npImpl) {
    console.error(`No implementation found for Noble Phantasm: ${npRef.id}`);
    return {
      success: false,
      message: "Noble Phantasm not found",
      error: "IMPLEMENTATION_NOT_FOUND",
    };
  }

  if (!gameState.currentRound) {
    console.error("Invalid game state: currentRound is missing");
    return {
      success: false,
      message: "Invalid game state",
      error: "INVALID_GAME_STATE",
    };
  }

  // Check round restriction
  const roundCheck = canUseNPOnThisRound(npRef, npImpl, gameState.currentRound);
  if (!roundCheck.canUse) {
    console.log("Noble Phantasm round restriction:", roundCheck);
    return {
      success: false,
      message: roundCheck.reason,
      error: "ROUND_RESTRICTION",
      roundsRemaining: roundCheck.roundsRemaining,
    };
  }

  // Check cooldown
  if (isNPOnCooldown(npRef, gameState.currentTurn)) {
    console.log("Noble Phantasm is on cooldown:", {
      currentTurn: gameState.currentTurn,
      cooldownUntil: npRef.onCooldownUntil,
      turnsRemaining: npRef.onCooldownUntil - gameState.currentTurn,
    });
    return {
      success: false,
      message: `Noble Phantasm is on cooldown for ${
        npRef.onCooldownUntil - gameState.currentTurn
      } more turns`,
      error: "ON_COOLDOWN",
      turnsRemaining: npRef.onCooldownUntil - gameState.currentTurn,
    };
  }

  try {
    // Execute the Noble Phantasm
    const result = npImpl.execute(gameState, caster, targetX, targetY);

    console.log("Noble Phantasm execution result:", {
      success: result.success,
      npName: npImpl.name,
      caster: caster.name,
      target: { x: targetX, y: targetY },
    });

    // Update cooldown if execution was successful
    if (result.success) {
      npRef.onCooldownUntil = gameState.currentTurn + npImpl.cooldown;
    }

    return {
      ...result,
      roundUsed: gameState.currentRound,
    };
  } catch (error) {
    console.error("Error executing Noble Phantasm:", error);
    return {
      success: false,
      message: "Error executing Noble Phantasm",
      error: "EXECUTION_ERROR",
      details: error.message,
    };
  }
};

export const getNPAffectedCells = (
  npImpl,
  caster,
  targetX,
  targetY,
  gridSize
) => {
  if (!npImpl?.microActions?.[0]) {
    console.error(
      "Invalid Noble Phantasm implementation or missing microActions"
    );
    return new Set();
  }

  try {
    const affectedCells = TargetingLogic.getAffectedCells({
      targetingType: npImpl.microActions[0].targetingType,
      casterX: caster.x,
      casterY: caster.y,
      range: npImpl.microActions[0].range,
      targetX,
      targetY,
      applyCornerRule: npImpl.microActions[0].applyCornerRule,
      gridSize,
      dimensions: npImpl.microActions[0].dimensions,
    });

    console.log("Calculated NP affected cells:", {
      npName: npImpl.name,
      targetingType: npImpl.microActions[0].targetingType,
      cellCount: affectedCells.size,
    });

    return affectedCells;
  } catch (error) {
    console.error("Error calculating NP affected cells:", error);
    return new Set();
  }
};
