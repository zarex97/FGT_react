// src/game/systems/DistanceUtils.js

/**
 * DistanceUtils.js
 *
 * A comprehensive utility library for spatial calculations, distance measurements,
 * and position-based game mechanics. This module centralizes all location-based
 * logic to ensure consistency and reusability across the tactical game system.
 *
 * Key Design Principles:
 * - Pure functions that don't modify input data
 * - Comprehensive error handling for edge cases
 * - Rich return objects that provide multiple pieces of useful information
 * - Clear separation between different types of spatial calculations
 */

/**
 * Checks if a unit is currently located within their player's base territory.
 *
 * This is the core function you requested - it determines territorial positioning
 * for game mechanics like defensive bonuses, movement restrictions, or win conditions.
 *
 * The function performs several logical steps:
 * 1. Validates input parameters to prevent runtime errors
 * 2. Locates the player who owns the given unit
 * 3. Checks if that player has been assigned a base
 * 4. Performs coordinate matching between unit position and base territory
 * 5. Returns comprehensive information about the territorial relationship
 *
 * @param {Object} unit - The unit object to check (must have id, team, x, y, z properties)
 * @param {Object} gameState - Current game state (must have players and units)
 * @returns {Object} Detailed information about the unit's base status
 *
 * Return object structure:
 * {
 *   isInOwnBase: boolean,           // Primary answer: is the unit in their own base?
 *   hasBase: boolean,               // Does the player have a base at all?
 *   playerInfo: Object|null,        // Full player information
 *   baseInfo: Object|null,          // Base details if player has one
 *   unitPosition: Object,           // Unit's current coordinates
 *   distanceFromBase: number|null,  // Closest distance to any base coordinate
 *   territoryStatus: string         // 'own-base', 'enemy-base', 'neutral', 'no-base'
 * }
 */
export const isUnitInOwnBase = (unit, gameState) => {
  // Input validation - we need to be defensive against malformed data
  // because this function might be called during game state transitions
  if (!unit || typeof unit !== "object") {
    console.warn("DistanceUtils.isUnitInOwnBase: Invalid unit parameter");
    return createBaseStatusResult(false, "invalid-unit");
  }

  if (!gameState || !gameState.players || !gameState.units) {
    console.warn("DistanceUtils.isUnitInOwnBase: Invalid gameState parameter");
    return createBaseStatusResult(false, "invalid-gamestate");
  }

  // Ensure unit has required coordinate properties
  if (
    typeof unit.x !== "number" ||
    typeof unit.y !== "number" ||
    typeof unit.z !== "number"
  ) {
    console.warn(
      `DistanceUtils.isUnitInOwnBase: Unit ${unit.id} missing coordinate data`
    );
    return createBaseStatusResult(false, "invalid-coordinates");
  }

  // Find the player who owns this unit by matching team identifiers
  // This step is crucial because units are linked to players through team membership
  const owningPlayer = findPlayerByTeam(unit.team, gameState.players);

  if (!owningPlayer) {
    console.warn(
      `DistanceUtils.isUnitInOwnBase: No player found for unit ${unit.id} with team ${unit.team}`
    );
    return createBaseStatusResult(false, "no-player", {
      unitPosition: { x: unit.x, y: unit.y, z: unit.z },
    });
  }

  // Check if the owning player has been assigned a base
  // Not all players will have bases depending on game mode and assignment status
  if (!owningPlayer.base || !owningPlayer.base.coordinates) {
    console.log(
      `DistanceUtils.isUnitInOwnBase: Player ${owningPlayer.username} has no base assigned`
    );
    return createBaseStatusResult(false, "no-base", {
      playerInfo: owningPlayer,
      unitPosition: { x: unit.x, y: unit.y, z: unit.z },
    });
  }

  // Perform the actual coordinate matching
  // We check if the unit's current position matches any coordinate in the base territory
  const unitPosition = { x: unit.x, y: unit.y, z: unit.z };
  const isInBase = isPositionInBase(
    unitPosition,
    owningPlayer.base.coordinates
  );

  // Calculate distance to base for strategic information
  // This can be useful for movement planning or proximity-based bonuses
  const distanceFromBase = isInBase
    ? 0
    : calculateMinDistanceToBase(unitPosition, owningPlayer.base.coordinates);

  // Determine overall territory status for rich game mechanics
  const territoryStatus = determineTerritoryStatus(
    unitPosition,
    gameState,
    unit.team
  );

  console.log(
    `DistanceUtils.isUnitInOwnBase: Unit ${unit.id} (${owningPlayer.username}) - InBase: ${isInBase}, Distance: ${distanceFromBase}`
  );

  return createBaseStatusResult(isInBase, "success", {
    playerInfo: owningPlayer,
    baseInfo: owningPlayer.base,
    unitPosition: unitPosition,
    distanceFromBase: distanceFromBase,
    territoryStatus: territoryStatus,
  });
};

/**
 * Determines what type of territory a position represents in the current game state.
 * This provides strategic context beyond just "in own base" - useful for complex game mechanics.
 *
 * @param {Object} position - Coordinates to check {x, y, z}
 * @param {Object} gameState - Current game state
 * @param {string} checkingTeam - Team of the unit we're checking for
 * @returns {string} Territory type: 'own-base', 'enemy-base', 'neutral', 'no-bases'
 */
const determineTerritoryStatus = (position, gameState, checkingTeam) => {
  const allPlayers = Object.values(gameState.players);

  // Check if any player has bases defined
  const playersWithBases = allPlayers.filter(
    (player) => player.base && player.base.coordinates
  );
  if (playersWithBases.length === 0) {
    return "no-bases";
  }

  // Check each player's base to see what territory this position represents
  for (const player of playersWithBases) {
    if (isPositionInBase(position, player.base.coordinates)) {
      return player.team === checkingTeam ? "own-base" : "enemy-base";
    }
  }

  return "neutral";
};

/**
 * Finds a player object by their team identifier.
 * This is a common operation that deserves its own function for clarity and reusability.
 *
 * @param {string} teamId - The team identifier to search for
 * @param {Object} players - Players object from game state
 * @returns {Object|null} Player object if found, null otherwise
 */
const findPlayerByTeam = (teamId, players) => {
  return (
    Object.values(players).find((player) => player.team === teamId) || null
  );
};

/**
 * Checks if a specific position exists within a set of base coordinates.
 *
 * IMPORTANT: Base territory control extends vertically through all height levels.
 * This means a unit is considered "in base" regardless of their height (z-coordinate)
 * as long as their ground position (x, y) matches any base coordinate.
 *
 * This design choice reflects real-world territorial control principles where
 * owning ground coordinates implies control over the vertical space above and below.
 * It also enables strategic gameplay with multi-level base defenses.
 *
 * @param {Object} position - Position to check {x, y, z}
 * @param {Array} baseCoordinates - Array of coordinate objects from base territory
 * @returns {boolean} True if position's x,y coordinates match any base territory
 */
const isPositionInBase = (position, baseCoordinates) => {
  // Use Array.some() for early termination when match is found
  // We only check x and y coordinates - height (z) is irrelevant for base ownership
  return baseCoordinates.some(
    (coord) => coord.x === position.x && coord.y === position.y
    // Note: We intentionally omit z-coordinate checking here
    // This allows units on any height level to be considered "in base"
  );
};

/**
 * Calculates the minimum distance from a position to any coordinate in a base.
 *
 * Since base territory control extends vertically through all heights,
 * we calculate distance using only the x,y coordinates (2D distance).
 * This ensures that distance calculations reflect the true territorial
 * relationship rather than being skewed by height differences.
 *
 * For example, a unit on height 3 directly above their base should have
 * distance 0, not distance 2 (which would be the 3D calculation).
 *
 * @param {Object} position - Starting position {x, y, z}
 * @param {Array} baseCoordinates - Array of base coordinate objects
 * @returns {number} Minimum 2D distance to base territory
 */
const calculateMinDistanceToBase = (position, baseCoordinates) => {
  if (!baseCoordinates || baseCoordinates.length === 0) {
    return Infinity;
  }

  // Calculate 2D Manhattan distance to each base coordinate and return the minimum
  // We use 2D distance because base control extends through all height levels
  let minDistance = Infinity;

  for (const coord of baseCoordinates) {
    // Use 2D distance calculation since height doesn't affect base ownership
    const distance = calculateManhattanDistance2D(position, coord);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
};

/**
 * Calculates 3D Manhattan distance between two points.
 * Manhattan distance represents the actual movement cost in a grid-based game.
 *
 * @param {Object} pos1 - First position {x, y, z}
 * @param {Object} pos2 - Second position {x, y, z}
 * @returns {number} Manhattan distance
 */
export const calculateManhattanDistance3D = (pos1, pos2) => {
  return (
    Math.abs(pos1.x - pos2.x) +
    Math.abs(pos1.y - pos2.y) +
    Math.abs(pos1.z - pos2.z)
  );
};

/**
 * Calculates 2D Manhattan distance (ignoring height).
 * Useful when height differences don't affect movement cost.
 *
 * @param {Object} pos1 - First position {x, y}
 * @param {Object} pos2 - Second position {x, y}
 * @returns {number} 2D Manhattan distance
 */
export const calculateManhattanDistance2D = (pos1, pos2) => {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

/**
 * Calculates Euclidean distance for line-of-sight calculations.
 * Useful for abilities that work in straight lines regardless of movement restrictions.
 *
 * @param {Object} pos1 - First position {x, y, z}
 * @param {Object} pos2 - Second position {x, y, z}
 * @returns {number} Euclidean distance
 */
export const calculateEuclideanDistance3D = (pos1, pos2) => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Creates a standardized result object for base status queries.
 * This ensures consistent return format across all base-related functions.
 *
 * @param {boolean} isInOwnBase - Primary result
 * @param {string} status - Status code for debugging
 * @param {Object} additionalData - Extra information to include
 * @returns {Object} Standardized result object
 */
const createBaseStatusResult = (
  isInOwnBase,
  status = "success",
  additionalData = {}
) => {
  return {
    isInOwnBase,
    hasBase: additionalData.playerInfo?.base ? true : false,
    playerInfo: additionalData.playerInfo || null,
    baseInfo: additionalData.baseInfo || null,
    unitPosition: additionalData.unitPosition || null,
    distanceFromBase: additionalData.distanceFromBase || null,
    territoryStatus: additionalData.territoryStatus || status,
    status: status, // For debugging and error handling
  };
};

/**
 * Gets all units that are currently in their own bases.
 * Useful for applying territorial bonuses or checking win conditions.
 *
 * @param {Object} gameState - Current game state
 * @returns {Array} Array of units that are in their own bases
 */
export const getUnitsInOwnBases = (gameState) => {
  if (!gameState.units) return [];

  return gameState.units.filter((unit) => {
    const result = isUnitInOwnBase(unit, gameState);
    return result.isInOwnBase;
  });
};

/**
 * Gets all units of a specific team that are in enemy territory.
 * Useful for checking infiltration objectives or applying penalties.
 *
 * @param {string} teamId - Team to check
 * @param {Object} gameState - Current game state
 * @returns {Array} Array of units in enemy bases
 */
export const getUnitsInEnemyBases = (teamId, gameState) => {
  if (!gameState.units) return [];

  return gameState.units
    .filter((unit) => unit.team === teamId)
    .filter((unit) => {
      const result = isUnitInOwnBase(unit, gameState);
      return result.territoryStatus === "enemy-base";
    });
};

/**
 * Calculates territorial control statistics for strategic analysis.
 * Provides percentage control, unit distribution, and other metrics.
 *
 * @param {Object} gameState - Current game state
 * @returns {Object} Territorial control statistics
 */
export const calculateTerritorialControl = (gameState) => {
  const stats = {
    totalUnits: gameState.units.length,
    unitsInOwnBases: 0,
    unitsInEnemyBases: 0,
    unitsInNeutralTerritory: 0,
    teamBreakdown: {},
  };

  // Initialize team breakdown
  const teams = [...new Set(gameState.units.map((unit) => unit.team))];
  teams.forEach((team) => {
    stats.teamBreakdown[team] = {
      total: 0,
      inOwnBase: 0,
      inEnemyBase: 0,
      inNeutral: 0,
    };
  });

  // Analyze each unit's territorial status
  gameState.units.forEach((unit) => {
    const result = isUnitInOwnBase(unit, gameState);
    const teamStats = stats.teamBreakdown[unit.team];

    teamStats.total++;

    switch (result.territoryStatus) {
      case "own-base":
        stats.unitsInOwnBases++;
        teamStats.inOwnBase++;
        break;
      case "enemy-base":
        stats.unitsInEnemyBases++;
        teamStats.inEnemyBase++;
        break;
      default:
        stats.unitsInNeutralTerritory++;
        teamStats.inNeutral++;
        break;
    }
  });

  return stats;
};

/**
 * Checks if a position is adjacent to a base (within 1 cell in x,y coordinates).
 *
 * Following the same principle as base ownership, adjacency is determined
 * by 2D distance only. A unit on height 3 that is one cell away in x,y
 * coordinates from a base is considered adjacent, regardless of the height
 * difference between the unit and the base coordinates.
 *
 * This maintains consistency with our base ownership logic and enables
 * strategic mechanics like "approach bonuses" that work across height levels.
 *
 * @param {Object} position - Position to check {x, y, z}
 * @param {Array} baseCoordinates - Base coordinate array
 * @param {boolean} includeDiagonal - Whether to include diagonal adjacency
 * @returns {boolean} True if position is adjacent to base in x,y plane
 */
export const isPositionAdjacentToBase = (
  position,
  baseCoordinates,
  includeDiagonal = true
) => {
  const maxDistance = 1; // Always 1 for adjacency, regardless of diagonal setting

  return baseCoordinates.some((coord) => {
    // Use 2D distance to maintain consistency with base ownership logic
    const distance = calculateManhattanDistance2D(position, coord);
    return distance > 0 && distance <= maxDistance;
  });
};

// Export the main function for external use
export default isUnitInOwnBase;
