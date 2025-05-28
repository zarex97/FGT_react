// src/game/triggerEffects/registry_triggers.js - Following your exact pattern from registry_skills.js

import { ServantRegistry } from "./servants/registry_character.js";
import { CommonTriggerEffects } from "../game/triggerEffects/CommonTriggerEffects.js";

// Flatten all trigger effects from all servants (character-specific effects)
const CharacterTriggerEffects = Object.values(ServantRegistry).reduce(
  (acc, servantClass) => {
    Object.values(servantClass).forEach((servant) => {
      if (servant.triggerEffects) {
        Object.entries(servant.triggerEffects).forEach(
          ([triggerName, triggerImpl]) => {
            acc[triggerName] = triggerImpl;
          }
        );
      }
    });
    return acc;
  },
  {}
);

// Combine common trigger effects with character-specific ones
export const TriggerEffectImplementations = {
  ...CommonTriggerEffects, // Common effects (Curse, Burn, Regen, etc.)
  ...CharacterTriggerEffects, // Character-specific effects (Gogh's buff, etc.)
};

// Utility functions (same pattern as your skill registry)
export const getTriggerEffectImplementation = (triggerId) => {
  return TriggerEffectImplementations[triggerId];
};

export const executeTriggerEffect = (
  triggerRef,
  eventData,
  gameState,
  unit
) => {
  const triggerImpl = getTriggerEffectImplementation(triggerRef.id);

  console.log("🎯 Executing trigger effect:", {
    triggerName: triggerRef.id,
    unit: unit.name,
    eventType: eventData.type,
  });

  if (!triggerImpl) {
    console.error(`No implementation found for trigger: ${triggerRef.id}`);
    return gameState;
  }

  // Check if trigger should activate
  if (!triggerImpl.shouldTrigger(eventData, gameState, unit)) {
    console.log("Trigger condition not met");
    return gameState;
  }

  // Execute the trigger effect
  const result = triggerImpl.execute(eventData, gameState, unit);

  console.log("Trigger effect execution result:", {
    success: !!result,
    triggerName: triggerRef.id,
  });

  return result;
};
