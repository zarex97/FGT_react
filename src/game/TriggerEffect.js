// TriggerEffect.js
export class TriggerEffect {
  constructor({
    eventType,
    conditionLogic, // function that returns true/false
    effectLogic, // function that executes the effect
    name,
    description,
    source,
    priority = 0, // for ordering when multiple triggers fire
  }) {
    this.eventType = eventType;
    this.conditionLogic = conditionLogic;
    this.effectLogic = effectLogic;
    this.name = name;
    this.description = description;
    this.source = source;
    this.priority = priority;
  }

  shouldTrigger(eventData, gameState, unit) {
    try {
      return this.conditionLogic(eventData, gameState, unit);
    } catch (error) {
      console.error(`Error in trigger condition for ${this.name}:`, error);
      return false;
    }
  }

  execute(eventData, gameState, unit) {
    try {
      return this.effectLogic(eventData, gameState, unit);
    } catch (error) {
      console.error(`Error executing trigger effect ${this.name}:`, error);
      return gameState; // Return unchanged state on error
    }
  }
}
