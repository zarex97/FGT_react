// src/game/utils/DurationHelper.js - Helper functions for duration calculations

/**
 * Converts fractional round durations to actual turn numbers
 * @param {number} fraction - The fraction of a round (e.g., 1/3, 2/3, 1/2)
 * @param {number} turnsPerRound - Number of turns in a round
 */

// Helper function to convert fractional durations to turn numbers
export const convertFractionalDuration = (fraction, turnsPerRound) => {
  // Handle string fractions like "1/3", "2/3", "1/2"
  if (typeof fraction === "string" && fraction.includes("/")) {
    const [numerator, denominator] = fraction.split("/").map(Number);
    const fractionalValue = numerator / denominator;
    return Math.max(1, Math.floor(turnsPerRound * fractionalValue));
  }

  // Handle decimal fractions like 0.33, 0.5
  if (typeof fraction === "number" && fraction < 1) {
    return Math.max(1, Math.floor(turnsPerRound * fraction));
  }

  // Handle whole numbers (already in turns)
  if (typeof fraction === "number" && fraction >= 1) {
    return Math.floor(fraction);
  }

  // Fallback
  return 1;
};

// Example usage:
// convertFractionalDuration("1/3", 6) // Returns 2 turns
// convertFractionalDuration("2/3", 9) // Returns 6 turns
// convertFractionalDuration(0.5, 4)   // Returns 2 turns
// convertFractionalDuration(3, 6)     // Returns 3 turns
