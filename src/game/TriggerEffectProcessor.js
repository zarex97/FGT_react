// TriggerEffectProcessor.js
export class TriggerEffectProcessor {
  static processTriggerEffects(gameState, eventType, eventData) {
    const triggeredEffects = [];

    // Check all units for trigger effects that match this event
    gameState.units.forEach((unit) => {
      if (unit.triggerEffects && Array.isArray(unit.triggerEffects)) {
        unit.triggerEffects.forEach((triggerEffect) => {
          if (triggerEffect.eventType === eventType) {
            if (triggerEffect.shouldTrigger(eventData, gameState, unit)) {
              triggeredEffects.push({
                unit,
                triggerEffect,
                eventData,
              });
            }
          }
        });
      }
    });

    // Sort by priority (higher priority first)
    triggeredEffects.sort(
      (a, b) => b.triggerEffect.priority - a.triggerEffect.priority
    );

    return triggeredEffects;
  }

  static applyTriggeredEffects(gameState, triggeredEffects) {
    let updatedGameState = { ...gameState };

    // Apply each triggered effect in order
    triggeredEffects.forEach(({ unit, triggerEffect, eventData }) => {
      console.log(
        `Executing trigger effect: ${triggerEffect.name} for unit: ${unit.name}`
      );
      updatedGameState = triggerEffect.execute(
        eventData,
        updatedGameState,
        unit
      );
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
        `Processing ${triggeredEffects.length} trigger effects for event: ${eventType}`
      );
      gameState = this.applyTriggeredEffects(gameState, triggeredEffects);
    }

    return gameState;
  }
}
