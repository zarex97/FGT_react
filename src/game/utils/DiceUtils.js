// src/game/utils/DiceUtils.js
// Utility functions for dice rolling and formula parsing

export class DiceUtils {
  /**
   * Roll a single die with specified number of sides
   * @param {number} sides - Number of sides on the die
   * @returns {number} Random result from 1 to sides
   */
  static rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Roll multiple dice of the same type
   * @param {number} count - Number of dice to roll
   * @param {number} sides - Number of sides on each die
   * @returns {number} Sum of all dice rolled
   */
  static rollDice(count, sides) {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.rollDie(sides);
    }
    return total;
  }

  /**
   * Parse and roll a dice formula string
   * Supports formats like: "2d10+20", "1d60+40", "3d10-5", "1d6"
   * @param {string} formula - Dice formula to parse and roll
   * @returns {object} Result object with total and breakdown
   */
  static rollFormula(formula) {
    if (!formula || typeof formula !== "string") {
      console.error(`Invalid dice formula: ${formula}`);
      return { total: 0, breakdown: "Invalid formula", error: true };
    }

    // Remove spaces and convert to lowercase
    const cleanFormula = formula.replace(/\s+/g, "").toLowerCase();

    // Parse the formula: XdY+Z or XdY-Z or XdY
    const match = cleanFormula.match(/^(\d+)d(\d+)([\+\-]\d+)?$/);

    if (!match) {
      console.error(`Could not parse dice formula: ${formula}`);
      return {
        total: 0,
        breakdown: `Could not parse: ${formula}`,
        error: true,
      };
    }

    const [, diceCount, dieSides, modifierPart] = match;

    const count = parseInt(diceCount, 10);
    const sides = parseInt(dieSides, 10);
    const modifier = modifierPart ? parseInt(modifierPart, 10) : 0;

    // Validate parsed values
    if (count <= 0 || sides <= 0) {
      console.error(`Invalid dice parameters: ${count}d${sides}`);
      return {
        total: 0,
        breakdown: `Invalid parameters: ${count}d${sides}`,
        error: true,
      };
    }

    // Roll the dice
    const diceResults = [];
    let diceTotal = 0;

    for (let i = 0; i < count; i++) {
      const roll = this.rollDie(sides);
      diceResults.push(roll);
      diceTotal += roll;
    }

    const finalTotal = diceTotal + modifier;

    // Create detailed breakdown for logging
    let breakdown = `${count}d${sides}`;
    if (diceResults.length <= 10) {
      // Only show individual rolls for reasonable numbers
      breakdown += ` [${diceResults.join(", ")}] = ${diceTotal}`;
    } else {
      breakdown += ` = ${diceTotal}`;
    }

    if (modifier !== 0) {
      breakdown += ` ${modifier >= 0 ? "+" : ""}${modifier} = ${finalTotal}`;
    }

    return {
      total: finalTotal,
      breakdown: breakdown,
      diceTotal: diceTotal,
      modifier: modifier,
      diceResults: diceResults,
      formula: formula,
      error: false,
    };
  }

  /**
   * Create a dice formula string from components
   * @param {number} diceCount - Number of dice
   * @param {number} dieSides - Sides per die
   * @param {number} modifier - Flat modifier (positive or negative)
   * @returns {string} Formatted dice formula
   */
  static createFormula(diceCount, dieSides, modifier = 0) {
    let formula = `${diceCount}d${dieSides}`;
    if (modifier > 0) {
      formula += `+${modifier}`;
    } else if (modifier < 0) {
      formula += `${modifier}`; // minus sign already included
    }
    return formula;
  }

  /**
   * Test the dice utilities with various formulas
   */
  static testDiceUtils() {
    console.log("=== Dice Utilities Test ===");

    const testFormulas = [
      "1d6",
      "2d10+20",
      "1d60+40",
      "3d10-5",
      "1d20+0",
      "4d6+10",
    ];

    testFormulas.forEach((formula) => {
      const result = this.rollFormula(formula);
      console.log(`${formula}: ${result.breakdown} (Total: ${result.total})`);
    });
  }
}

// Export for convenience
export const { rollDie, rollDice, rollFormula, createFormula } = DiceUtils;
