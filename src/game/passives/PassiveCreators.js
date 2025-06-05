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
 * Territory Creation Passive Creator
 * Creates territorial bonuses for attack and defense when in own base
 * @param {string} rank - The rank of Territory Creation (e.g., "A", "B+", "C--", "EX")
 * @returns {object} Object containing effects and triggerEffects arrays
 */
export function createTerritoryCreation(rank) {
  // Validate rank input using RankUtils
  if (!RankUtils.isValidRank(rank)) {
    console.error(
      `Invalid Territory Creation rank: ${rank}. Using E as fallback.`
    );
    rank = "E";
  }

  // Get the base rank letter for data lookup
  const baseRank = RankUtils.getBaseRank(rank);

  // Parse rank to get modifier count for bonus/penalty calculations
  const parsedRank = RankUtils.parseRank(rank);
  const modifierCount = parsedRank.modifierCount;
  const attackModifier = modifierCount * 5; // +5 per plus, -5 per minus
  const defenseModifier = modifierCount * 2; // +2 per plus, -2 per minus

  // Define rank-based values for Territory Creation
  const territoryData = {
    EX: {
      attackBase: 40,
      attackDie: 60,
      defenseBase: 30,
      description: `Legendary territory mastery (${rank}) - supreme control over domain`,
    },
    A: {
      attackBase: 30,
      attackDie: 50,
      defenseBase: 20,
      description: `High territory control (${rank}) - excellent domain mastery`,
    },
    B: {
      attackBase: 15,
      attackDie: 25,
      defenseBase: 15,
      description: `Moderate territory control (${rank}) - good domain control`,
    },
    C: {
      attackBase: 12,
      attackDie: 20,
      defenseBase: 10,
      description: `Basic territory control (${rank}) - modest domain influence`,
    },
    D: {
      attackBase: 10,
      attackDie: 15,
      defenseBase: 5,
      description: `Weak territory control (${rank}) - limited domain power`,
    },
    E: {
      attackBase: 8,
      attackDie: 10,
      defenseBase: 0,
      description: `Minimal territory control (${rank}) - basic domain awareness`,
    },
  };

  const data = territoryData[baseRank];

  const effects = [];
  const triggerEffects = [];

  // Create informational passive effects that show Territory Creation capabilities
  const territoryAttackCapability = {
    name: `Territory Attack Mastery (${rank})`,
    type: "TerritoryAttack",
    duration: null,
    appliedAt: null,
    value: data.attackBase + attackModifier,
    npValue: null,
    flatOrMultiplier: "flat",
    description: `Grants ${data.attackBase + attackModifier} + 1d${
      data.attackDie
    } attack bonus when fighting in home territory`,
    source: "Territory Creation Passive",
    isPermanent: true,
    isPassive: true,
    sourceLetterRank: rank,
    attackDie: data.attackDie,
  };

  const territoryDefenseCapability = {
    name: `Territory Defense Mastery (${rank})`,
    type: "TerritoryDefense",
    duration: null,
    appliedAt: null,
    value: data.defenseBase + defenseModifier,
    npValue: null,
    flatOrMultiplier: "flat",
    description: `Provides 3d10+${
      data.defenseBase + defenseModifier
    } damage reduction to all allies within home territory`,
    source: "Territory Creation Passive",
    isPermanent: true,
    isPassive: true,
    rank: rank,
  };

  // Add the passive effects to the effects array (THIS WAS MISSING!)
  effects.push(territoryAttackCapability, territoryDefenseCapability);

  // Create the trigger reference that will be added to units with this passive
  const territoryTriggerReference = {
    id: "TerritoryCreationTriggerEffect",
    appliedAt: null,
    source: "Territory Creation Passive",
    rank: rank,
    attackBase: data.attackBase,
    attackDie: data.attackDie,
    defenseBase: data.defenseBase,
    attackModifier: attackModifier,
    defenseModifier: defenseModifier,
  };

  triggerEffects.push(territoryTriggerReference);

  console.log(`Created Territory Creation (${rank}):`, {
    baseRank: baseRank,
    fullRank: rank,
    modifierCount: modifierCount,
    attackBase: data.attackBase,
    attackDie: data.attackDie,
    defenseBase: data.defenseBase,
    attackModifier: attackModifier,
    defenseModifier: defenseModifier,
    effectsCount: effects.length,
    triggerEffectsCount: triggerEffects.length,
  });

  return {
    effects,
    triggerEffects,
    passiveName: "Territory Creation",
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
    Divinity: createDivinity,
    "Territory Creation": createTerritoryCreation,
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
  const divinityC = createDivinity("C");
  const territoryB = createTerritoryCreation("B+");

  // Combine multiple passives
  const combinedPassives = combinePassives(magicResA, divinityC, territoryB);

  console.log("Final combined result:", {
    totalEffects: combinedPassives.effects.length,
    totalTriggerEffects: combinedPassives.triggerEffects.length,
    passives: combinedPassives.passiveInfo,
  });

  return combinedPassives;
}
