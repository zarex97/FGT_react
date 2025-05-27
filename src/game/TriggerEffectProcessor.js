// TriggerEffectProcessor.js

import {
  getTriggerEffectImplementation,
  executeTriggerEffect,
} from "./registry_triggers.js";
export class TriggerEffectProcessor {
  static processTriggerEffects(gameState, eventType, eventData) {
    console.log(
      `🔍 Processing trigger effects for event: ${eventType}`,
      eventData
    );

    const triggeredEffects = [];

    // Check all units for trigger effects that match this event
    gameState.units.forEach((unit) => {
      console.log(`Checking unit ${unit.name} for trigger effects:`, {
        hasTriggerEffects: !!unit.triggerEffects,
        triggerEffectsCount: unit.triggerEffects?.length || 0,
        triggerIds: unit.triggerEffects?.map((tr) => tr.id) || [],
      });

      if (unit.triggerEffects && Array.isArray(unit.triggerEffects)) {
        unit.triggerEffects.forEach((triggerRef) => {
          // Get implementation from registry (same as skills)
          const triggerImpl = getTriggerEffectImplementation(triggerRef.id);

          if (!triggerImpl) {
            console.log(
              `  ❌ No implementation found for trigger: ${triggerRef.id}`
            );
            return;
          }

          console.log(
            `  Found trigger: ${triggerRef.id}, eventType: ${triggerImpl.eventType}`
          );

          if (triggerImpl.eventType === eventType) {
            console.log(`  ✅ Event type matches, checking conditions...`);

            try {
              const shouldTrigger = triggerImpl.shouldTrigger(
                eventData,
                gameState,
                unit
              );
              console.log(`  Condition result:`, shouldTrigger);

              if (shouldTrigger) {
                console.log(
                  `  🎯 Trigger activated: ${triggerImpl.name} for ${unit.name}`
                );
                triggeredEffects.push({
                  unit,
                  triggerRef,
                  triggerImpl,
                  eventData,
                });
              }
            } catch (error) {
              console.error(`  ❌ Error checking trigger condition:`, error);
            }
          } else {
            console.log(
              `  ⏭️  Event type mismatch: ${triggerImpl.eventType} vs ${eventType}`
            );
          }
        });
      } else {
        console.log(`  No trigger effects found for ${unit.name}`);
      }
    });

    // Sort by priority (higher priority first)
    triggeredEffects.sort(
      (a, b) => (b.triggerImpl.priority || 0) - (a.triggerImpl.priority || 0)
    );

    console.log(
      `🎯 Found ${triggeredEffects.length} triggered effects:`,
      triggeredEffects.map((te) => `${te.unit.name}: ${te.triggerImpl.name}`)
    );

    return triggeredEffects;
  }

  static applyTriggeredEffects(gameState, triggeredEffects) {
    let updatedGameState = { ...gameState };

    // Apply each triggered effect in order (same pattern as skills)
    triggeredEffects.forEach(({ unit, triggerRef, eventData }) => {
      console.log(
        `🔧 Executing trigger effect: ${triggerRef.id} for unit: ${unit.name}`
      );

      try {
        updatedGameState = executeTriggerEffect(
          triggerRef,
          eventData,
          updatedGameState,
          unit
        );
        console.log(`✅ Successfully executed ${triggerRef.id}`);
      } catch (error) {
        console.error(
          `❌ Error executing trigger effect ${triggerRef.id}:`,
          error
        );
      }
    });

    return updatedGameState;
  }

  // Main function to call from server actions
  static handleEvent(gameState, eventType, eventData) {
    const triggeredEffects = this.processTriggerEffects(
      gameState,
      eventType,
      eventData
    );

    if (triggeredEffects.length > 0) {
      console.log(
        `🚀 Processing ${triggeredEffects.length} trigger effects for event: ${eventType}`
      );
      gameState = this.applyTriggeredEffects(gameState, triggeredEffects);
    } else {
      console.log(`⭕ No trigger effects found for event: ${eventType}`);
    }

    return gameState;
  }
}
