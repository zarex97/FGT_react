// Enhanced Combat.js with sophisticated rank-based resistance system

export class Combat {
  constructor({
    typeOfAttackCausingIt,
    proportionOfMagicUsed,
    proportionOfStrengthUsed,
    attacker,
    defender,
    gameState,
    integratedAttackMultiplier,
    integratedAttackFlatBonus,
    rankLetter = null, // For Noble Phantasm attacks
  }) {
    this.typeOfAttackCausingIt = typeOfAttackCausingIt;
    this.proportionOfMagicUsed = proportionOfMagicUsed;
    this.proportionOfStrengthUsed = proportionOfStrengthUsed;
    this.attacker = attacker;
    this.defender = defender;
    this.gameState = gameState;
    this.integratedAttackMultiplier = integratedAttackMultiplier;
    this.integratedAttackFlatBonus = integratedAttackFlatBonus;
    this.rankLetter = rankLetter;

    // Initialize enhanced combat results with both magical and physical resistance tracking
    this.combatResults = {
      initialForces: {
        magic: 0,
        strength: 0,
        total: 0,
      },
      attackComposition: {
        magicalPortion: 0,
        physicalPortion: 0,
      },
      criticals: {
        chance: 50,
        rolled: false,
        modifier: 0,
        damage: 0,
        damageModifierMagic: 0,
        damageModifierPhysical: 0,
      },
      modifiers: {
        attacker: {
          flatAttack: 0,
          multiplierAttack: 0,
          critChance: 0,
          critDamage: 0,
        },
        defender: {
          flatDefense: 0,
          multiplierDefense: 0,
          critResistance: 0,
          critDamageResistance: 0,
          // Enhanced resistance tracking for both damage types
          magicResistance: {
            isCompletelyNegated: false,
            reductionFlat: 0,
            reductionMultiplier: 0,
            appliedEffects: [],
            attackRank: null,
            defenseRank: null,
            comparisonMethod: null, // "parameter" or "noble_phantasm"
          },
          strengthResistance: {
            isCompletelyNegated: false,
            reductionFlat: 0,
            reductionMultiplier: 0,
            appliedEffects: [],
            attackRank: null,
            defenseRank: null,
            comparisonMethod: null, // "parameter" or "noble_phantasm"
          },
        },
      },
      finalDamage: {
        magical: 0,
        physical: 0,
        total: 0,
      },
      response: {
        hitWithLuck_attacker: { done: false, success: false },
        evadeWithLuck_defender: { done: false, success: false },
        AgiEvasion_defender: { done: false, success: false },
        evadeWithCS_defender: { done: false, success: false },
        currentStep: 1,
        readyToConfirm: false,
        awaitingAttacker: false,
      },
      typeOfAttackCausingIt: this.typeOfAttackCausingIt,
      proportionOfMagicUsed: this.proportionOfMagicUsed,
      proportionOfStrengthUsed: this.proportionOfStrengthUsed,
      attacker: this.attacker,
      defender: this.defender,
      gameState: this.gameState,
      integratedAttackMultiplier: this.integratedAttackMultiplier,
      integratedAttackFlatBonus: this.integratedAttackFlatBonus,
      rankLetter: this.rankLetter,
    };
  }

  // Helper method to determine if we should use npValue instead of value
  getEffectValue(effect) {
    if (
      this.typeOfAttackCausingIt === "Noble Phantasm" &&
      effect.npValue !== undefined
    ) {
      return effect.npValue;
    }
    return effect.value;
  }

  /**
   * Determine the appropriate attack rank for resistance comparison
   * @param {string} resistanceType - "magic" or "strength"
   * @returns {string|null} The rank to use for comparison
   */
  getAttackRankForResistance(resistanceType) {
    // For Noble Phantasm attacks, always use the combat's rank letter
    if (this.typeOfAttackCausingIt === "Noble Phantasm") {
      return this.rankLetter;
    }

    // For non-NP attacks, use parameter-based ranking (parameters are already in rank format)
    if (resistanceType === "magic") {
      const attackerMag = this.attacker.parameters?.mag;
      if (attackerMag) {
        return attackerMag; // Already in rank format like "B", "A+", etc.
      }
    } else if (resistanceType === "strength") {
      const attackerStr = this.attacker.parameters?.str;
      if (attackerStr) {
        return attackerStr; // Already in rank format like "C+", "B--", etc.
      }
    }

    return null;
  }

  /**
   * Determine the appropriate defense rank for resistance comparison
   * @param {string} resistanceType - "magic" or "strength"
   * @returns {string|null} The rank to use for comparison
   */
  getDefenseRankForResistance(resistanceType) {
    // For Noble Phantasm attacks, use the resistance effect's sourceLetterRank
    if (this.typeOfAttackCausingIt === "Noble Phantasm") {
      // This will be determined per-effect in the resistance processing
      return null;
    }

    // For non-NP attacks, use defender's parameter-based ranking (parameters are already in rank format)
    if (resistanceType === "magic") {
      const defenderMag = this.defender.parameters?.mag;
      if (defenderMag) {
        return defenderMag; // Already in rank format like "A", "B+", etc.
      }
    } else if (resistanceType === "strength") {
      const defenderStr = this.defender.parameters?.str;
      if (defenderStr) {
        return defenderStr; // Already in rank format like "C+", "A-", etc.
      }
    }

    return null;
  }

  // Main combat flow methods
  initiateCombat() {
    this.calculateInitialForces();
    this.calculateAttackComposition();
    this.collectAttackerModifiers();
    this.collectDefenderModifiers();
    this.calculateFinalDamage();
    return this.combatResults;
  }

  receiveCombat() {
    this.collectDefenderModifiers();
    this.rollCritical();
    this.calculateFinalDamage();
    return this.combatResults;
  }

  calculateInitialForces() {
    const { magic, strength } = this.attacker;
    const initialForceMagic = this.proportionOfMagicUsed * magic;
    const initialForceStrength = this.proportionOfStrengthUsed * strength;

    this.combatResults.initialForces = {
      magic: initialForceMagic,
      strength: initialForceStrength,
      total: initialForceMagic + initialForceStrength,
    };
  }

  calculateAttackComposition() {
    const { magic, strength, total } = this.combatResults.initialForces;
    this.combatResults.attackComposition = {
      magicalPortion: total === 0 ? 0 : magic / total,
      physicalPortion: total === 0 ? 0 : strength / total,
    };
  }

  collectAttackerModifiers() {
    const modifiers = {
      flatAttack: 0,
      multiplierAttack: 0,
      critChance: 0,
      critDamage: 0,
      // NEW: Magic Resistance Nullification tracking
      magicResistanceNullification: {
        flatReduction: 0,
        multiplierReduction: 0,
        appliedEffects: [],
      },
    };

    // Track effects to remove (those that reach 0 uses)
    const effectsToRemove = [];

    this.attacker.effects?.forEach((effect, index) => {
      // Check if effect has limited uses and process accordingly
      let shouldApplyEffect = true;
      if (effect.uses !== undefined && effect.uses !== null) {
        if (effect.uses <= 0) {
          // Effect is already expired, mark for removal
          effectsToRemove.push(index);
          shouldApplyEffect = false;
        } else {
          // Effect has uses remaining, consume one use
          effect.uses -= 1;
          console.log(`${effect.name} used: ${effect.uses} uses remaining`);

          // If this was the last use, mark for removal
          if (effect.uses === 0) {
            effectsToRemove.push(index);
            console.log(
              `${effect.name} has been exhausted and will be removed`
            );
          }
        }
      }

      if (!shouldApplyEffect) {
        return; // Skip processing this effect
      }

      // Get the appropriate value (npValue for Noble Phantasms, value otherwise)
      const effectValue = this.getEffectValue(effect);

      switch (effect.type) {
        case "AttackUp":
          if (effect.flatOrMultiplier === "flat") {
            modifiers.flatAttack += effectValue;
          } else {
            modifiers.multiplierAttack += effectValue;
          }
          console.log(
            `Applied AttackUp: ${effectValue} (${
              effect.flatOrMultiplier
            }) - Used ${
              this.typeOfAttackCausingIt === "Noble Phantasm" &&
              effect.npValue !== undefined
                ? "npValue"
                : "value"
            }`
          );
          break;
        case "AttackDown":
          if (effect.flatOrMultiplier === "flat") {
            modifiers.flatAttack -= effectValue;
          } else {
            modifiers.multiplierAttack -= effectValue;
          }
          break;
        case "CritUp":
          modifiers.critChance += effectValue;
          break;
        case "CritDown":
          modifiers.critChance -= effectValue;
          break;
        case "CritDmgUp":
          modifiers.critDamage += effectValue;
          break;
        case "CritDmgDown":
          modifiers.critDamage -= effectValue;
          break;
        case "MagicResistanceNullification":
          // NEW: Handle Magic Resistance Nullification effects
          if (effect.flatOrMultiplier === "flat") {
            modifiers.magicResistanceNullification.flatReduction += effectValue;
          } else {
            modifiers.magicResistanceNullification.multiplierReduction +=
              effectValue;
          }

          modifiers.magicResistanceNullification.appliedEffects.push({
            name: effect.name,
            value: effectValue,
            flatOrMultiplier: effect.flatOrMultiplier,
            source: effect.source || "Unknown",
          });

          console.log(
            `Applied Magic Resistance Nullification: ${effectValue} (${effect.flatOrMultiplier})`
          );
          break;
      }
    });

    // Remove exhausted effects (in reverse order to maintain indices)
    effectsToRemove.reverse().forEach((index) => {
      const removedEffect = this.attacker.effects.splice(index, 1)[0];
      console.log(
        `Removed exhausted effect: ${removedEffect.name} from ${this.attacker.name}`
      );
    });

    this.combatResults.modifiers.attacker = modifiers;
  }

  collectDefenderModifiers() {
    const modifiers = {
      flatDefense: 0,
      multiplierDefense: 0,
      critResistance: 0,
      critDamageResistance: 0,
      magicResistance: {
        isCompletelyNegated: false,
        reductionFlat: 0,
        reductionMultiplier: 0,
        appliedEffects: [],
        attackRank: this.getAttackRankForResistance("magic"),
        defenseRank: this.getDefenseRankForResistance("magic"),
        comparisonMethod:
          this.typeOfAttackCausingIt === "Noble Phantasm"
            ? "noble_phantasm"
            : "parameter",
      },
      strengthResistance: {
        isCompletelyNegated: false,
        reductionFlat: 0,
        reductionMultiplier: 0,
        appliedEffects: [],
        attackRank: this.getAttackRankForResistance("strength"),
        defenseRank: this.getDefenseRankForResistance("strength"),
        comparisonMethod:
          this.typeOfAttackCausingIt === "Noble Phantasm"
            ? "noble_phantasm"
            : "parameter",
      },
    };

    // Track effects to remove (those that reach 0 uses)
    const effectsToRemove = [];

    this.defender.effects?.forEach((effect, index) => {
      // Check if effect has limited uses and process accordingly
      let shouldApplyEffect = true;
      if (effect.uses !== undefined && effect.uses !== null) {
        if (effect.uses <= 0) {
          // Effect is already expired, mark for removal
          effectsToRemove.push(index);
          shouldApplyEffect = false;
        } else {
          // Effect has uses remaining, consume one use
          effect.uses -= 1;
          console.log(`${effect.name} used: ${effect.uses} uses remaining`);

          // If this was the last use, mark for removal
          if (effect.uses === 0) {
            effectsToRemove.push(index);
            console.log(
              `${effect.name} has been exhausted and will be removed`
            );
          }
        }
      }

      if (!shouldApplyEffect) {
        return; // Skip processing this effect
      }

      // Get the appropriate value (npValue for Noble Phantasms, value otherwise)
      const effectValue = this.getEffectValue(effect);

      switch (effect.type) {
        case "DefenseUp":
          if (effect.flatOrMultiplier === "flat") {
            modifiers.flatDefense += effectValue;
          } else {
            modifiers.multiplierDefense += effectValue;
          }
          break;
        case "DefenseDown":
          if (effect.flatOrMultiplier === "flat") {
            modifiers.flatDefense -= effectValue;
          } else {
            modifiers.multiplierDefense -= effectValue;
          }
          break;
        case "CritResUp":
          modifiers.critResistance += effectValue;
          break;
        case "CritResDown":
          modifiers.critResistance -= effectValue;
          break;
        case "CritDmgResUp":
          modifiers.critDamageResistance += effectValue;
          break;
        case "CritDmgResDown":
          modifiers.critDamageResistance -= effectValue;
          break;
        case "MagRes":
          this.processResistance(
            effect,
            effectValue,
            modifiers.magicResistance,
            "magic"
          );
          break;
        case "StrRes":
          this.processResistance(
            effect,
            effectValue,
            modifiers.strengthResistance,
            "strength"
          );
          break;
      }
    });

    // Remove exhausted effects (in reverse order to maintain indices)
    effectsToRemove.reverse().forEach((index) => {
      const removedEffect = this.defender.effects.splice(index, 1)[0];
      console.log(
        `Removed exhausted effect: ${removedEffect.name} from ${this.defender.name}`
      );
    });

    this.combatResults.modifiers.defender = modifiers;
  }

  /**
   * Process resistance effects (both MagRes and StrRes) with sophisticated rank comparison
   */
  processResistance(effect, effectValue, resistanceData, resistanceType) {
    // Check if this resistance type is relevant to the current attack
    const relevantProportion =
      resistanceType === "magic"
        ? this.proportionOfMagicUsed
        : this.proportionOfStrengthUsed;
    if (relevantProportion === 0) {
      console.log(
        `No ${resistanceType} damage in attack, skipping ${effect.type} effect`
      );
      return;
    }

    let attackRank, defenseRank;

    // Determine ranks based on attack type and comparison method
    if (this.typeOfAttackCausingIt === "Noble Phantasm") {
      // For NP attacks: combat rank vs resistance sourceLetterRank
      attackRank = this.rankLetter;
      defenseRank = effect.sourceLetterRank;
      console.log(
        `NP ${resistanceType} resistance: NP rank ${attackRank} vs Resistance rank ${defenseRank}`
      );
    } else {
      // For non-NP attacks: attacker parameter vs defender parameter (both already in rank format)
      if (resistanceType === "magic") {
        attackRank = this.attacker.parameters?.mag;
        defenseRank = this.defender.parameters?.mag;
      } else {
        attackRank = this.attacker.parameters?.str;
        defenseRank = this.defender.parameters?.str;
      }
      console.log(
        `Parameter-based ${resistanceType} resistance: Attacker ${resistanceType} ${attackRank} vs Defender ${resistanceType} ${defenseRank}`
      );
    }

    // Store the ranks used for this comparison
    resistanceData.attackRank = attackRank;
    resistanceData.defenseRank = defenseRank;

    // Perform rank comparison if both ranks are available
    if (
      attackRank &&
      defenseRank &&
      RankUtils.isValidRank(attackRank) &&
      RankUtils.isValidRank(defenseRank)
    ) {
      const comparison = RankUtils.compareRanks(defenseRank, attackRank);

      if (comparison >= 0) {
        // Defense rank is equal or higher - complete negation
        resistanceData.isCompletelyNegated = true;
        resistanceData.appliedEffects.push({
          name: effect.name,
          type: "complete_negation",
          attackRank: attackRank,
          defenseRank: defenseRank,
          comparisonMethod: resistanceData.comparisonMethod,
        });
        console.log(
          `${
            resistanceType.charAt(0).toUpperCase() + resistanceType.slice(1)
          } damage completely negated! ${RankUtils.getComparisonDescription(
            defenseRank,
            attackRank
          )}`
        );
      } else {
        // Defense rank is lower - apply reduction
        if (effect.flatOrMultiplier === "flat") {
          resistanceData.reductionFlat += effectValue;
        } else {
          resistanceData.reductionMultiplier += effectValue;
        }

        resistanceData.appliedEffects.push({
          name: effect.name,
          type: "partial_reduction",
          value: effectValue,
          flatOrMultiplier: effect.flatOrMultiplier,
          attackRank: attackRank,
          defenseRank: defenseRank,
          comparisonMethod: resistanceData.comparisonMethod,
        });

        console.log(
          `${
            resistanceType.charAt(0).toUpperCase() + resistanceType.slice(1)
          } damage reduced: ${effectValue} (${
            effect.flatOrMultiplier
          }) - ${RankUtils.getComparisonDescription(attackRank, defenseRank)}`
        );
      }
    } else {
      // Fallback: apply reduction without rank comparison
      if (effect.flatOrMultiplier === "flat") {
        resistanceData.reductionFlat += effectValue;
      } else {
        resistanceData.reductionMultiplier += effectValue;
      }

      resistanceData.appliedEffects.push({
        name: effect.name,
        type: "fallback_reduction",
        value: effectValue,
        flatOrMultiplier: effect.flatOrMultiplier,
        reason: "insufficient_rank_data",
      });

      console.log(
        `${
          resistanceType.charAt(0).toUpperCase() + resistanceType.slice(1)
        } damage reduced (fallback): ${effectValue} (${
          effect.flatOrMultiplier
        }) - Insufficient rank data`
      );
    }
  }

  rollCritical() {
    const { attacker, defender } = this.combatResults.modifiers;
    const critChanceModifier = attacker.critChance - defender.critResistance;
    const roll = Math.floor(Math.random() * 100) + 1;

    this.combatResults.criticals = {
      chance: this.combatResults.criticals.chance + critChanceModifier,
      rolled: roll <= this.combatResults.criticals.chance + critChanceModifier,
      modifier:
        roll <= this.combatResults.criticals.chance + critChanceModifier
          ? 1
          : 0,
      damage: attacker.critDamage - defender.critDamageResistance,
      damageModifierMagic:
        (attacker.critDamage - defender.critDamageResistance) *
        this.combatResults.attackComposition.magicalPortion,
      damageModifierPhysical:
        (attacker.critDamage - defender.critDamageResistance) *
        this.combatResults.attackComposition.physicalPortion,
    };
  }

  calculateFinalDamage() {
    const { attacker, defender } = this.combatResults.modifiers;
    const { criticals, initialForces } = this.combatResults;

    const calculateDamageComponent = (initialForce, critDamageMod) => {
      return (
        ((initialForce + criticals.modifier * critDamageMod) *
          this.integratedAttackMultiplier +
          this.integratedAttackFlatBonus) *
          (1 +
            (attacker.multiplierAttack - defender.multiplierDefense) * 0.01) +
        (attacker.flatAttack - defender.flatDefense)
      );
    };

    // Calculate base damage for both types
    let magicalDamage = calculateDamageComponent(
      initialForces.magic,
      criticals.damageModifierMagic
    );
    let physicalDamage = calculateDamageComponent(
      initialForces.strength,
      criticals.damageModifierPhysical
    );

    // Store original damage values for nullification calculations
    const originalMagicalDamage = magicalDamage;

    // Apply magical resistance with nullification support
    const magicRes = defender.magicResistance;
    const magicResNullification = attacker.magicResistanceNullification;

    if (magicRes.isCompletelyNegated && this.proportionOfMagicUsed > 0) {
      // Even complete negation can be affected by nullification
      if (
        magicResNullification &&
        (magicResNullification.flatReduction > 0 ||
          magicResNullification.multiplierReduction > 0)
      ) {
        // Calculate what the damage reduction would have been
        const wouldBeReductionFlat = magicRes.reductionFlat;
        const wouldBeReductionMultiplier = magicRes.reductionMultiplier;

        // Apply nullification to the "would be" reduction to see if we can partially bypass complete negation
        const effectiveReductionMultiplier = Math.max(
          0,
          wouldBeReductionMultiplier - magicResNullification.multiplierReduction
        );
        const effectiveReductionFlat = Math.max(
          0,
          wouldBeReductionFlat - magicResNullification.flatReduction
        );

        // If nullification is strong enough to overcome complete negation, apply partial damage
        if (
          effectiveReductionMultiplier < 100 ||
          effectiveReductionFlat < originalMagicalDamage
        ) {
          const afterMultiplierReduction =
            originalMagicalDamage * (1 - effectiveReductionMultiplier * 0.01);
          magicalDamage = Math.max(
            0,
            afterMultiplierReduction - effectiveReductionFlat
          );

          console.log(
            `Magic Resistance Nullification partially overcame complete negation:`,
            {
              originalDamage: originalMagicalDamage,
              finalDamage: magicalDamage,
              nullificationEffects: magicResNullification.appliedEffects,
            }
          );
        } else {
          console.log(
            `Magic damage completely negated despite nullification attempts:`,
            magicRes.appliedEffects
          );
          magicalDamage = 0;
        }
      } else {
        console.log(
          `Magic damage completely negated by resistance effects:`,
          magicRes.appliedEffects
        );
        magicalDamage = 0;
      }
    } else if (
      (magicRes.reductionFlat > 0 || magicRes.reductionMultiplier > 0) &&
      this.proportionOfMagicUsed > 0
    ) {
      // Standard magic resistance application with nullification
      let finalReductionMultiplier = magicRes.reductionMultiplier;
      let finalReductionFlat = magicRes.reductionFlat;

      // Apply Magic Resistance Nullification
      if (
        magicResNullification &&
        (magicResNullification.flatReduction > 0 ||
          magicResNullification.multiplierReduction > 0)
      ) {
        // Calculate the original damage that would be reduced
        const originalDamageReduction =
          originalMagicalDamage * magicRes.reductionMultiplier * 0.01 +
          magicRes.reductionFlat;

        // Apply nullification to the damage reduction amount
        let nullificationMultiplierEffect =
          1 - magicResNullification.multiplierReduction * 0.01;
        let nullifiedReduction =
          originalDamageReduction * nullificationMultiplierEffect -
          magicResNullification.flatReduction;
        nullifiedReduction = Math.max(0, nullifiedReduction); // Can't have negative reduction

        // Calculate final damage using the nullified reduction amount
        magicalDamage = originalMagicalDamage - nullifiedReduction;

        console.log(`Magic Resistance Nullification applied:`, {
          originalDamage: originalMagicalDamage,
          originalReduction: originalDamageReduction,
          nullifiedReduction: nullifiedReduction,
          finalDamage: magicalDamage,
          nullificationDetails: {
            multiplierReduction: magicResNullification.multiplierReduction,
            flatReduction: magicResNullification.flatReduction,
            appliedEffects: magicResNullification.appliedEffects,
          },
        });
      } else {
        // Standard resistance application without nullification
        const afterMultiplierReduction =
          originalMagicalDamage * (1 - finalReductionMultiplier * 0.01);
        magicalDamage = Math.max(
          0,
          afterMultiplierReduction - finalReductionFlat
        );

        console.log(
          `Magic damage reduced from ${originalMagicalDamage} to ${magicalDamage}:`,
          magicRes.appliedEffects
        );
      }
    }

    // Apply physical resistance (no nullification system for physical resistance yet)
    const strRes = defender.strengthResistance;
    if (strRes.isCompletelyNegated) {
      console.log(
        `Physical damage completely negated by resistance effects:`,
        strRes.appliedEffects
      );
      physicalDamage = 0;
    } else if (strRes.reductionFlat > 0 || strRes.reductionMultiplier > 0) {
      const afterMultiplierReduction =
        physicalDamage * (1 - strRes.reductionMultiplier * 0.01);
      const finalPhysicalDamage = Math.max(
        0,
        afterMultiplierReduction - strRes.reductionFlat
      );
      console.log(
        `Physical damage reduced from ${physicalDamage} to ${finalPhysicalDamage}:`,
        strRes.appliedEffects
      );
      physicalDamage = finalPhysicalDamage;
    }

    this.combatResults.finalDamage = {
      magical: magicalDamage,
      physical: physicalDamage,
      total: magicalDamage + physicalDamage,
    };
  }

  getSanitizedResults() {
    return {
      initialForces: this.combatResults.initialForces,
      attackComposition: this.combatResults.attackComposition,
      criticals: this.combatResults.criticals,
      modifiers: this.combatResults.modifiers,
      finalDamage: this.combatResults.finalDamage,
      attackerInfo: {
        id: this.attacker.id,
        name: this.attacker.name,
        strength: this.attacker.strength,
        magic: this.attacker.magic,
        parameters: this.attacker.parameters,
      },
      defenderInfo: {
        id: this.defender.id,
        name: this.defender.name,
        parameters: this.defender.parameters,
      },
      typeOfAttackCausingIt: this.typeOfAttackCausingIt,
      proportionOfMagicUsed: this.proportionOfMagicUsed,
      proportionOfStrengthUsed: this.proportionOfStrengthUsed,
      integratedAttackMultiplier: this.integratedAttackMultiplier,
      integratedAttackFlatBonus: this.integratedAttackFlatBonus,
      rankLetter: this.rankLetter,
    };
  }

  storeCombatResults() {
    this.attacker.combatSent = { ...this.combatResults };
    this.defender.combatReceived = { ...this.combatResults };
    return this.combatResults;
  }
}
