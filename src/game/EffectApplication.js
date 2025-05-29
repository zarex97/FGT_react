// EffectApplication.js
export class EffectApplication {
  constructor({
    caster,
    target,
    effect,
    gameState,
    applicationSource = "Skill", // "Skill", "NP", "Passive", etc.
  }) {
    this.caster = caster;
    this.target = target;
    this.effect = effect;
    this.gameState = gameState;
    this.applicationSource = applicationSource;

    // Initialize application results
    this.applicationResults = {
      baseSuccessChance: 85, // Base 85% success rate
      modifiers: {
        caster: {
          buffChanceUp: 0,
          debuffChanceUp: 0,
          effectPowerUp: 0,
        },
        target: {
          buffResistance: 0,
          debuffResistance: 0,
          effectResistance: 0,
          immunities: [],
        },
      },
      finalSuccessChance: 0,
      rolled: false,
      rollResult: 0,
      wasSuccessful: false,
      appliedEffect: null,
      updatedCaster: null,
      updatedTarget: null,
    };
  }

  // Step 1: Calculate success chance based on modifiers (with specific caster bonuses)
  calculateSuccessChance() {
    const { caster, target } = this.applicationResults.modifiers;
    let successChance = this.applicationResults.baseSuccessChance;

    // Determine if this is a buff or debuff
    const isBuff = this.isEffectBuff(this.effect);
    const isDebuff = this.isEffectDebuff(this.effect);

    console.log(`🎯 Effect Application: ${this.effect.name}`, {
      isBuff,
      isDebuff,
      baseChance: successChance,
      effectType: this.effect.type,
      effectCategory: this.effect.category,
    });

    // Apply general caster modifiers
    if (isBuff) {
      successChance += caster.buffChanceUp;
    } else if (isDebuff) {
      successChance += caster.debuffChanceUp;
    }

    // Apply specific caster modifiers
    const effectCategory = this.effect.category;
    const effectType = this.effect.type;
    const effectName = this.effect.name;

    // Check for specific buff chance bonuses
    if (isBuff) {
      if (effectCategory && caster.specificBuffChance[effectCategory]) {
        const specificBonus = caster.specificBuffChance[effectCategory];
        successChance += specificBonus;
        console.log(
          `🔮 Specific buff category bonus: ${effectCategory} +${specificBonus}%`
        );
      }
      if (caster.specificBuffChance[effectType]) {
        const specificBonus = caster.specificBuffChance[effectType];
        successChance += specificBonus;
        console.log(
          `🔮 Specific buff type bonus: ${effectType} +${specificBonus}%`
        );
      }
      if (caster.specificBuffChance[effectName]) {
        const specificBonus = caster.specificBuffChance[effectName];
        successChance += specificBonus;
        console.log(
          `🔮 Specific buff name bonus: ${effectName} +${specificBonus}%`
        );
      }
    }

    // Check for specific debuff chance bonuses
    if (isDebuff) {
      if (effectCategory && caster.specificDebuffChance[effectCategory]) {
        const specificBonus = caster.specificDebuffChance[effectCategory];
        successChance += specificBonus;
        console.log(
          `🔮 Specific debuff category bonus: ${effectCategory} +${specificBonus}%`
        );
      }
      if (caster.specificDebuffChance[effectType]) {
        const specificBonus = caster.specificDebuffChance[effectType];
        successChance += specificBonus;
        console.log(
          `🔮 Specific debuff type bonus: ${effectType} +${specificBonus}%`
        );
      }
      if (caster.specificDebuffChance[effectName]) {
        const specificBonus = caster.specificDebuffChance[effectName];
        successChance += specificBonus;
        console.log(
          `🔮 Specific debuff name bonus: ${effectName} +${specificBonus}%`
        );
      }
    }

    // Apply general target resistance
    if (isBuff) {
      successChance -= target.buffResistance;
    } else if (isDebuff) {
      successChance -= target.debuffResistance;
    }

    // Apply specific target resistances
    if (effectCategory && target.specificResistances[effectCategory]) {
      const specificResistance = target.specificResistances[effectCategory];
      successChance -= specificResistance;
      console.log(
        `🛡️ Specific category resistance: ${effectCategory} -${specificResistance}%`
      );
    }

    if (target.specificResistances[effectType]) {
      const specificResistance = target.specificResistances[effectType];
      successChance -= specificResistance;
      console.log(
        `🛡️ Specific type resistance: ${effectType} -${specificResistance}%`
      );
    }

    if (target.specificResistances[effectName]) {
      const specificResistance = target.specificResistances[effectName];
      successChance -= specificResistance;
      console.log(
        `🛡️ Specific name resistance: ${effectName} -${specificResistance}%`
      );
    }

    // General effect resistance
    successChance -= target.effectResistance;

    // Ensure bounds (0-100%)
    this.applicationResults.finalSuccessChance = Math.max(
      0,
      Math.min(100, successChance)
    );

    console.log(
      `🎯 Final success chance: ${this.applicationResults.finalSuccessChance}%`
    );
  }

  // Step 2: Collect caster modifiers (with consumption tracking)
  collectCasterModifiers() {
    const modifiers = {
      buffChanceUp: 0,
      debuffChanceUp: 0,
      effectPowerUp: 0,
      specificBuffChance: {},
      specificDebuffChance: {},
      usedEffects: [], // Track which effects should be consumed
    };

    this.caster.effects?.forEach((effect) => {
      switch (effect.type) {
        case "Buff Chance Up":
          modifiers.buffChanceUp += effect.value || 15;
          if (effect.uses) {
            modifiers.usedEffects.push(effect);
          }
          break;
        case "Debuff Chance Up":
          modifiers.debuffChanceUp += effect.value || 15;
          if (effect.uses) {
            modifiers.usedEffects.push(effect);
          }
          break;
        case "Effect Power Up":
          modifiers.effectPowerUp += effect.value || 10;
          if (effect.uses) {
            modifiers.usedEffects.push(effect);
          }
          break;
        case "Specific Buff Chance Up":
          // Handle specific buff chance improvements
          if (
            effect.appliesToEffects &&
            Array.isArray(effect.appliesToEffects)
          ) {
            effect.appliesToEffects.forEach((effectType) => {
              modifiers.specificBuffChance[effectType] =
                (modifiers.specificBuffChance[effectType] || 0) +
                (effect.value || 15);
            });
          }
          if (effect.uses) {
            modifiers.usedEffects.push(effect);
          }
          break;
        case "Specific Debuff Chance Up":
          // Handle specific debuff chance improvements
          if (
            effect.appliesToEffects &&
            Array.isArray(effect.appliesToEffects)
          ) {
            effect.appliesToEffects.forEach((effectType) => {
              modifiers.specificDebuffChance[effectType] =
                (modifiers.specificDebuffChance[effectType] || 0) +
                (effect.value || 15);
            });
          }
          if (effect.uses) {
            modifiers.usedEffects.push(effect);
          }
          break;
      }
    });

    this.applicationResults.modifiers.caster = modifiers;
    console.log(`🔮 Caster modifiers:`, modifiers);
  }

  // Step 3: Collect target resistance (with specific resistances and limited uses)
  collectTargetResistance() {
    const modifiers = {
      buffResistance: 0,
      debuffResistance: 0,
      effectResistance: 0,
      specificResistances: {},
      immunities: [],
      specificImmunities: [],
      limitedUseDefenses: [], // Track effects that can be consumed
    };

    this.target.effects?.forEach((effect) => {
      switch (effect.type) {
        case "Buff Resistance":
          modifiers.buffResistance += effect.value || 20;
          if (effect.uses) {
            modifiers.limitedUseDefenses.push(effect);
          }
          break;
        case "Debuff Resistance":
          modifiers.debuffResistance += effect.value || 20;
          if (effect.uses) {
            modifiers.limitedUseDefenses.push(effect);
          }
          break;
        case "Effect Resistance":
          modifiers.effectResistance += effect.value || 15;
          if (effect.uses) {
            modifiers.limitedUseDefenses.push(effect);
          }
          break;
        case "Specific Resistance":
          // Handle specific resistances like "Mental Debuff Resistance"
          if (effect.resistsAgainst && Array.isArray(effect.resistsAgainst)) {
            effect.resistsAgainst.forEach((resistType) => {
              modifiers.specificResistances[resistType] =
                (modifiers.specificResistances[resistType] || 0) +
                (effect.value || 20);
            });
          }
          if (effect.uses) {
            modifiers.limitedUseDefenses.push(effect);
          }
          break;
        case "Immunity":
          if (effect.immuneTo) {
            if (Array.isArray(effect.immuneTo)) {
              modifiers.immunities.push(...effect.immuneTo);
            } else {
              modifiers.immunities.push(effect.immuneTo);
            }
          }
          if (effect.uses) {
            modifiers.limitedUseDefenses.push(effect);
          }
          break;
        case "Specific Immunity":
          // Handle specific immunities like "Stun Immunity"
          if (effect.immuneTo) {
            if (Array.isArray(effect.immuneTo)) {
              modifiers.specificImmunities.push(
                ...effect.immuneTo.map((immunity) => ({
                  type: immunity,
                  effect: effect,
                  hasUses: !!effect.uses,
                }))
              );
            } else {
              modifiers.specificImmunities.push({
                type: effect.immuneTo,
                effect: effect,
                hasUses: !!effect.uses,
              });
            }
          }
          break;
      }
    });

    this.applicationResults.modifiers.target = modifiers;
    console.log(`🛡️ Target resistance:`, modifiers);
  }

  // Step 4: Roll for success
  rollForSuccess() {
    const roll = Math.floor(Math.random() * 100) + 1;
    const wasSuccessful = roll <= this.applicationResults.finalSuccessChance;

    this.applicationResults.rolled = true;
    this.applicationResults.rollResult = roll;
    this.applicationResults.wasSuccessful = wasSuccessful;

    console.log(
      `🎲 Effect roll: ${roll} vs ${
        this.applicationResults.finalSuccessChance
      } = ${wasSuccessful ? "SUCCESS" : "FAILED"}`
    );
  }

  // Step 5: Apply the effect if successful (with caster and target effect consumption)
  applyEffectToTarget() {
    if (!this.applicationResults.wasSuccessful) {
      console.log(`❌ Effect application failed, no changes made`);
      this.applicationResults.updatedCaster = { ...this.caster };
      this.applicationResults.updatedTarget = { ...this.target };
      return;
    }

    const { target, caster } = this.applicationResults.modifiers;

    // Check for general immunities
    const generalImmunities = target.immunities;
    if (
      generalImmunities.includes(this.effect.name) ||
      generalImmunities.includes(this.effect.type)
    ) {
      console.log(
        `🛡️ Target is immune to ${this.effect.name} (general immunity)`
      );
      this.applicationResults.wasSuccessful = false;
      this.applicationResults.updatedCaster = { ...this.caster };
      this.applicationResults.updatedTarget = { ...this.target };
      return;
    }

    // Check for specific immunities (and consume limited uses)
    const effectCategory = this.effect.category;
    const effectType = this.effect.type;
    const effectName = this.effect.name;
    const isBuff = this.isEffectBuff(this.effect);
    const isDebuff = this.isEffectDebuff(this.effect);

    let immunityBlocked = false;
    let consumedTargetDefenses = []; // Track which target defenses were consumed
    let consumedCasterEffects = []; // Track which caster effects should be consumed

    // Check specific immunities by category, type, and name
    const checkTargets = [effectCategory, effectType, effectName].filter(
      Boolean
    );

    for (const checkTarget of checkTargets) {
      const specificImmunity = target.specificImmunities.find(
        (immunity) => immunity.type === checkTarget
      );
      if (specificImmunity) {
        console.log(`🛡️ Target has specific immunity to ${checkTarget}`);
        immunityBlocked = true;

        // If this immunity has limited uses, consume one
        if (specificImmunity.hasUses && specificImmunity.effect.uses > 0) {
          consumedTargetDefenses.push(specificImmunity.effect);
          console.log(
            `🛡️ Consuming immunity use: ${specificImmunity.effect.name} (${
              specificImmunity.effect.uses
            } -> ${specificImmunity.effect.uses - 1})`
          );
        }
        break; // First immunity found blocks the effect
      }
    }

    if (immunityBlocked) {
      this.applicationResults.wasSuccessful = false;
      // Update target with consumed defenses, but don't consume caster effects since effect was blocked
      const updatedTarget = this.updateTargetAfterDefenseConsumption(
        this.target,
        consumedTargetDefenses
      );
      this.applicationResults.updatedCaster = { ...this.caster };
      this.applicationResults.updatedTarget = updatedTarget;
      return;
    }

    // If we get here, the effect will be applied successfully
    // Determine which caster effects should be consumed

    // General enhancement effects that were used
    if (isBuff && caster.buffChanceUp > 0) {
      caster.usedEffects.forEach((effect) => {
        if (effect.type === "Buff Chance Up" && effect.uses > 0) {
          consumedCasterEffects.push(effect);
        }
      });
    }

    if (isDebuff && caster.debuffChanceUp > 0) {
      caster.usedEffects.forEach((effect) => {
        if (effect.type === "Debuff Chance Up" && effect.uses > 0) {
          consumedCasterEffects.push(effect);
        }
      });
    }

    // Specific enhancement effects that were used
    const checkForSpecificConsumption = (specificEffects, effectType) => {
      Object.keys(specificEffects).forEach((key) => {
        if ([effectCategory, effectType, effectName].includes(key)) {
          caster.usedEffects.forEach((effect) => {
            if (
              effect.type === effectType &&
              effect.appliesToEffects?.includes(key) &&
              effect.uses > 0 &&
              !consumedCasterEffects.includes(effect)
            ) {
              consumedCasterEffects.push(effect);
            }
          });
        }
      });
    };

    if (isBuff) {
      checkForSpecificConsumption(
        caster.specificBuffChance,
        "Specific Buff Chance Up"
      );
    }
    if (isDebuff) {
      checkForSpecificConsumption(
        caster.specificDebuffChance,
        "Specific Debuff Chance Up"
      );
    }

    // Check if any resistance effects should be consumed
    target.limitedUseDefenses.forEach((defense) => {
      if (defense.uses > 0) {
        const appliesToEffect = this.doesDefenseApplyToEffect(
          defense,
          this.effect
        );
        if (appliesToEffect) {
          consumedTargetDefenses.push(defense);
          console.log(
            `🛡️ Consuming resistance use: ${defense.name} (${defense.uses} -> ${
              defense.uses - 1
            })`
          );
        }
      }
    });

    // Create the final effect with all properties
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

    // Update target with new effect and consumed defenses
    let updatedTarget = {
      ...this.target,
      effects: [...(this.target.effects || []), finalEffect],
    };

    // Apply target defense consumption
    if (consumedTargetDefenses.length > 0) {
      updatedTarget = this.updateTargetAfterDefenseConsumption(
        updatedTarget,
        consumedTargetDefenses
      );
    }

    // Update caster (consume limited use effects)
    const updatedCaster = this.updateCasterAfterApplication(
      this.caster,
      consumedCasterEffects
    );

    this.applicationResults.appliedEffect = finalEffect;
    this.applicationResults.updatedCaster = updatedCaster;
    this.applicationResults.updatedTarget = updatedTarget;
    this.applicationResults.consumedTargetDefenses = consumedTargetDefenses;
    this.applicationResults.consumedCasterEffects = consumedCasterEffects;

    console.log(
      `✅ Successfully applied ${finalEffect.name} to ${this.target.name}`
    );
    if (consumedTargetDefenses.length > 0) {
      console.log(
        `🛡️ Consumed ${consumedTargetDefenses.length} target defensive effects`
      );
    }
    if (consumedCasterEffects.length > 0) {
      console.log(
        `🔮 Consumed ${consumedCasterEffects.length} caster enhancement effects`
      );
    }
  }

  // Helper: Calculate final effect value with power modifiers
  calculateFinalEffectValue() {
    const baseValue = this.effect.value || 0;
    const powerModifier =
      this.applicationResults.modifiers.caster.effectPowerUp;
    return Math.floor(baseValue * (1 + powerModifier / 100));
  }

  // Helper: Update target after consuming defensive effects
  updateTargetAfterDefenseConsumption(target, consumedDefenses) {
    if (consumedDefenses.length === 0) return target;

    const updatedEffects =
      target.effects
        ?.map((effect) => {
          const consumedDefense = consumedDefenses.find(
            (def) =>
              def.name === effect.name && def.appliedAt === effect.appliedAt
          );
          if (consumedDefense && effect.uses) {
            const newUses = effect.uses - 1;
            if (newUses <= 0) {
              console.log(`🛡️ Defense exhausted, removing: ${effect.name}`);
              return null; // Mark for removal
            }
            return { ...effect, uses: newUses };
          }
          return effect;
        })
        .filter(Boolean) || []; // Remove null effects

    return {
      ...target,
      effects: updatedEffects,
    };
  }

  // Helper: Check if a defensive effect applies to the incoming effect
  doesDefenseApplyToEffect(defense, incomingEffect) {
    // Check if defense has specific targets it protects against
    if (defense.resistsAgainst && Array.isArray(defense.resistsAgainst)) {
      return defense.resistsAgainst.some(
        (resistType) =>
          resistType === incomingEffect.name ||
          resistType === incomingEffect.type ||
          resistType === incomingEffect.category
      );
    }

    // For general resistances, check archetype match
    if (defense.type === "Buff Resistance") {
      return this.isEffectBuff(incomingEffect);
    }
    if (defense.type === "Debuff Resistance") {
      return this.isEffectDebuff(incomingEffect);
    }
    if (defense.type === "Effect Resistance") {
      return true; // General resistance applies to all effects
    }

    return false;
  }
  // Helper: Update caster (consume limited-use enhancement effects)
  updateCasterAfterApplication(caster, consumedCasterEffects = []) {
    if (consumedCasterEffects.length === 0) {
      return { ...caster };
    }

    const updatedEffects =
      caster.effects
        ?.map((effect) => {
          const consumedEffect = consumedCasterEffects.find(
            (consumed) =>
              consumed.name === effect.name &&
              consumed.appliedAt === effect.appliedAt &&
              consumed.type === effect.type
          );

          if (consumedEffect && effect.uses) {
            const newUses = effect.uses - 1;
            if (newUses <= 0) {
              console.log(
                `🔮 Caster enhancement exhausted, removing: ${effect.name}`
              );
              return null; // Mark for removal
            }
            console.log(
              `🔮 Caster enhancement consumed: ${effect.name} (${effect.uses} -> ${newUses})`
            );
            return { ...effect, uses: newUses };
          }
          return effect;
        })
        .filter(Boolean) || []; // Remove null effects

    return {
      ...caster,
      effects: updatedEffects,
    };
  }

  // Helper: Determine if effect is a buff
  isEffectBuff(effect) {
    const buffTypes = [
      "AttackUp",
      "DefenseUp",
      "SpeedUp",
      "CritUp",
      "HealOverTime",
    ];
    const buffCategories = ["Offensive Buffs", "Defensive Buffs"];
    return (
      buffTypes.includes(effect.type) ||
      buffCategories.includes(effect.category) ||
      effect.archetype === "buff"
    );
  }

  // Helper: Determine if effect is a debuff
  isEffectDebuff(effect) {
    const debuffTypes = [
      "AttackDown",
      "DefenseDown",
      "SpeedDown",
      "Poison",
      "Curse",
    ];
    const debuffCategories = [
      "Offensive Debuffs",
      "Defensive Debuffs",
      "Mental Debuffs",
      "Ailment Debuffs",
    ];
    return (
      debuffTypes.includes(effect.type) ||
      debuffCategories.includes(effect.category) ||
      effect.archetype === "debuff"
    );
  }

  // Helper: Auto-determine archetype
  determineArchetype(effect) {
    if (this.isEffectBuff(effect)) return "buff";
    if (this.isEffectDebuff(effect)) return "debuff";
    return "neutral";
  }

  // Helper: Auto-determine category
  determineCategory(effect) {
    const offensiveBuffs = ["AttackUp", "CritUp", "CritDmgUp"];
    const defensiveBuffs = ["DefenseUp", "HealOverTime", "DamageReduction"];
    const offensiveDebuffs = ["AttackDown", "CritDown"];
    const defensiveDebuffs = ["DefenseDown", "VulnerabilityUp"];
    const ailmentDebuffs = ["Poison", "Curse", "Burn"];
    const sealingDebuffs = ["SkillSeal", "NPSeal"];

    if (offensiveBuffs.includes(effect.type)) return "Offensive Buffs";
    if (defensiveBuffs.includes(effect.type)) return "Defensive Buffs";
    if (offensiveDebuffs.includes(effect.type)) return "Offensive Debuffs";
    if (defensiveDebuffs.includes(effect.type)) return "Defensive Debuffs";
    if (ailmentDebuffs.includes(effect.type)) return "Ailment Debuffs";
    if (sealingDebuffs.includes(effect.type)) return "Sealing Debuffs";

    return null;
  }

  // Main method: Execute the full application process
  executeApplication() {
    console.log(
      `🎯 Starting effect application: ${this.effect.name} from ${this.caster.name} to ${this.target.name}`
    );

    this.collectCasterModifiers();
    this.collectTargetResistance();
    this.calculateSuccessChance();
    this.rollForSuccess();
    this.applyEffectToTarget();

    return this.applicationResults;
  }

  // Helper: Get sanitized results for storage/transmission
  getSanitizedResults() {
    return {
      wasSuccessful: this.applicationResults.wasSuccessful,
      rollResult: this.applicationResults.rollResult,
      finalSuccessChance: this.applicationResults.finalSuccessChance,
      appliedEffect: this.applicationResults.appliedEffect,
      consumedTargetDefenses:
        this.applicationResults.consumedTargetDefenses?.map((def) => ({
          name: def.name,
          type: def.type,
          usesRemaining: def.uses - 1,
        })) || [],
      consumedCasterEffects:
        this.applicationResults.consumedCasterEffects?.map((eff) => ({
          name: eff.name,
          type: eff.type,
          usesRemaining: eff.uses - 1,
        })) || [],
      casterInfo: {
        id: this.caster.id,
        name: this.caster.name,
      },
      targetInfo: {
        id: this.target.id,
        name: this.target.name,
      },
    };
  }
}

// Convenience function for use in MicroActions
export const applyEffect = (
  caster,
  target,
  effect,
  gameState,
  applicationSource = "Skill"
) => {
  const application = new EffectApplication({
    caster,
    target,
    effect,
    gameState,
    applicationSource,
  });

  const results = application.executeApplication();

  return {
    wasSuccessful: results.wasSuccessful,
    updatedCaster: results.updatedCaster,
    updatedTarget: results.updatedTarget,
    applicationResults: results,
  };
};
