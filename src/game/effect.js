/**
 * Adds two numbers.
 * @param {string} name - The name of the effect
 * @param {string} description - The description of the effect
 * @param {string} type - The type of the effect (Attack Up, Crit Down, etc)
 * @param {number} value - The magnitude of the effect, it could be 10% or a flat number like 3
 * @param {number} duration - how much will it last on game rounds
 * @param {number} appliedAt - the turn when it was applied
 * @param {string} source - Which Attack/Skill/NP applied it
 * @param {number} npValue - The magnitude if np
 * @param {string} archetype - "buff", "debuff" or "neutral"
 * @param {boolean} removable - If the effect is removable or not
 * @param {string} category - offensiveBuffs, defensiveBuffs, offensiveDebuffs, defensiveDebuffs, ailmentDebuffs, sealingDebuffs (Can be auto determinated on EffectApplication.js)
 * @param {Array}  appliesToEffects - Array of specific chance modifiers for caster by category/type/name, like increase chance of applying charm (e.g: appliesToEffects: ["Immobility Debuffs"] or appliesToEffects: ["Charm"])
 * @param {Array}  resistsAgainst - Array of specific resistances for defender by category/type/name
 * @param {Array}  immuneTo - Array of immunities for defender by category/type/name (e.g:  immuneTo: ["Poison", "Mental Debuffs"])
 * @param {string} flatOrMultiplier - if the value is to be taken flatly (+10) or exponentially (10%), mostly for damage related
 */
resistsAgainst;
export class Effect {
  constructor(
    name,
    description,
    type,
    value,
    duration,
    appliedAt = null,
    source = null,
    npValue = null,
    archetype = null,
    removable = null,
    category = null,
    appliesToEffects = null,
    immuneTo = null,
    resistsAgainst = null,
    flatOrMultiplier = null
  ) {
    this.name = name;
    this.type = type;
    this.description = description;
    this.value = value;
    this.duration = duration;
    this.appliedAt = appliedAt;
    this.source = source;
    this.npValue = npValue;
    this.archetype = archetype;
    this.removable = removable;
    this.category = category;
    this.appliesToEffects = appliesToEffects;
    this.immuneTo = immuneTo;
    this.resistsAgainst = resistsAgainst;
    this.flatOrMultiplier = flatOrMultiplier;
  }
}
const finalEffect = {
  name: this.effect.name,
  type: this.effect.type,
  value: this.calculateFinalEffectValue(),
  duration: this.effect.duration || null,
  uses: this.effect.uses || null,
  appliedAt: this.gameState.currentTurn,
  description: this.effect.description || `Applied ${this.effect.name}`,
  source: this.effect.source || this.applicationSource,
  npValue:
    this.applicationSource === "NP"
      ? this.effect.npValue || this.effect.value
      : null,
  archetype: this.effect.archetype || this.determineArchetype(this.effect),
  removable: this.effect.removable !== false, // Default true unless explicitly false
  category: this.effect.category || this.determineCategory(this.effect),
};
