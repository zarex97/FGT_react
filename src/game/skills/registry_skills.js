// src/game/skills/registry.js
import { MicroAction } from "../MicroAction";
import { TargetingLogic } from "../targeting/TargetingLogic";
import { TargetingType } from "../targeting/TargetingTypes";
import { Skill } from "../Skill";
import { ServantRegistry } from "../servants/registry_character";

export const SkillImplementations = Object.values(ServantRegistry).reduce(
  (acc, servantClass) => {
    Object.values(servantClass).forEach((servant) => {
      const characterName = servant.template.name; // Get character name from template
      Object.entries(servant.skills).forEach(([skillName, skillImpl]) => {
        const uniqueKey = `${characterName}_${skillName}`; // Create unique key
        acc[uniqueKey] = skillImpl;
      });
    });
    return acc;
  },
  {}
);

// Rest of your existing registry.js code remains the same
export const getSkillImplementation = (skillId) => {
  return SkillImplementations[skillId];
};

export const isSkillOnCooldown = (skillRef, currentTurn) => {
  if (!skillRef || typeof skillRef.onCooldownUntil !== "number") return false;
  return currentTurn <= skillRef.onCooldownUntil;
};

export const executeSkill = (skillRef, gameState, caster, targetX, targetY) => {
  const skillImpl = getSkillImplementation(skillRef.id);

  console.log("Executing skill (Skills registry):", {
    skillName: skillRef.id,
    caster,
    targetX,
    targetY,
    currentTurn: gameState.currentTurn,
  });

  if (!skillImpl) {
    console.error(`No implementation found for skill: ${skillRef.id}`);
    return { success: false, message: "Skill not found" };
  }

  if (isSkillOnCooldown(skillRef, gameState.currentTurn)) {
    console.log("Skill is on cooldown:", {
      currentTurn: gameState.currentTurn,
      cooldownUntil: skillRef.onCooldownUntil,
    });
    return { success: false, message: "Skill is on cooldown" };
  }

  // Use the Skill class's execute method
  const result = skillImpl.execute(gameState, caster, targetX, targetY);

  console.log("Skill execution result (Skills registry):", {
    success: result.success,
    updatedState: result.updatedGameState,
  });

  // Update cooldown in the reference if execution was successful
  if (result.success) {
    skillRef.onCooldownUntil = gameState.currentTurn + skillImpl.cooldown;
  }

  return result;
};

export const getSkillAffectedCells = (
  skillImpl,
  caster,
  targetX,
  targetY,
  gridSize
) => {
  if (!skillImpl.microActions?.[0]) return new Set();

  const affectedCells = TargetingLogic.getAffectedCells({
    targetingType: skillImpl.microActions[0].targetingType,
    casterX: caster.x,
    casterY: caster.y,
    range: skillImpl.microActions[0].range,
    targetX,
    targetY,
    applyCornerRule: skillImpl.microActions[0].applyCornerRule,
    gridSize,
    dimensions: skillImpl.microActions[0].dimensions,
  });

  console.log("Calculated affected cells:", {
    targetingType: skillImpl.microActions[0].targetingType,
    casterPosition: { x: caster.x, y: caster.y },
    targetPosition: { x: targetX, y: targetY },
    cellCount: affectedCells.size,
  });

  return affectedCells;
};
