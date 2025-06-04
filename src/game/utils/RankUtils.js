// RankUtils.js - Sophisticated rank comparison system for tactical RPG
export class RankUtils {
  // Define the base rank hierarchy from highest to lowest
  static BASE_RANK_VALUES = {
    EX: 6,
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    E: 1,
  };

  /**
   * Parse a rank string into its components
   * Examples: "A++", "B-", "EX", "C---"
   * @param {string} rankString - The rank to parse (e.g., "A++", "B-")
   * @returns {object} Parsed rank with base value and modifier count
   */
  static parseRank(rankString) {
    if (!rankString || typeof rankString !== "string") {
      return { baseRank: null, baseValue: 0, modifierCount: 0, isValid: false };
    }

    // Extract the base rank (letters) and modifiers (+ or -)
    const match = rankString.match(/^([A-Z]+)([\+\-]*)$/);

    if (!match) {
      console.warn(`Invalid rank format: ${rankString}`);
      return { baseRank: null, baseValue: 0, modifierCount: 0, isValid: false };
    }

    const [, baseRank, modifiers] = match;

    // Check if the base rank is valid
    if (!this.BASE_RANK_VALUES.hasOwnProperty(baseRank)) {
      console.warn(`Unknown base rank: ${baseRank}`);
      return { baseRank: null, baseValue: 0, modifierCount: 0, isValid: false };
    }

    const baseValue = this.BASE_RANK_VALUES[baseRank];

    // Count modifiers: + adds to the rank, - subtracts from it
    let modifierCount = 0;
    for (const char of modifiers) {
      if (char === "+") {
        modifierCount += 1;
      } else if (char === "-") {
        modifierCount -= 1;
      }
    }

    return {
      baseRank,
      baseValue,
      modifierCount,
      isValid: true,
      originalString: rankString,
    };
  }

  /**
   * Calculate the total numerical value of a rank including modifiers
   * Each modifier is worth 0.1 of a rank level, but can never bridge rank gaps
   * @param {string} rankString - The rank to evaluate
   * @returns {number} Numerical rank value
   */
  static calculateRankValue(rankString) {
    const parsed = this.parseRank(rankString);

    if (!parsed.isValid) {
      return 0;
    }

    // Base rank value (multiplied by 10 to make room for decimal modifiers)
    const baseValue = parsed.baseValue * 10;

    // Modifiers add/subtract small amounts within the rank
    // But they're capped so they can't reach the next rank level
    const modifierValue = Math.max(-4.9, Math.min(4.9, parsed.modifierCount));

    return baseValue + modifierValue;
  }

  /**
   * Compare two ranks and return the relationship
   * @param {string} rank1 - First rank to compare
   * @param {string} rank2 - Second rank to compare
   * @returns {number} 1 if rank1 > rank2, -1 if rank1 < rank2, 0 if equal
   */
  static compareRanks(rank1, rank2) {
    const value1 = this.calculateRankValue(rank1);
    const value2 = this.calculateRankValue(rank2);

    if (value1 > value2) return 1;
    if (value1 < value2) return -1;
    return 0;
  }

  /**
   * Check if rank1 is greater than or equal to rank2
   * @param {string} rank1 - First rank
   * @param {string} rank2 - Second rank
   * @returns {boolean} True if rank1 >= rank2
   */
  static isRankGreaterOrEqual(rank1, rank2) {
    return this.compareRanks(rank1, rank2) >= 0;
  }

  /**
   * Check if rank1 is strictly greater than rank2
   * @param {string} rank1 - First rank
   * @param {string} rank2 - Second rank
   * @returns {boolean} True if rank1 > rank2
   */
  static isRankGreater(rank1, rank2) {
    return this.compareRanks(rank1, rank2) > 0;
  }

  /**
   * Get a human-readable description of rank comparison
   * @param {string} rank1 - First rank
   * @param {string} rank2 - Second rank
   * @returns {string} Description of the comparison
   */
  static getComparisonDescription(rank1, rank2) {
    const comparison = this.compareRanks(rank1, rank2);

    if (comparison > 0) {
      return `${rank1} is higher than ${rank2}`;
    } else if (comparison < 0) {
      return `${rank1} is lower than ${rank2}`;
    } else {
      return `${rank1} is equal to ${rank2}`;
    }
  }

  /**
   * Validate if a rank string is properly formatted
   * @param {string} rankString - The rank to validate
   * @returns {boolean} True if the rank is valid
   */
  static isValidRank(rankString) {
    return this.parseRank(rankString).isValid;
  }

  /**
   * Get the base rank letter without modifiers
   * @param {string} rankString - The rank to process
   * @returns {string|null} The base rank letter or null if invalid
   */
  static getBaseRank(rankString) {
    const parsed = this.parseRank(rankString);
    return parsed.isValid ? parsed.baseRank : null;
  }

  /**
   * Convert a numerical parameter value to an approximate rank
   * This is used for converting mag/str parameters to ranks for comparison
   * @param {number} parameterValue - The numerical parameter value
   * @returns {string} Approximate rank representation
   */
  static parameterToRank(parameterValue) {
    if (parameterValue >= 200) return "EX";
    if (parameterValue >= 160) return "A";
    if (parameterValue >= 120) return "B";
    if (parameterValue >= 80) return "C";
    if (parameterValue >= 40) return "D";
    return "E";
  }

  /**
   * Enhanced parameter to rank conversion with modifiers
   * Provides more granular rank assignment based on parameter values
   * @param {number} parameterValue - The numerical parameter value
   * @returns {string} Detailed rank with modifiers
   */
  static parameterToDetailedRank(parameterValue) {
    // Define thresholds for each rank and its modifiers
    const rankThresholds = [
      { min: 220, rank: "EX++" },
      { min: 210, rank: "EX+" },
      { min: 200, rank: "EX" },
      { min: 190, rank: "EX-" },
      { min: 180, rank: "A++" },
      { min: 170, rank: "A+" },
      { min: 160, rank: "A" },
      { min: 150, rank: "A-" },
      { min: 140, rank: "B++" },
      { min: 130, rank: "B+" },
      { min: 120, rank: "B" },
      { min: 110, rank: "B-" },
      { min: 100, rank: "C++" },
      { min: 90, rank: "C+" },
      { min: 80, rank: "C" },
      { min: 70, rank: "C-" },
      { min: 60, rank: "D++" },
      { min: 50, rank: "D+" },
      { min: 40, rank: "D" },
      { min: 30, rank: "D-" },
      { min: 20, rank: "E++" },
      { min: 10, rank: "E+" },
      { min: 0, rank: "E" },
    ];

    for (const threshold of rankThresholds) {
      if (parameterValue >= threshold.min) {
        return threshold.rank;
      }
    }

    // For very low values, assign E- with additional minuses
    const negativeValue = Math.abs(parameterValue);
    const minusCount = Math.min(5, Math.floor(negativeValue / 10) + 1);
    return "E" + "-".repeat(minusCount);
  }
}

// Example usage and testing function
export function testRankUtils() {
  console.log("=== Testing Rank Utility System ===");

  // Test basic comparisons
  const testCases = [
    ["A++", "A+", "A++ should be greater than A+"],
    ["A-", "B++", "A- should be greater than B++ (letter rank dominance)"],
    ["EX", "A+++", "EX should be greater than A+++ (letter rank dominance)"],
    ["C", "C", "C should equal C"],
    ["B+", "B-", "B+ should be greater than B-"],
    ["D--", "E++", "D-- should be greater than E++"],
  ];

  testCases.forEach(([rank1, rank2, description]) => {
    const comparison = RankUtils.compareRanks(rank1, rank2);
    const result =
      comparison > 0 ? "greater" : comparison < 0 ? "lesser" : "equal";
    console.log(
      `${description}: ${RankUtils.getComparisonDescription(rank1, rank2)} ✓`
    );
  });

  // Test parameter conversion
  console.log("\n=== Parameter to Rank Conversion ===");
  const parameterTests = [50, 90, 130, 170, 210, 250];
  parameterTests.forEach((param) => {
    const simpleRank = RankUtils.parameterToRank(param);
    const detailedRank = RankUtils.parameterToDetailedRank(param);
    console.log(
      `Parameter ${param}: Simple=${simpleRank}, Detailed=${detailedRank}`
    );
  });
}
