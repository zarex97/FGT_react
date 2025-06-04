// src/game/passives/PassiveCreators.js
// Factory functions for creating common passive abilities
import { RankUtils } from "../utils/RankUtils.js";

/**
 * Magic Resistance Passive Creator
 * Creates both damage resistance and debuff resistance effects
 * @param {string} rank - The rank of Magic Resistance (e.g., "A", "B+", "C--", "EX")
 * @returns {object} Object containing effects and triggerEffects arrays
 */
export function createMagicResistance(rank) {
  // Validate rank input using RankUtils
  if (!RankUtils.isValidRank(rank)) {
    console.error(
      `Invalid Magic Resistance rank: ${rank}. Using E as fallback.`
    );
    rank = "E";
  }

  // Get the base rank letter for data lookup (ignoring modifiers for the resistance values)
  const baseRank = RankUtils.getBaseRank(rank);

  // Define rank-based values for Magic Resistance (based on base rank)
  const magicResistanceData = {
    EX: {
      damageReduction: 100, // Complete negation always
      debuffResistance: 30,
      description: `Legendary magical immunity (${rank}) - completely negates all magical damage`,
    },
    A: {
      damageReduction: 50,
      debuffResistance: 25,
      description: `High-rank magical resistance (${rank}) - negates ${rank} and below magic, reduces higher ranks by 50%`,
    },
    B: {
      damageReduction: 40,
      debuffResistance: 20,
      description: `Moderate magical resistance (${rank}) - negates ${rank} and below magic, reduces higher ranks by 40%`,
    },
    C: {
      damageReduction: 30,
      debuffResistance: 15,
      description: `Basic magical resistance (${rank}) - negates ${rank} and below magic, reduces higher ranks by 30%`,
    },
    D: {
      damageReduction: 20,
      debuffResistance: 10,
      description: `Weak magical resistance (${rank}) - negates ${rank} and below magic, reduces higher ranks by 20%`,
    },
    E: {
      damageReduction: 10,
      debuffResistance: 5,
      description: `Minimal magical resistance (${rank}) - negates ${rank} magic, reduces higher ranks by 10%`,
    },
  };

  const data = magicResistanceData[baseRank];

  const effects = [];
  const triggerEffects = [];

  // Passive 1: Magical Damage Resistance
  const magicalDamageResistance = {
    name: `Magic Resistance (${rank})`,
    type: "MagRes",
    duration: null, // Permanent passive
    appliedAt: null, // Not applied by a temporary source
    value: data.damageReduction,
    npValue: Math.max(10, data.damageReduction - 20), // NPs are harder to resist
    flatOrMultiplier: "multiplier",
    sourceLetterRank: rank, // Use the FULL rank including modifiers for comparison
    description: data.description,
    source: "Magic Resistance Passive",
    isPermanent: true,
    isPassive: true,
    type: "Magic Resistance",
    rank: rank, // Store full rank for reference
  };

  effects.push(magicalDamageResistance);

  // Passive 2: Debuff Resistance (based on base rank)
  const debuffResistance = {
    name: `Debuff Resistance (${rank})`,
    type: "DebuffRes",
    duration: null, // Permanent passive
    appliedAt: null,
    value: data.debuffResistance,
    flatOrMultiplier: "multiplier",
    description: `Reduces chance of being inflicted by debuffs by ${data.debuffResistance}%`,
    source: "Magic Resistance Passive",
    isPermanent: true,
    isPassive: true,
    type: "Magic Resistance",
    rank: rank,
    // Additional properties for debuff resistance
    affectsInstakill: true,
    affectsDeath: true,
    exemptions: ["Erase"], // Erase is completely unaffected
    onlyAffectsMagicalDebuffs: true, // Only affects debuffs from magical sources
  };

  effects.push(debuffResistance);

  console.log(`Created Magic Resistance (${rank}):`, {
    baseRank: baseRank,
    fullRank: rank,
    damageReduction: data.damageReduction,
    debuffResistance: data.debuffResistance,
    effectsCount: effects.length,
  });

  return {
    effects,
    triggerEffects, // Empty for now, but ready for future trigger-based implementations
    passiveName: "Magic Resistance",
    rank: rank,
  };
}

/**
 * Physical Resistance Passive Creator
 * Creates physical damage resistance effects (the STR equivalent of Magic Resistance)
 * @param {string} rank - The rank of Physical Resistance (e.g., "A", "B+", "C--", "EX")
 * @returns {object} Object containing effects and triggerEffects arrays
 */
export function createPhysicalResistance(rank) {
  // Validate rank input using RankUtils
  if (!RankUtils.isValidRank(rank)) {
    console.error(
      `Invalid Physical Resistance rank: ${rank}. Using E as fallback.`
    );
    rank = "E";
  }

  // Get the base rank letter for data lookup
  const baseRank = RankUtils.getBaseRank(rank);

  const physicalResistanceData = {
    EX: {
      damageReduction: 100,
      description: `Legendary physical immunity (${rank}) - completely negates all physical damage`,
    },
    A: {
      damageReduction: 50,
      description: `High-rank physical resistance (${rank}) - negates ${rank} and below physical attacks, reduces higher ranks by 50%`,
    },
    B: {
      damageReduction: 40,
      description: `Moderate physical resistance (${rank}) - negates ${rank} and below physical attacks, reduces higher ranks by 40%`,
    },
    C: {
      damageReduction: 30,
      description: `Basic physical resistance (${rank}) - negates ${rank} and below physical attacks, reduces higher ranks by 30%`,
    },
    D: {
      damageReduction: 20,
      description: `Weak physical resistance (${rank}) - negates ${rank} and below physical attacks, reduces higher ranks by 20%`,
    },
    E: {
      damageReduction: 10,
      description: `Minimal physical resistance (${rank}) - negates ${rank} physical attacks, reduces higher ranks by 10%`,
    },
  };

  const data = physicalResistanceData[baseRank];

  const effects = [];
  const triggerEffects = [];

  const physicalDamageResistance = {
    name: `Physical Resistance (${rank})`,
    type: "StrRes",
    duration: null,
    appliedAt: null,
    value: data.damageReduction,
    npValue: Math.max(10, data.damageReduction - 20),
    flatOrMultiplier: "multiplier",
    sourceLetterRank: rank, // Use the FULL rank including modifiers for comparison
    description: data.description,
    source: "Physical Resistance Passive",
    isPermanent: true,
    isPassive: true,
    type: "Physical Resistance",
    rank: rank,
  };

  effects.push(physicalDamageResistance);

  return {
    effects,
    triggerEffects,
    passiveName: "Physical Resistance",
    rank: rank,
  };
}

/**
 * Battle Continuation Passive Creator
 * Provides survival abilities and death resistance
 * @param {string} rank - The rank of Battle Continuation (e.g., "A", "B+", "C--", "EX")
 * @returns {object} Object containing effects and triggerEffects arrays
 */
export function createBattleContinuation(rank) {
  // Validate rank input using RankUtils
  if (!RankUtils.isValidRank(rank)) {
    console.error(
      `Invalid Battle Continuation rank: ${rank}. Using E as fallback.`
    );
    rank = "E";
  }

  // Get the base rank letter for data lookup
  const baseRank = RankUtils.getBaseRank(rank);

  const battleContinuationData = {
    EX: {
      deathResistance: 95,
      survivalThreshold: 1,
      description: `Legendary determination (${rank}) - almost impossible to kill, fights at full strength even near death`,
    },
    A: {
      deathResistance: 80,
      survivalThreshold: 5,
      description: `Incredible will to live (${rank}) - high resistance to death effects and enhanced survival`,
    },
    B: {
      deathResistance: 65,
      survivalThreshold: 10,
      description: `Strong survival instinct (${rank}) - good resistance to death effects`,
    },
    C: {
      deathResistance: 50,
      survivalThreshold: 15,
      description: `Moderate battle endurance (${rank}) - some resistance to death effects`,
    },
    D: {
      deathResistance: 35,
      survivalThreshold: 20,
      description: `Basic survival training (${rank}) - limited resistance to death effects`,
    },
    E: {
      deathResistance: 20,
      survivalThreshold: 25,
      description: `Minimal survival instinct (${rank}) - slight resistance to death effects`,
    },
  };

  const data = battleContinuationData[baseRank];

  const effects = [];
  const triggerEffects = [];

  // Death Resistance Effect
  const deathResistance = {
    name: `Battle Continuation (${rank})`,
    type: "DeathRes",
    duration: null,
    appliedAt: null,
    value: data.deathResistance,
    flatOrMultiplier: "multiplier",
    description: data.description,
    source: "Battle Continuation Passive",
    isPermanent: true,
    isPassive: true,
    type: "Battle Continuation",
    rank: rank,
    survivalThreshold: data.survivalThreshold, // When near death, special effects might trigger
  };

  effects.push(deathResistance);

  return {
    effects,
    triggerEffects,
    passiveName: "Battle Continuation",
    rank: rank,
  };
}

/**
 * Divinity Passive Creator
 * Provides various divine bonuses and resistances
 * @param {string} rank - The rank of Divinity (e.g., "A", "B+", "C--", "EX")
 * @returns {object} Object containing effects and triggerEffects arrays
 */
export function createDivinity(rank) {
  // Validate rank input using RankUtils
  if (!RankUtils.isValidRank(rank)) {
    console.error(`Invalid Divinity rank: ${rank}. Using E as fallback.`);
    rank = "E";
  }

  // Get the base rank letter for data lookup
  const baseRank = RankUtils.getBaseRank(rank);

  const divinityData = {
    EX: {
      attackBonus: 30,
      defenseBonus: 30,
      statusResistance: 50,
      description: `True divine nature (${rank}) - substantial bonuses to all abilities and high status resistance`,
    },
    A: {
      attackBonus: 25,
      defenseBonus: 25,
      statusResistance: 40,
      description: `High divinity (${rank}) - major bonuses to combat abilities and good status resistance`,
    },
    B: {
      attackBonus: 20,
      defenseBonus: 20,
      statusResistance: 30,
      description: `Moderate divinity (${rank}) - notable bonuses to combat abilities and status resistance`,
    },
    C: {
      attackBonus: 15,
      defenseBonus: 15,
      statusResistance: 20,
      description: `Minor divinity (${rank}) - small bonuses to combat abilities and status resistance`,
    },
    D: {
      attackBonus: 10,
      defenseBonus: 10,
      statusResistance: 15,
      description: `Trace divinity (${rank}) - minimal bonuses to combat abilities`,
    },
    E: {
      attackBonus: 5,
      defenseBonus: 5,
      statusResistance: 10,
      description: `Faint divine spark (${rank}) - tiny bonuses to combat abilities`,
    },
  };

  const data = divinityData[baseRank];

  const effects = [];
  const triggerEffects = [];

  // Divine Attack Bonus
  const divineAttackBonus = {
    name: `Divine Power (${rank})`,
    type: "AttackUp",
    duration: null,
    appliedAt: null,
    value: data.attackBonus,
    npValue: data.attackBonus + 10, // Enhanced effect for Noble Phantasms
    flatOrMultiplier: "multiplier",
    description: `Divine nature increases attack power by ${data.attackBonus}%`,
    source: "Divinity Passive",
    isPermanent: true,
    isPassive: true,
    type: "Divinity",
    rank: rank,
  };

  // Divine Defense Bonus
  const divineDefenseBonus = {
    name: `Divine Protection (${rank})`,
    type: "DefenseUp",
    duration: null,
    appliedAt: null,
    value: data.defenseBonus,
    npValue: data.defenseBonus + 10,
    flatOrMultiplier: "multiplier",
    description: `Divine nature increases defense by ${data.defenseBonus}%`,
    source: "Divinity Passive",
    isPermanent: true,
    isPassive: true,
    type: "Divinity",
    rank: rank,
  };

  // Divine Status Resistance
  const divineStatusResistance = {
    name: `Divine Immunity (${rank})`,
    type: "StatusRes",
    duration: null,
    appliedAt: null,
    value: data.statusResistance,
    flatOrMultiplier: "multiplier",
    description: `Divine nature provides ${data.statusResistance}% resistance to status effects`,
    source: "Divinity Passive",
    isPermanent: true,
    isPassive: true,
    type: "Divinity",
    rank: rank,
  };

  effects.push(divineAttackBonus, divineDefenseBonus, divineStatusResistance);

  return {
    effects,
    triggerEffects,
    passiveName: "Divinity",
    rank: rank,
  };
}

/**
 * Utility function to combine multiple passive creators
 * @param {...object} passiveResults - Results from passive creator functions
 * @returns {object} Combined effects and triggerEffects
 */
export function combinePassives(...passiveResults) {
  const combinedEffects = [];
  const combinedTriggerEffects = [];
  const passiveInfo = [];

  passiveResults.forEach((result) => {
    if (result && result.effects) {
      combinedEffects.push(...result.effects);
    }
    if (result && result.triggerEffects) {
      combinedTriggerEffects.push(...result.triggerEffects);
    }
    if (result && result.passiveName && result.rank) {
      passiveInfo.push(`${result.passiveName} (${result.rank})`);
    }
  });

  console.log(`Combined passives: ${passiveInfo.join(", ")}`);
  console.log(
    `Total effects: ${combinedEffects.length}, Total trigger effects: ${combinedTriggerEffects.length}`
  );

  return {
    effects: combinedEffects,
    triggerEffects: combinedTriggerEffects,
    passiveInfo: passiveInfo,
  };
}

/**
 * Helper function to validate and create a single passive by name and rank
 * @param {string} passiveName - Name of the passive to create
 * @param {string} rank - Rank of the passive
 * @returns {object} Passive creation result
 */
export function createPassiveByName(passiveName, rank) {
  const passiveCreators = {
    "Magic Resistance": createMagicResistance,
    "Physical Resistance": createPhysicalResistance,
    "Battle Continuation": createBattleContinuation,
    Divinity: createDivinity,
  };

  const creator = passiveCreators[passiveName];
  if (!creator) {
    console.error(`Unknown passive: ${passiveName}`);
    return { effects: [], triggerEffects: [] };
  }

  return creator(rank);
}

// Example usage and testing
export function demonstratePassiveCreation() {
  console.log("=== Passive Creation Demonstration ===");

  // Create individual passives
  const magicResA = createMagicResistance("A");
  const battleContB = createBattleContinuation("B");
  const divinityC = createDivinity("C");

  // Combine multiple passives
  const combinedPassives = combinePassives(magicResA, battleContB, divinityC);

  console.log("Final combined result:", {
    totalEffects: combinedPassives.effects.length,
    totalTriggerEffects: combinedPassives.triggerEffects.length,
    passives: combinedPassives.passiveInfo,
  });

  return combinedPassives;
}
