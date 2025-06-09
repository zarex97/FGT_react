import { WebSocketServer } from "ws";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import url from "url";
import fs from "fs";
import path from "path";
import { TriggerEffectProcessor } from "../src/game/TriggerEffectProcessor.js";
import { EventTypes } from "../src/game/EventTypes.js";
import "../src/game/registry_triggers.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { VehicleUtils } from "./../src/game/utils/VehicleUtils.js";

const server = http.createServer();
const wsServer = new WebSocketServer({ server });

const port = 8000;
const connections = {};
const rooms = {};
const playerStates = {};

// Autosave system - stores up to 100 game states per room
const autosaves = {}; // roomId -> array of saves
const MAX_AUTOSAVES = 100;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize autosaves directory
const autosaveDir = path.join(__dirname, "autosaves");
if (!fs.existsSync(autosaveDir)) {
  fs.mkdirSync(autosaveDir, { recursive: true });
}

// Autosave function
const createAutosave = (roomId, gameState, messageType, stage) => {
  if (!autosaves[roomId]) {
    autosaves[roomId] = [];
  }

  const autosave = {
    timestamp: new Date().toISOString(),
    messageType: messageType || "unknown",
    stage: stage, // 'before' or 'after'
    gameState: JSON.stringify(gameState),
    turn: gameState.currentTurn,
    round: gameState.currentRound,
  };

  autosaves[roomId].push(autosave);

  // Keep only the last MAX_AUTOSAVES
  if (autosaves[roomId].length > MAX_AUTOSAVES) {
    autosaves[roomId] = autosaves[roomId].slice(-MAX_AUTOSAVES);
  }

  // Also save to disk periodically (every 10 saves)
  if (autosaves[roomId].length % 2 === 0) {
    const filename = path.join(autosaveDir, `${roomId}_autosaves.json`);
    fs.writeFileSync(filename, JSON.stringify(autosaves[roomId], null, 2));
  }

  console.log(
    `Autosave created for room ${roomId} - ${stage} ${messageType} (Total: ${autosaves[roomId].length})`
  );
};

// Load autosaves from disk
const loadAutosavesFromDisk = (roomId) => {
  const filename = path.join(autosaveDir, `${roomId}_autosaves.json`);
  if (fs.existsSync(filename)) {
    try {
      const data = fs.readFileSync(filename, "utf8");
      autosaves[roomId] = JSON.parse(data);
      console.log(
        `Loaded ${autosaves[roomId].length} autosaves for room ${roomId}`
      );
    } catch (error) {
      console.error(`Error loading autosaves for room ${roomId}:`, error);
      autosaves[roomId] = [];
    }
  }
};

const processTriggerEffectsForAction = (
  gameState,
  eventType,
  eventData,
  roomId = null
) => {
  console.log(`🌟 SERVER: Processing trigger effects for event: ${eventType}`, {
    eventData,
    roomId,
    unitsWithTriggers: gameState.units
      .filter((u) => u.triggerEffects && u.triggerEffects.length > 0)
      .map((u) => ({ name: u.name, triggerCount: u.triggerEffects.length })),
  });

  // Get the original game state for comparison
  const originalGameState = JSON.parse(JSON.stringify(gameState));

  const updatedGameState = TriggerEffectProcessor.handleEvent(
    gameState,
    eventType,
    eventData
  );

  // Compare before and after to see if changes were made
  const stateChanged =
    JSON.stringify(originalGameState) !== JSON.stringify(updatedGameState);
  console.log(
    `✨ SERVER: Trigger processing complete. State changed: ${stateChanged}`
  );

  if (stateChanged) {
    console.log(`🔄 SERVER: Game state was modified by triggers!`);

    // Log specific changes to units
    updatedGameState.units.forEach((unit, index) => {
      const originalUnit = originalGameState.units[index];
      if (
        originalUnit &&
        (originalUnit.effects?.length !== unit.effects?.length ||
          JSON.stringify(originalUnit.effects) !== JSON.stringify(unit.effects))
      ) {
        console.log(`🔄 SERVER: Unit ${unit.name} effects changed:`, {
          before: originalUnit.effects?.map((e) => e.name) || [],
          after: unit.effects?.map((e) => e.name) || [],
        });
      }
    });
  }

  return updatedGameState;
};
const broadcastTriggerNotification = (
  roomId,
  unitName,
  triggerName,
  description
) => {
  const room = rooms[roomId];
  if (!room) return;

  Object.entries(room.gameState.players).forEach(([playerId, playerInfo]) => {
    const connection = connections[playerId];
    if (connection) {
      connection.send(
        JSON.stringify({
          type: "TRIGGER_EFFECT_NOTIFICATION",
          unitName,
          triggerName,
          description,
        })
      );
    }
  });
};

// NEW: Default terrain generation
const generateDefaultTerrain = () => {
  const terrain = {};
  const GRID_SIZE = 11;
  const MAX_HEIGHT = 3;

  for (let z = 1; z <= MAX_HEIGHT; z++) {
    terrain[z] = {};
    for (let x = 0; x < GRID_SIZE; x++) {
      terrain[z][x] = {};
      for (let y = 0; y < GRID_SIZE; y++) {
        terrain[z][x][y] = {
          x,
          y,
          z,
          isFloor: z === 1, // Only height 1 has floor by default
          terrainType: getRandomTerrainType(x, y, z),
          terrainEffects: getTerrainEffects(getRandomTerrainType(x, y, z)),
          // NEW: Add visibility properties that default to true
          canBeSeenFromBelow: true,
          canBeSeenFromAbove: true,
        };
      }
    }
  }

  // Add some elevators at fixed positions
  addElevators(terrain, MAX_HEIGHT);

  return terrain;
};

// NEW: Get random terrain type
const getRandomTerrainType = (x, y, z) => {
  const random = Math.random();
  if (random < 0.05) return "elevator";
  if (random < 0.1) return "fire";
  if (random < 0.15) return "ice";
  if (random < 0.2) return "healing";
  return "normal";
};

// NEW: Get terrain effects based on type
const getTerrainEffects = (terrainType) => {
  switch (terrainType) {
    case "fire":
      return [
        {
          name: "Burn",
          type: "DamageOverTime",
          value: 2,
          duration: 3,
          description: "Takes 2 damage per turn for 3 turns",
          appliedAt: 0,
        },
      ];
    case "ice":
      return [
        {
          name: "Slow",
          type: "MovementReduction",
          value: 1,
          duration: 2,
          description: "Movement reduced by 1 for 2 turns",
          appliedAt: 0,
        },
      ];
    case "healing":
      return [
        {
          name: "Regeneration",
          type: "HealOverTime",
          value: 3,
          duration: 2,
          description: "Heals 3 HP per turn for 2 turns",
          appliedAt: 0,
        },
      ];
    default:
      return [];
  }
};

// NEW: Add elevators to terrain
const addElevators = (terrain, maxHeight) => {
  const elevatorPositions = [
    { x: 2, y: 2 },
    { x: 8, y: 8 },
    { x: 5, y: 1 },
    { x: 1, y: 9 },
  ];

  elevatorPositions.forEach((pos) => {
    for (let z = 1; z <= maxHeight; z++) {
      if (terrain[z] && terrain[z][pos.x] && terrain[z][pos.x][pos.y]) {
        terrain[z][pos.x][pos.y].terrainType = "elevator";
        terrain[z][pos.x][pos.y].terrainEffects = [];
        if (z > 1) {
          terrain[z][pos.x][pos.y].isFloor = true; // Elevators are floors on all levels
        }
      }
    }
  });
};

// NEW: Apply terrain effects to unit
const applyTerrainEffects = (unit, terrain, currentTurn) => {
  if (unit.aboardVehicle) {
    // Units aboard vehicles don't get terrain effects from ground
    return unit;
  }

  const cell = terrain?.[unit.z]?.[unit.x]?.[unit.y];

  if (cell?.isVehicleFloor) {
    // Unit is standing on a vehicle floor, no terrain effects
    return unit;
  }

  if (!cell || !cell.terrainEffects || cell.terrainEffects.length === 0) {
    return unit;
  }

  const updatedUnit = { ...unit };
  const newEffects = [...(updatedUnit.effects || [])];

  cell.terrainEffects.forEach((terrainEffect) => {
    // Check if this effect is already applied and still active
    const existingEffect = newEffects.find(
      (e) =>
        e.name === terrainEffect.name &&
        e.source === "terrain" &&
        e.appliedAt + e.duration > currentTurn
    );

    if (!existingEffect) {
      // Apply new terrain effect
      const effectToApply = {
        ...terrainEffect,
        appliedAt: currentTurn,
        source: "terrain",
      };

      // Apply immediate effects
      switch (terrainEffect.type) {
        case "DamageOverTime":
          // Damage will be applied during turn processing
          newEffects.push(effectToApply);
          console.log(`Applied ${terrainEffect.name} to ${unit.name}`);
          break;
        case "MovementReduction":
          updatedUnit.movementRange = Math.max(
            1,
            updatedUnit.movementRange - terrainEffect.value
          );
          updatedUnit.movementLeft = Math.max(
            0,
            Math.min(updatedUnit.movementLeft, updatedUnit.movementRange)
          );
          newEffects.push(effectToApply);
          console.log(`Applied ${terrainEffect.name} to ${unit.name}`);
          break;
        case "HealOverTime":
          // Healing will be applied during turn processing
          newEffects.push(effectToApply);
          console.log(`Applied ${terrainEffect.name} to ${unit.name}`);
          break;
      }
    }
  });

  updatedUnit.effects = newEffects;
  return updatedUnit;
};

// NEW: Process ongoing terrain effects
const processOngoingTerrainEffects = (unit, currentTurn) => {
  if (!unit.effects || unit.effects.length === 0) return unit;

  const updatedUnit = { ...unit };
  let effectsChanged = false;

  // Process damage over time and healing over time effects
  updatedUnit.effects.forEach((effect) => {
    if (
      effect.source === "terrain" &&
      effect.appliedAt + effect.duration > currentTurn
    ) {
      switch (effect.type) {
        case "DamageOverTime":
          updatedUnit.hp = Math.max(0, updatedUnit.hp - effect.value);
          console.log(
            `${unit.name} takes ${effect.value} damage from ${effect.name}`
          );
          effectsChanged = true;
          break;
        case "HealOverTime":
          const maxHp = updatedUnit.maxHp || 100; // Default max HP if not set
          updatedUnit.hp = Math.min(maxHp, updatedUnit.hp + effect.value);
          console.log(
            `${unit.name} heals ${effect.value} HP from ${effect.name}`
          );
          effectsChanged = true;
          break;
      }
    }
  });

  // Remove expired effects
  const activeEffects = updatedUnit.effects.filter((effect) => {
    if (effect.source === "terrain") {
      return effect.appliedAt + effect.duration > currentTurn;
    }
    return true; // Keep non-terrain effects as-is
  });

  if (activeEffects.length !== updatedUnit.effects.length) {
    updatedUnit.effects = activeEffects;
    effectsChanged = true;
  }

  return updatedUnit;
};

// NEW: Validate height movement
const canMoveToHeight = (unit, targetZ, terrain) => {
  if (targetZ === unit.z) return true;

  const currentCell = terrain?.[unit.z]?.[unit.x]?.[unit.y];
  if (!currentCell || currentCell.terrainType !== "elevator") {
    return false;
  }

  if (targetZ > unit.z) {
    // Going up - check for valid floor space within 1 cell distance
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = unit.x + dx;
        const checkY = unit.y + dy;
        const targetCell = terrain?.[targetZ]?.[checkX]?.[checkY];
        if (targetCell && targetCell.isFloor) {
          return true;
        }
      }
    }
    return false;
  } else {
    // Going down - check if target level exists and has floor
    const targetCell = terrain?.[targetZ]?.[unit.x]?.[unit.y];
    return targetCell && targetCell.isFloor;
  }
};

/**
 * Generates a random team color from the available palette
 * This ensures each player gets a unique visual identity
 */
const generateRandomTeamColor = (excludeColors = []) => {
  const availableColors = [
    "white",
    "black",
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
  ];
  const usableColors = availableColors.filter(
    (color) => !excludeColors.includes(color)
  );

  if (usableColors.length === 0) {
    // Fallback to any color if all are taken (shouldn't happen with 8 colors and typical player counts)
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }

  return usableColors[Math.floor(Math.random() * usableColors.length)];
};

/**
 * Generates base coordinates for Apocrypha mode
 * The base system creates territorial control areas that give strategic advantage
 *
 * @param {string} baseType - Either "north" or "south"
 * @param {number} gridSize - The width/height of the game grid (typically 11)
 * @returns {Array} Array of coordinate objects {x, y, z} representing the base area
 */
const generateBaseCoordinates = (baseType, gridSize = 11) => {
  const coordinates = [];
  const baseHeight = 3; // Bases always span 3 rows vertically

  // Calculate which rows belong to this base
  let startY, endY;
  if (baseType === "north") {
    // North base gets the top 3 rows: y = 0, 1, 2
    startY = 0;
    endY = 2;
  } else if (baseType === "south") {
    // South base gets the bottom 3 rows: y = gridSize-3, gridSize-2, gridSize-1
    startY = gridSize - 3;
    endY = gridSize - 1;
  } else {
    throw new Error(
      `Invalid base type: ${baseType}. Must be "north" or "south"`
    );
  }

  // Generate all coordinates within the base area
  // Bases span the full width of the map and exist on ground level (z=1)
  for (let x = 0; x < gridSize; x++) {
    for (let y = startY; y <= endY; y++) {
      coordinates.push({ x, y, z: 1 }); // All bases are on ground level
    }
  }

  console.log(
    `Generated ${baseType} base with ${coordinates.length} cells from rows ${startY}-${endY}`
  );
  return coordinates;
};

/**
 * Validates and processes a player's request to change their team color.
 *
 * This function embodies the "server-authoritative" approach to multiplayer games.
 * Rather than trusting the client's color selection immediately, we validate it
 * server-side to prevent conflicts and ensure game state consistency.
 *
 * The validation process mirrors the client-side checks but is more thorough
 * because the server is the "source of truth" for game state.
 *
 * @param {string} playerId - ID of the player requesting the color change
 * @param {string} requestedColor - The color the player wants to change to
 * @param {Object} gameState - Current game state
 * @returns {Object} Result object with success status and updated game state
 */
const changePlayerColor = (playerId, requestedColor, gameState) => {
  // Validate that the requesting player exists in the game
  const targetPlayer = gameState.players[playerId];
  if (!targetPlayer) {
    throw new Error("Player not found in game state");
  }

  // Validate that the requested color is from our approved palette
  // This prevents players from injecting arbitrary colors or hex codes
  const allowedColors = [
    "white",
    "black",
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
  ];
  if (!allowedColors.includes(requestedColor)) {
    throw new Error(
      `Invalid color "${requestedColor}". Must be one of: ${allowedColors.join(
        ", "
      )}`
    );
  }

  // Check if the player is trying to change to their current color
  // This is technically valid but unnecessary, so we'll allow it with a different message
  if (targetPlayer.teamColor === requestedColor) {
    return {
      success: true,
      message: `You already have ${requestedColor} selected as your team color`,
      gameState: gameState, // No changes needed
      wasAlreadySelected: true,
    };
  }

  // Critical validation: ensure the requested color isn't taken by another player
  // This is the core multiplayer conflict prevention logic
  const colorConflictPlayer = Object.values(gameState.players).find(
    (player) => player.id !== playerId && player.teamColor === requestedColor
  );

  if (colorConflictPlayer) {
    throw new Error(
      `Color "${requestedColor}" is already taken by ${colorConflictPlayer.username}`
    );
  }

  // All validations passed - proceed with the color change
  const updatedGameState = JSON.parse(JSON.stringify(gameState)); // Deep copy for safety
  const previousColor = targetPlayer.teamColor;

  // Update the player's color
  updatedGameState.players[playerId] = {
    ...targetPlayer,
    teamColor: requestedColor,
  };

  // If the player has a base, we need to update the terrain to reflect the new color
  // This ensures that base territories immediately show the new color
  if (targetPlayer.base && targetPlayer.base.coordinates) {
    updatedGameState.terrain = updateBaseColorsInTerrain(
      updatedGameState.terrain,
      targetPlayer.base.coordinates,
      requestedColor
    );
  }

  console.log(
    `✅ Player ${targetPlayer.username} changed color from ${previousColor} to ${requestedColor}`
  );

  return {
    success: true,
    message: `Successfully changed your team color to ${requestedColor}`,
    gameState: updatedGameState,
    wasAlreadySelected: false,
    previousColor: previousColor,
  };
};

/**
 * Updates terrain cells to reflect a new team color for base territories.
 *
 * This function demonstrates the importance of maintaining data consistency
 * across different parts of your game state. When a player changes colors,
 * we need to update not just their player record but also any terrain
 * cells that represent their base territory.
 *
 * @param {Object} terrain - Current terrain data structure
 * @param {Array} baseCoordinates - Array of coordinates belonging to the base
 * @param {string} newColor - The new team color to apply
 * @returns {Object} Updated terrain with new color information
 */
const updateBaseColorsInTerrain = (terrain, baseCoordinates, newColor) => {
  const updatedTerrain = JSON.parse(JSON.stringify(terrain)); // Deep copy

  baseCoordinates.forEach((coord) => {
    const { x, y, z } = coord;

    // Ensure the terrain cell exists and is marked as a base
    if (
      updatedTerrain[z] &&
      updatedTerrain[z][x] &&
      updatedTerrain[z][x][y] &&
      updatedTerrain[z][x][y].terrainType === "base"
    ) {
      // Update the color while preserving all other terrain properties
      updatedTerrain[z][x][y] = {
        ...updatedTerrain[z][x][y],
        teamColor: newColor,
      };
    }
  });

  return updatedTerrain;
};

/**
 * Assigns bases to players in Apocrypha mode
 * This function implements the core base assignment logic with random distribution
 *
 * @param {Object} gameState - The current game state
 * @returns {Object} Updated game state with bases assigned
 */
const assignPlayerBases = (gameState) => {
  // Verify we're in the correct game mode
  if (gameState.playMode !== "Apocrypha") {
    throw new Error("Base assignment is only available in Apocrypha mode");
  }

  const players = Object.entries(gameState.players);

  // Apocrypha mode supports exactly 2 players with opposing bases
  if (players.length !== 2) {
    throw new Error(
      `Apocrypha mode requires exactly 2 players, but found ${players.length}`
    );
  }

  // Check if bases are already assigned to prevent accidental reassignment
  const playersWithBases = players.filter(([id, player]) => player.base);
  if (playersWithBases.length > 0) {
    throw new Error(
      "Some players already have bases assigned. Clear existing bases first."
    );
  }

  // Randomly determine which player gets which base
  // This adds an element of chance to base assignment
  const baseTypes = ["north", "south"];
  const shuffledBaseTypes = [...baseTypes].sort(() => Math.random() - 0.5);

  // Get existing team colors to avoid duplicates
  const existingColors = players
    .map(([id, player]) => player.teamColor)
    .filter(Boolean);

  // Create the updated game state with assigned bases
  const updatedGameState = { ...gameState };

  // Assign bases and colors to each player
  players.forEach(([playerId, player], index) => {
    const baseType = shuffledBaseTypes[index];
    const baseCoordinates = generateBaseCoordinates(baseType, 11); // Assuming 11x11 grid

    // Assign team color if player doesn't have one
    let teamColor = player.teamColor;
    if (!teamColor) {
      teamColor = generateRandomTeamColor(existingColors);
      existingColors.push(teamColor); // Prevent duplicate color assignment
    }

    // Update player with base and color information
    updatedGameState.players[playerId] = {
      ...player,
      base: {
        type: baseType,
        coordinates: baseCoordinates,
      },
      teamColor: teamColor,
    };

    console.log(
      `Assigned ${baseType} base to player ${player.username} with color ${teamColor}`
    );
  });

  // Apply base territories to the terrain system
  // This modifies the terrain data to include base ownership information
  updatedGameState.terrain = applyBasesToTerrain(
    updatedGameState.terrain,
    updatedGameState.players
  );

  return updatedGameState;
};

/**
 * Applies base territories to the terrain system
 * This function modifies terrain cells to indicate base ownership and team colors
 *
 * @param {Object} terrain - The current terrain data structure
 * @param {Object} players - The players object with base assignments
 * @returns {Object} Updated terrain with base markings
 */
const applyBasesToTerrain = (terrain, players) => {
  const updatedTerrain = JSON.parse(JSON.stringify(terrain)); // Deep copy

  // Iterate through all players and apply their base territories
  Object.entries(players).forEach(([playerId, player]) => {
    if (player.base && player.base.coordinates) {
      // Mark each coordinate in the player's base territory
      player.base.coordinates.forEach((coord) => {
        const { x, y, z } = coord;

        // Ensure the terrain cell exists before modifying it
        if (
          updatedTerrain[z] &&
          updatedTerrain[z][x] &&
          updatedTerrain[z][x][y]
        ) {
          // Mark this cell as part of a base territory
          updatedTerrain[z][x][y] = {
            ...updatedTerrain[z][x][y],
            terrainType: "base", // Special terrain type for base territories
            teamColor: player.teamColor, // Color information for rendering
            baseOwner: playerId, // Track which player owns this territory
            baseType: player.base.type, // Track whether this is north or south base
          };
        }
      });

      console.log(
        `Applied ${player.base.type} base territory for ${player.username} with ${player.teamColor} color`
      );
    }
  });

  return updatedTerrain;
};

const handleMessage = (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  const player = playerStates[uuid];

  switch (message.type) {
    case "JOIN_ROOM":
      // Create room if it doesn't exist
      if (!rooms[message.roomId]) {
        rooms[message.roomId] = {
          gameState: {
            units: message.initialUnits || [],
            turn: "player1",
            currentTurn: 1,
            currentRound: 1,
            turnsPerRound: message.turnsPerRound || 2, // Default to 2 if not specified
            players: {},
            detectionsThisTurn: [], // Initialize as array - Track who has used detection
            pendingCombatProcesses: false,
            terrain: message.initialTerrain || generateDefaultTerrain(),
            playMode: message.playMode || "Apocrypha", // Add playMode support
          },
        };
        // Load existing autosaves for this room
        loadAutosavesFromDisk(message.roomId);
      }

      // Add player to room with team color generation
      const playerNumber =
        Object.keys(rooms[message.roomId].gameState.players).length + 1;
      const existingTeamColors = Object.values(
        rooms[message.roomId].gameState.players
      )
        .map((p) => p.teamColor)
        .filter(Boolean);

      rooms[message.roomId].gameState.players[uuid] = {
        id: uuid,
        username: player.username,
        team: `player${playerNumber}`,
        teamColor: generateRandomTeamColor(existingTeamColors), // Assign unique team color
        base: null, // Initialize base as null (will be assigned later)
      };

      player.currentRoom = message.roomId;
      broadcastToRoom(message.roomId);
      break;

    case "SAVE_GAME":
      if (!player.currentRoom) {
        connections[uuid].send(
          JSON.stringify({
            type: "SAVE_ERROR",
            message: "Not in a room",
          })
        );
        return;
      }

      const roomToSave = rooms[player.currentRoom];
      if (!roomToSave) {
        connections[uuid].send(
          JSON.stringify({
            type: "SAVE_ERROR",
            message: "Room not found",
          })
        );
        return;
      }

      // Create a complete save object with metadata
      const saveData = {
        version: "1.0",
        savedAt: new Date().toISOString(),
        savedBy: player.username,
        roomId: player.currentRoom,
        gameState: roomToSave.gameState,
      };

      connections[uuid].send(
        JSON.stringify({
          type: "SAVE_COMPLETE",
          saveData: saveData,
        })
      );
      break;

    case "LOAD_GAME":
      if (!player.currentRoom) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: "Not in a room",
          })
        );
        return;
      }

      const roomToLoad = rooms[player.currentRoom];
      if (!roomToLoad) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: "Room not found",
          })
        );
        return;
      }

      try {
        const loadData = message.saveData;

        // Validate save data
        if (!loadData || !loadData.gameState) {
          throw new Error("Invalid save data format");
        }

        // Create autosave before loading
        createAutosave(
          player.currentRoom,
          roomToLoad.gameState,
          "LOAD_GAME",
          "before"
        );

        // Replace the game state
        roomToLoad.gameState = {
          ...loadData.gameState,
          // Ensure players from current session are preserved
          players: roomToLoad.gameState.players,
        };

        // Create autosave after loading
        createAutosave(
          player.currentRoom,
          roomToLoad.gameState,
          "LOAD_GAME",
          "after"
        );

        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_COMPLETE",
            message: `Game loaded from save created on ${loadData.savedAt}`,
          })
        );

        broadcastToRoom(player.currentRoom);
      } catch (error) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: `Failed to load game: ${error.message}`,
          })
        );
      }
      break;

    case "GET_AUTOSAVES":
      if (!player.currentRoom) {
        connections[uuid].send(
          JSON.stringify({
            type: "AUTOSAVES_ERROR",
            message: "Not in a room",
          })
        );
        return;
      }

      const roomAutosaves = autosaves[player.currentRoom] || [];
      const autosaveList = roomAutosaves.map((save, index) => ({
        index,
        timestamp: save.timestamp,
        messageType: save.messageType,
        stage: save.stage,
        turn: save.turn,
        round: save.round,
      }));

      connections[uuid].send(
        JSON.stringify({
          type: "AUTOSAVES_LIST",
          autosaves: autosaveList,
        })
      );
      break;

    case "LOAD_AUTOSAVE":
      if (!player.currentRoom) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: "Not in a room",
          })
        );
        return;
      }

      const roomForAutosave = rooms[player.currentRoom];
      const roomAutosavesForLoad = autosaves[player.currentRoom] || [];

      if (!roomForAutosave || !roomAutosavesForLoad.length) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: "No autosaves available",
          })
        );
        return;
      }

      const autosaveIndex = message.autosaveIndex;
      if (autosaveIndex < 0 || autosaveIndex >= roomAutosavesForLoad.length) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: "Invalid autosave index",
          })
        );
        return;
      }

      try {
        const autosaveToLoad = roomAutosavesForLoad[autosaveIndex];
        const gameStateToLoad = JSON.parse(autosaveToLoad.gameState);

        // Create autosave before loading
        createAutosave(
          player.currentRoom,
          roomForAutosave.gameState,
          "LOAD_AUTOSAVE",
          "before"
        );

        // Replace the game state
        roomForAutosave.gameState = {
          ...gameStateToLoad,
          // Ensure players from current session are preserved
          players: roomForAutosave.gameState.players,
        };

        // Create autosave after loading
        createAutosave(
          player.currentRoom,
          roomForAutosave.gameState,
          "LOAD_AUTOSAVE",
          "after"
        );

        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_COMPLETE",
            message: `Autosave loaded from ${autosaveToLoad.timestamp}`,
          })
        );

        broadcastToRoom(player.currentRoom);
      } catch (error) {
        connections[uuid].send(
          JSON.stringify({
            type: "LOAD_ERROR",
            message: `Failed to load autosave: ${error.message}`,
          })
        );
      }
      break;

    case "GAME_ACTION":
      if (!player.currentRoom) return;

      const room = rooms[player.currentRoom];
      if (!room) return;

      // Create autosave before processing action
      createAutosave(
        player.currentRoom,
        room.gameState,
        message.action,
        "before"
      );

      // Update game state based on action
      switch (message.action) {
        case "ADD_UNIT":
          // NEW: Ensure new units have height coordinate
          const newUnit = {
            ...message.unit,
            z: message.unit.z || 1, // Default to height 1 if not specified
          };
          // If this is a multi-cell unit, ensure boardCells are generated
          if (newUnit.isBiggerThanOneCell) {
            console.log(`🚤 Adding multi-cell vehicle: ${newUnit.name}`);

            // Ensure vehicle has all required properties
            if (!newUnit.containedUnits) newUnit.containedUnits = [];
            if (!newUnit.boardCells) {
              newUnit.boardCells = VehicleUtils.generateBoardCells(
                newUnit.dimensions,
                newUnit.x,
                newUnit.y,
                newUnit.z
              );
            }

            // Apply vehicle terrain effects after adding
            room.gameState.units.push(newUnit);
            if (newUnit.isVehicle) {
              room.gameState = VehicleUtils.applyVehicleTerrainEffects(
                room.gameState
              );
            }
          } else {
            // Regular unit or single-cell unit
            room.gameState.units.push(newUnit);
          }
          broadcastToRoom(player.currentRoom);
          break;

        case "MOVE_UNIT":
          // NEW: Enhanced movement with height and terrain support
          const movingUnit = room.gameState.units.find(
            (u) => u.id === message.unitId
          );
          if (!movingUnit) break;

          const newZ = message.newZ || movingUnit.z;
          const targetCell =
            room.gameState.terrain?.[newZ]?.[message.newX]?.[message.newY];

          // Validate movement
          if (!targetCell || !targetCell.isFloor) {
            console.log(
              `Invalid move: No floor at ${message.newX},${message.newY},${newZ}`
            );
            break;
          }
          // triggerEffectsLogic (Before)
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.MOVE_START,
            {
              unitId: message.unitId,
              fromX: movingUnit.x,
              fromY: movingUnit.y,
              fromZ: movingUnit.z,
              toX: message.newX,
              toY: message.newY,
              toZ: newZ,
              movementLeft: message.newMovementLeft,
            },
            room.roomId
          );
          //actual movement
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === message.unitId) {
              let updatedUnit = {
                ...unit,
                x: message.newX,
                y: message.newY,
                z: newZ,
                movementLeft: message.newMovementLeft,
              };

              // NEW: Apply terrain effects
              updatedUnit = applyTerrainEffects(
                updatedUnit,
                room.gameState.terrain,
                room.gameState.currentTurn
              );

              return updatedUnit;
            }
            return unit;
          });

          // triggerEffectsLogic (After)
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.MOVE_END,
            {
              unitId: message.unitId,
              fromX: movingUnit.x,
              fromY: movingUnit.y,
              fromZ: movingUnit.z,
              toX: message.newX,
              toY: message.newY,
              toZ: newZ,
              movementLeft: message.newMovementLeft,
            },
            room.roomId
          );

          break;

        case "ASSIGN_PLAYER_BASES":
          try {
            console.log("🏰 Processing base assignment request");

            // Ensure the game is in the correct mode for base assignment
            if (room.gameState.playMode !== "Apocrypha") {
              connections[uuid].send(
                JSON.stringify({
                  type: "BASE_ASSIGNMENT_ERROR",
                  message:
                    "Base assignment is only available in Apocrypha mode. Current mode: " +
                    (room.gameState.playMode || "Standard"),
                })
              );
              break;
            }

            // Create autosave before making changes
            createAutosave(
              player.currentRoom,
              room.gameState,
              "ASSIGN_PLAYER_BASES",
              "before"
            );

            // Perform the base assignment
            const updatedGameState = assignPlayerBases(room.gameState);
            room.gameState = updatedGameState;

            // Create autosave after successful assignment
            createAutosave(
              player.currentRoom,
              room.gameState,
              "ASSIGN_PLAYER_BASES",
              "after"
            );

            // Notify all players of successful base assignment
            const playerNames = Object.values(room.gameState.players).map(
              (p) => p.username
            );
            const successMessage = `Bases successfully assigned to ${playerNames.join(
              " and "
            )}! Check the map to see your territorial boundaries.`;

            Object.entries(room.gameState.players).forEach(
              ([playerId, playerInfo]) => {
                const connection = connections[playerId];
                if (connection) {
                  connection.send(
                    JSON.stringify({
                      type: "BASE_ASSIGNMENT_COMPLETE",
                      message: successMessage,
                    })
                  );
                }
              }
            );

            console.log("✅ Base assignment completed successfully");
          } catch (error) {
            console.error("❌ Base assignment failed:", error.message);

            // Send error message to the requesting player
            connections[uuid].send(
              JSON.stringify({
                type: "BASE_ASSIGNMENT_ERROR",
                message: error.message,
              })
            );
          }
          break;

        case "CHANGE_PLAYER_COLOR":
          try {
            console.log(
              `🎨 Processing color change request from player ${player.username}`
            );

            // Validate the color change request using our server-authoritative approach
            // Even though the client validates the color selection, we validate again here
            // because clients can be modified or have network delays that cause conflicts
            const colorChangeResult = changePlayerColor(
              uuid,
              message.newColor,
              room.gameState
            );

            // Create autosave before applying the color change
            createAutosave(
              player.currentRoom,
              room.gameState,
              "CHANGE_PLAYER_COLOR",
              "before"
            );

            // Apply the validated changes to the game state
            room.gameState = colorChangeResult.gameState;

            // Create autosave after successful color change
            createAutosave(
              player.currentRoom,
              room.gameState,
              "CHANGE_PLAYER_COLOR",
              "after"
            );

            // Send success confirmation to the requesting player
            // We use different messages depending on whether this was actually a change
            connections[uuid].send(
              JSON.stringify({
                type: "COLOR_CHANGE_COMPLETE",
                message: colorChangeResult.message,
                newColor: message.newColor,
                previousColor: colorChangeResult.previousColor,
              })
            );

            // If this was an actual color change (not selecting the same color again),
            // broadcast the change to all other players in the room
            if (!colorChangeResult.wasAlreadySelected) {
              console.log(
                `🌈 Broadcasting color change: ${player.username} is now ${message.newColor}`
              );

              // Notify other players about the color change for better game coordination
              Object.entries(room.gameState.players).forEach(
                ([playerId, playerInfo]) => {
                  if (playerId !== uuid) {
                    // Don't notify the player who made the change
                    const connection = connections[playerId];
                    if (connection) {
                      connection.send(
                        JSON.stringify({
                          type: "PLAYER_COLOR_CHANGED",
                          message: `${player.username} changed their team color to ${message.newColor}`,
                          changedPlayer: player.username,
                          newColor: message.newColor,
                          previousColor: colorChangeResult.previousColor,
                        })
                      );
                    }
                  }
                }
              );
            }

            console.log(
              `✅ Color change completed successfully for ${player.username}`
            );
          } catch (error) {
            console.error(
              `❌ Color change failed for ${player.username}:`,
              error.message
            );

            // Send detailed error message to help the player understand what went wrong
            connections[uuid].send(
              JSON.stringify({
                type: "COLOR_CHANGE_ERROR",
                message: `Unable to change color: ${error.message}`,
                requestedColor: message.newColor,
              })
            );
          }
          break;

        case "UPDATE_VEHICLE_PASSENGER_POSITION":
          const vehicleId = message.vehicleId;
          const unit_Id = message.unitId;
          const newRelativeX = message.newRelativeX;
          const newRelativeY = message.newRelativeY;

          // Find the vehicle and passenger
          const targetVehicle = room.gameState.units.find(
            (u) => u.id === vehicleId
          );
          const passenger = room.gameState.units.find((u) => u.id === unit_Id);

          if (!targetVehicle || !passenger) {
            console.error(`Vehicle or passenger not found for position update`);
            break;
          }

          // Validate that the passenger is actually aboard this vehicle
          if (passenger.aboardVehicle !== vehicleId) {
            console.error(
              `Passenger ${unit_Id} is not aboard vehicle ${vehicleId}`
            );
            break;
          }

          // Update the passenger's relative position
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === unit_Id) {
              console.log(
                `Updating passenger ${unit.name} relative position to (${newRelativeX}, ${newRelativeY})`
              );
              return {
                ...unit,
                vehicleRelativePosition: {
                  x: newRelativeX,
                  y: newRelativeY,
                },
              };
            }
            return unit;
          });

          console.log(`Successfully updated passenger position within vehicle`);
          break;

        case "CHANGE_HEIGHT":
          const changingUnit = room.gameState.units.find(
            (u) => u.id === message.unitId
          );
          if (!changingUnit) break;

          // Validate height change
          if (
            !canMoveToHeight(changingUnit, message.newZ, room.gameState.terrain)
          ) {
            console.log(`Invalid height change for unit ${message.unitId}`);
            break;
          }

          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === message.unitId) {
              return {
                ...unit,
                z: message.newZ,
              };
            }
            return unit;
          });

          break;

        case "MOVE_VEHICLE":
          const vehicle = room.gameState.units.find(
            (u) => u.id === message.vehicleId
          );
          if (!vehicle || !vehicle.isVehicle) break;

          console.log(
            `🚤 Moving vehicle ${vehicle.name} from (${vehicle.x},${vehicle.y}) to (${message.newX},${message.newY})`
          );

          // Validate the move (now allows movement through allied units)
          if (
            !VehicleUtils.canVehicleMoveTo(
              vehicle,
              message.newX,
              message.newY,
              message.newZ,
              room.gameState,
              11
            )
          ) {
            console.log("❌ Invalid vehicle move attempted");
            break;
          }

          // Move the vehicle and handle auto-boarding
          const moveResult = VehicleUtils.moveVehicle(
            vehicle,
            message.newX,
            message.newY,
            message.newZ,
            room.gameState
          );

          // Update the game state with the move result
          room.gameState = moveResult.updatedGameState;

          // Update vehicle movement points
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === message.vehicleId) {
              return {
                ...unit,
                movementLeft: message.newMovementLeft,
              };
            }
            return unit;
          });

          // Apply vehicle terrain effects
          room.gameState = VehicleUtils.applyVehicleTerrainEffects(
            room.gameState
          );

          console.log(`✅ Vehicle moved successfully with auto-boarding`);
          break;

        case "BOARD_VEHICLE":
          const boardingVehicle = room.gameState.units.find(
            (u) => u.id === message.vehicleId
          );
          const boardingUnit = room.gameState.units.find(
            (u) => u.id === message.unitId
          );

          if (!boardingVehicle || !boardingUnit) {
            console.log("❌ Vehicle or unit not found for boarding");
            break;
          }

          if (!boardingVehicle.isVehicle) {
            console.log("❌ Target is not a vehicle");
            break;
          }

          // Initialize containedUnits if it doesn't exist
          if (!boardingVehicle.containedUnits) {
            boardingVehicle.containedUnits = [];
          }

          // Check if vehicle has space
          const maxPassengers = boardingVehicle.maxPassengers || 10;
          if (boardingVehicle.containedUnits.length >= maxPassengers) {
            console.log("❌ Vehicle is at maximum capacity");
            break;
          }

          // Check if unit is already aboard a vehicle
          if (boardingUnit.aboardVehicle) {
            console.log("❌ Unit is already aboard a vehicle");
            break;
          }

          // Validate relative position
          const relativeX = message.relativeX;
          const relativeY = message.relativeY;

          if (
            relativeX < 0 ||
            relativeX >= boardingVehicle.dimensions.width ||
            relativeY < 0 ||
            relativeY >= boardingVehicle.dimensions.height
          ) {
            console.log(
              `❌ Invalid relative position (${relativeX}, ${relativeY})`
            );
            break;
          }

          // Check if the relative position is already occupied
          const isPositionOccupied = boardingVehicle.containedUnits.some(
            (passengerId) => {
              const passenger = room.gameState.units.find(
                (u) => u.id === passengerId
              );
              return (
                passenger?.vehicleRelativePosition?.x === relativeX &&
                passenger?.vehicleRelativePosition?.y === relativeY
              );
            }
          );

          if (isPositionOccupied) {
            console.log(
              `❌ Relative position (${relativeX}, ${relativeY}) is already occupied`
            );
            break;
          }

          // Check if unit can board (team compatibility)
          if (
            !VehicleUtils.canUnitBoardVehicle(
              boardingUnit,
              boardingVehicle,
              room.gameState
            )
          ) {
            console.log(
              "❌ Unit cannot board this vehicle (team restrictions)"
            );
            break;
          }

          console.log(
            `🚌 ${boardingUnit.name} boarding ${boardingVehicle.name} at relative position (${relativeX}, ${relativeY})`
          );

          // Calculate world position for the passenger
          const worldPos = VehicleUtils.relativeToWorld(
            boardingVehicle,
            relativeX,
            relativeY
          );

          // Update both units
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === boardingVehicle.id) {
              return {
                ...unit,
                containedUnits: [...unit.containedUnits, boardingUnit.id],
              };
            }
            if (unit.id === boardingUnit.id) {
              return {
                ...unit,
                x: worldPos.x,
                y: worldPos.y,
                z: worldPos.z,
                aboardVehicle: boardingVehicle.id,
                vehicleRelativePosition: { x: relativeX, y: relativeY },
              };
            }
            return unit;
          });

          console.log(
            `✅ ${boardingUnit.name} successfully boarded ${boardingVehicle.name}`
          );
          break;

        case "DISEMBARK_VEHICLE":
          const disembarkVehicle = room.gameState.units.find(
            (u) => u.id === message.vehicleId
          );
          const disembarkUnit = room.gameState.units.find(
            (u) => u.id === message.unitId
          );

          if (!disembarkVehicle || !disembarkUnit) {
            console.log("❌ Vehicle or unit not found for disembarking");
            break;
          }

          if (!disembarkVehicle.isVehicle) {
            console.log("❌ Target is not a vehicle");
            break;
          }

          // Check if unit is actually aboard this vehicle
          if (disembarkUnit.aboardVehicle !== disembarkVehicle.id) {
            console.log("❌ Unit is not aboard this vehicle");
            break;
          }

          // Validate disembark position
          const targetX = message.targetX;
          const targetY = message.targetY;
          const targetZ = message.targetZ;

          // Check if the target position is valid and not occupied
          if (
            VehicleUtils.isPositionOccupied(
              room.gameState,
              targetX,
              targetY,
              targetZ
            )
          ) {
            console.log("❌ Target disembark position is occupied");
            break;
          }

          // Check if target position has valid terrain
          const targetedCell =
            room.gameState.terrain?.[targetZ]?.[targetX]?.[targetY];
          if (!targetedCell || !targetedCell.isFloor) {
            console.log("❌ Target disembark position has no valid floor");
            break;
          }

          console.log(
            `🚶 ${disembarkUnit.name} disembarking from ${disembarkVehicle.name} to (${targetX}, ${targetY}, ${targetZ})`
          );

          // Update both units
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === disembarkVehicle.id) {
              return {
                ...unit,
                containedUnits: unit.containedUnits.filter(
                  (id) => id !== disembarkUnit.id
                ),
              };
            }
            if (unit.id === disembarkUnit.id) {
              return {
                ...unit,
                x: targetX,
                y: targetY,
                z: targetZ,
                aboardVehicle: null,
                vehicleRelativePosition: null,
              };
            }
            return unit;
          });

          console.log(`✅ ${disembarkUnit.name} successfully disembarked`);
          break;

        case "ATTACK":
          // Handle attack action
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === message.targetId) {
              return {
                ...unit,
                hp: message.newHp,
              };
            }
            if (unit.id === message.attackerId) {
              return {
                ...unit,
                hasAttacked: true,
              };
            }
            return unit;
          });
          break;

        // In server.js, update the END_TURN case:

        case "END_TURN":
          // Add BEFORE existing end turn logic
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.TURN_END,
            {
              endingTurn: room.gameState.turn,
              currentTurn: room.gameState.currentTurn,
              currentRound: room.gameState.currentRound,
            },
            room.roomId
          );

          const newTurn = message.nextTurn;
          const currentTurn = room.gameState.currentTurn + 1;
          let newRound = room.gameState.currentRound;

          // Check if we need to increment the round
          if (currentTurn % room.gameState.turnsPerRound === 1) {
            newRound += 1;
            console.log(`Starting round ${newRound}`);
          }

          // Preserve all unit data while updating movement and attack status
          const updatedUnits = room.gameState.units.map((existingUnit) => {
            const updatedUnit = message.updatedUnits.find(
              (u) => u.id === existingUnit.id
            );
            if (updatedUnit) {
              return {
                ...existingUnit, // Keep all existing unit data
                movementLeft: updatedUnit.movementRange, // Reset movement
                hasAttacked: false, // Reset attack status
              };
            }
            return existingUnit;
          });

          room.gameState.detectionsThisTurn = new Set();
          room.gameState = {
            ...room.gameState,
            units: updatedUnits,
            turn: newTurn,
            currentTurn: currentTurn,
            currentRound: newRound,
            detectionsThisTurn: [], // Reset as empty array
          };

          // Add AFTER updating game state
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.TURN_START,
            {
              startingTurn: newTurn,
              currentTurn: currentTurn,
              currentRound: newRound,
            },
            room.roomId
          );

          const cleanedUnits = updatedUnits.filter((unit) => {
            if (unit.summonDuration !== undefined) {
              const turnsAlive = currentTurn - unit.summonedAt;
              if (turnsAlive >= unit.summonDuration) {
                console.log(
                  `🚤💀 ${unit.name} duration expired, removing from game`
                );

                // If it's a vehicle, disembark all passengers first
                if (unit.isVehicle && unit.containedUnits.length > 0) {
                  const disembarkPositions = VehicleUtils.getDisembarkPositions(
                    unit,
                    room.gameState
                  );

                  // Force disembark all passengers to available positions
                  unit.containedUnits.forEach((passengerId, index) => {
                    const passenger = updatedUnits.find(
                      (u) => u.id === passengerId
                    );
                    if (passenger && disembarkPositions[index]) {
                      const pos = disembarkPositions[index];
                      passenger.x = pos.x;
                      passenger.y = pos.y;
                      passenger.z = pos.z;
                      passenger.aboardVehicle = null;
                      passenger.vehicleRelativePosition = null;
                      console.log(
                        `🚶 Force disembarked ${passenger.name} due to vehicle expiration`
                      );
                    }
                  });
                }

                return false; // Remove the vehicle/summon
              }
            }
            return true; // Keep the unit
          });

          room.gameState.units = cleanedUnits;

          // Reapply vehicle terrain effects after cleanup
          room.gameState = VehicleUtils.applyVehicleTerrainEffects(
            room.gameState
          );

          broadcastToRoom(player.currentRoom);
          break;

        case "ATTEMPT_DETECTION":
          // Add BEFORE existing detection logic
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.DETECTION_ATTEMPT,
            {
              detectingPlayerId: uuid,
              detectingTeam: room.gameState.players[uuid].team,
            },
            room.roomId
          );

          // Check if player has already used detection this turn
          if (room.gameState.detectionsThisTurn.includes(uuid)) {
            connection.send(
              JSON.stringify({
                type: "DETECTION_ERROR",
                message: "Detection already used this turn",
              })
            );
            return;
          }

          const detectingTeam = room.gameState.players[uuid].team;
          const visibilityInfo = getVisibleUnits(room.gameState, detectingTeam);
          const visibleCellsSet = new Set(visibilityInfo.visibleCells);

          // Get all enemy units that could be visible (in range) but are concealed
          const concealedUnits = room.gameState.units.filter((unit) => {
            const isEnemy = unit.team !== detectingTeam;
            const isInRange = visibleCellsSet.has(
              `${unit.x},${unit.y},${unit.z}`
            );
            const hasConcealment = unit.effects?.some(
              (effect) =>
                effect.name === "Presence Concealment" &&
                effect.appliedAt + effect.duration > room.gameState.currentTurn
            );
            return isEnemy && isInRange && hasConcealment;
          });

          // Attempt detection for each concealed unit
          const detectionResults = concealedUnits.map((unit) => {
            const concealmentEffect = unit.effects.find(
              (e) => e.name === "Presence Concealment"
            );
            const detectAttemptNumber = Math.floor(Math.random() * 100) + 1;
            const wasDetected =
              detectAttemptNumber <= concealmentEffect.chanceOfBeingDiscovered;

            return {
              unitId: unit.id,
              wasDetected,
              roll: detectAttemptNumber,
              threshold: concealmentEffect.chanceOfBeingDiscovered,
            };
          });

          // Update units based on detection results
          room.gameState.units = room.gameState.units.map((unit) => {
            const detectionResult = detectionResults.find(
              (r) => r.unitId === unit.id
            );
            if (detectionResult?.wasDetected) {
              return {
                ...unit,
                effects: unit.effects.filter(
                  (e) => e.name !== "Presence Concealment"
                ),
              };
            }
            return unit;
          });

          // Mark detection as used for this player
          room.gameState.detectionsThisTurn.push(uuid);

          // Send detection results to all players
          Object.entries(room.gameState.players).forEach(
            ([playerId, playerInfo]) => {
              const connection = connections[playerId];
              if (connection) {
                connection.send(
                  JSON.stringify({
                    type: "DETECTION_RESULTS",
                    results: detectionResults,
                    playerTeam: playerInfo.team,
                  })
                );
              }
            }
          );

          broadcastToRoom(player.currentRoom);

          broadcastToRoom(player.currentRoom);
          break;

        case "RECEIVE_ATTACK":
          const updatedUnit = message.updatedUnit;
          const updated_Attacker = message.updatedAttacker;
          const combatResults = message.combatResults;

          // Find the attacker and defender from the combat results
          const fullAttackerId = updated_Attacker.id;
          const fullDefenderId = updatedUnit.id;

          // Check if this is a counter attack being processed
          const defenderUnit = room.gameState.units.find(
            (u) => u.id === fullDefenderId
          );
          const attackerUnit = room.gameState.units.find(
            (u) => u.id === fullAttackerId
          );
          const isCounterAttack =
            attackerUnit.counteringAgainstWho === fullAttackerId;

          console.log("Processing RECEIVE_ATTACK:", {
            fullAttackerId,
            fullDefenderId,
            isCounterAttack,
            defenderCountering: defenderUnit?.counteringAgainstWho,
            attackerCountering: attackerUnit?.counteringAgainstWho,
          });

          room.gameState.units = room.gameState.units.map((existingUnit) => {
            // Update the defender unit with new stats
            if (existingUnit.id === fullDefenderId) {
              return {
                ...updatedUnit,
                // Move combat from combatReceived to processedCombatReceived
                combatReceived: {},
                processedCombatReceived: [
                  ...(existingUnit.processedCombatReceived || []),
                  existingUnit.combatReceived,
                ],
              };
            }

            // Update the attacker unit - move combat arrays and handle counter status
            if (existingUnit.id === fullAttackerId) {
              // Find the combat that was sent to this defender
              const processedCombat = existingUnit.combatSent.find(
                (c) => c.defender.id === fullDefenderId
              );
              const remainingCombatSent = existingUnit.combatSent.filter(
                (c) => c.defender.id !== fullDefenderId
              );

              let updatedAttacker = {
                ...existingUnit,
                canCounter: false,
                counteringAgainstWho: null,
                // Move combat from combatSent to processedCombatSent
                combatSent: remainingCombatSent,
                processedCombatSent: [
                  ...(existingUnit.processedCombatSent || []),
                  processedCombat,
                ],
              };

              // If this is a counter attack being processed, reset the original attacker's counter status
              if (isCounterAttack) {
                console.log(
                  "Resetting counter status for original attacker:",
                  fullAttackerId
                );
                updatedAttacker.canCounter = false;
                updatedAttacker.counteringAgainstWho = null;
              }

              return updatedAttacker;
            }

            return existingUnit;
          });

          // Fire RECEIVE_DAMAGE event
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.RECEIVE_DAMAGE,
            {
              attackerId: updated_Attacker.id,
              defenderId: updatedUnit.id,
              damage: combatResults.finalDamage.total,
              combatResults: combatResults,
            },
            room.roomId
          );

          // Check if this was a successful attack
          const wasSuccessful = combatResults.finalDamage.total > 0;
          console.log(
            `🎯 Attack from defender's POV (handleDoNothing) was successful: ${wasSuccessful}`
          );
          if (wasSuccessful) {
            console.log(
              `🎯 Firing SUCCESSFUL_ATTACK event for ${
                updated_Attacker.name || updated_Attacker.id
              }`
            );
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.SUCCESSFUL_ATTACK,
              {
                attackerId: updated_Attacker.id,
                defenderId: updatedUnit.id,
                damage: combatResults.finalDamage.total,
                wasCritical: combatResults.criticals.rolled,
                wasSuccessful: true,
                combatResults: combatResults,
              },
              room.roomId
            );
          }

          // Check for HP loss
          if (combatResults.finalDamage.total > 0) {
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.HP_LOSS,
              {
                unitId: updatedUnit.id,
                hpLost: combatResults.finalDamage.total,
                newHp: updatedUnit.hp,
              },
              room.roomId
            );
          }

          // Check for unit defeat
          if (updatedUnit.hp <= 0) {
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.UNIT_DEFEATED,
              {
                defeatedUnitId: updatedUnit.id,
                attackerId: updated_Attacker.id,
              },
              room.roomId
            );
          }

          broadcastToRoom(player.currentRoom);
          break;

        case "UPDATE_COMBAT_RESPONSE":
          const { attackerId, defenderId, response } = message;

          // Update both attacker and defender's combat information
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === attackerId) {
              // Find the specific combat in the combatSent array that matches this defender
              const updatedCombatSent = unit.combatSent.map((combat) => {
                if (combat.defender.id === defenderId) {
                  return {
                    ...combat,
                    response: message.response,
                  };
                }
                return combat;
              });

              return {
                ...unit,
                combatSent: updatedCombatSent,
              };
            }

            if (unit.id === defenderId) {
              return {
                ...unit,
                combatReceived: {
                  ...unit.combatReceived,
                  response: message.response,
                },
              };
            }

            return unit;
          });

          broadcastToRoom(player.currentRoom);
          break;

        case "COMBAT_FAILED":
          const { unitId, usedCommandSeal } = message;

          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === unitId) {
              return {
                ...unit,
                combatReceived: null,
                statusIfHit: null,
                backUpStatus: null,
              };
            }
            return unit;
          });

          if (usedCommandSeal) {
            // Handle command seal usage
            // You'll need to implement command seal tracking
          }

          broadcastToRoom(player.currentRoom);
          break;

        case "USE_ACTION":
          const actionCaster = room.gameState.units.find(
            (u) => u.id === message.casterId
          );
          if (!actionCaster) return;

          const actionName = message.actionId;
          const actionCasterId = message.casterId;
          const newActionCooldownUntil = message.newCooldownUntil;
          // Store original game state to detect combat initiation
          const originalGameStateAction = JSON.parse(
            JSON.stringify(room.gameState)
          );

          room.gameState = {
            ...message.updatedGameState,
            units: message.updatedGameState.units.map((updatedUnit) => {
              if (updatedUnit.id === message.casterId) {
                const updatedActions = {
                  ...updatedUnit.actions,
                  [message.actionType]: updatedUnit.actions[
                    message.actionType
                  ].map((action) => {
                    if (action.id === message.actionId) {
                      console.log("Server updating action cooldown:", {
                        actionId: action.id,
                        newCooldownUntil: message.newCooldownUntil,
                      });
                      return {
                        ...action,
                        onCooldownUntil: message.newCooldownUntil,
                      };
                    }
                    return action;
                  }),
                };
                return {
                  ...updatedUnit,
                  actions: updatedActions,
                };
              }
              return updatedUnit;
            }),
          };

          console.log("Updated game state after action:", room.gameState);

          // Add AFTER skill execution but BEFORE broadcasting
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.USE_ACTION,
            {
              actionName: actionName,
              casterId: actionCasterId,
              targetX: message.targetX,
              targetY: message.targetY,
              updatedGameState: message.updatedGameState,
            },
            room.roomId
          );

          // CONDITIONAL processing - Only if combat was initiated
          const combatWasInitiatedAction = detectCombatInitiation(
            originalGameStateAction,
            room.gameState
          );

          if (combatWasInitiatedAction) {
            console.log(
              `🎯 Combat detected from action ${actionName}, processing combat trigger effects`
            );

            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.COMBAT_INITIATED,
              {
                actionName: message.actionId,
                actionType: message.actionType,
                casterId: message.casterId,
                targetX: message.targetX,
                targetY: message.targetY,
                combatInitiated: true,
                isAttackAction: true,
              },
              player.currentRoom
            );
          } else {
            console.log(
              `✨ Non-combat action ${actionName} executed, skipping combat trigger effects`
            );
          }
          broadcastToRoom(player.currentRoom);
          break;

          console.log("Updated game state after action:", room.gameState);
          broadcastToRoom(player.currentRoom);
          break;

        case "USE_NP":
          const npCaster = room.gameState.units.find(
            (u) => u.id === message.casterId
          );
          if (!npCaster) return;

          const npName = message.npName;
          const npCasterId = message.casterId;
          const newNPCooldownUntil = message.newCooldownUntil;

          // Store original game state to detect combat initiation
          const originalGameStateNP = JSON.parse(
            JSON.stringify(room.gameState)
          );

          room.gameState = {
            ...message.updatedGameState,
            units: message.updatedGameState.units.map((updatedUnit) => {
              if (updatedUnit.id === npCasterId) {
                return {
                  ...updatedUnit,
                  noblePhantasms: updatedUnit.noblePhantasms.map((np) => {
                    if (np.id === npName) {
                      return {
                        ...np,
                        onCooldownUntil: newNPCooldownUntil,
                      };
                    }
                    return np;
                  }),
                };
              }
              return updatedUnit;
            }),
          };

          console.log(
            "Updated game state after Noble Phantasm:",
            room.gameState
          );

          // Add AFTER NP execution but BEFORE broadcasting
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.USE_NP,
            {
              npName: message.npName,
              casterId: message.casterId,
              targetX: message.targetX,
              targetY: message.targetY,
              updatedGameState: message.updatedGameState,
            },
            room.roomId
          );

          // CONDITIONAL processing - Only if combat was initiated
          const combatWasInitiatedNP = detectCombatInitiation(
            originalGameStateNP,
            room.gameState
          );

          if (combatWasInitiated) {
            console.log(
              `🎯 Combat detected from Noble Phantasm ${npName}, processing combat trigger effects`
            );

            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.COMBAT_INITIATED,
              {
                npName: message.npName,
                casterId: message.casterId,
                targetX: message.targetX,
                targetY: message.targetY,
                combatInitiated: true,
                isAttackNP: true,
              },
              player.currentRoom
            );
          } else {
            console.log(
              `✨ Non-combat Noble Phantasm ${npName} executed, skipping combat trigger effects`
            );
          }

          broadcastToRoom(player.currentRoom);
          break;
        case "USE_SKILL":
          const skillCaster = room.gameState.units.find(
            (u) => u.id === message.casterId
          );
          if (!skillCaster) return;
          const skillName = message.skillName;
          const casterId = message.casterId;
          const newCooldownUntil = message.newCooldownUntil;

          // Store original game state to detect combat initiation
          const originalGameState = JSON.parse(JSON.stringify(room.gameState));

          room.gameState = {
            ...message.updatedGameState,
            units: message.updatedGameState.units.map((updatedUnit) => {
              if (updatedUnit.id === casterId) {
                return {
                  ...updatedUnit,
                  skills: updatedUnit.skills.map((skill) => {
                    if (skill.id === skillName) {
                      return {
                        ...skill,
                        onCooldownUntil: newCooldownUntil,
                      };
                    }
                    return skill;
                  }),
                };
              }
              return updatedUnit;
            }),
          };

          console.log("Updated game state after skill:", room.gameState);

          // Add AFTER skill execution but BEFORE broadcasting
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.USE_SKILL,
            {
              skillName: message.skillName,
              casterId: message.casterId,
              targetX: message.targetX,
              targetY: message.targetY,
              updatedGameState: message.updatedGameState,
            },
            room.roomId
          );

          // CONDITIONAL processing - Only if combat was initiated
          const combatWasInitiated = detectCombatInitiation(
            originalGameState,
            room.gameState
          );

          if (combatWasInitiated) {
            console.log(
              `🎯 Combat detected from skill ${skillName}, processing combat trigger effects`
            );

            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.COMBAT_INITIATED,
              {
                skillName: message.skillName,
                casterId: message.casterId,
                targetX: message.targetX,
                targetY: message.targetY,
                combatInitiated: true,
                isAttackSkill: true,
              },
              player.currentRoom
            );
          } else {
            console.log(
              `✨ Non-combat skill ${skillName} executed, skipping combat trigger effects`
            );
          }

          broadcastToRoom(player.currentRoom);
          break;

        case "CLOSE_COMBAT_MENU":
          const { targetPlayerId, reason } = message;

          // Send message to the target player to close their combat menu
          const targetConnection = connections[targetPlayerId];
          if (targetConnection) {
            targetConnection.send(
              JSON.stringify({
                type: "CLOSE_COMBAT_MENU_RESPONSE",
                reason: reason || "Combat menu closed by request",
              })
            );
            console.log(`Sent close menu message to player ${targetPlayerId}`);
          } else {
            console.log(
              `Target player ${targetPlayerId} not found or not connected`
            );
          }
          break;

        case "PROCESS_COMBAT_AND_INITIATE_COUNTER":
          const {
            attackerId: counterId,
            defenderId: counterDefenderId,
            updatedAttacker,
            updatedDefender: counterDefender,
            combatResults: counterResults,
            outcome: counterOutcome,
          } = message;

          console.log(
            `🎯 PROCESS_COMBAT_AND_INITIATE_COUNTER: Starting processing`
          );

          // FIRST: Send message to close attacker's combat menu
          const attackerConnection = connections[counterId];
          if (attackerConnection) {
            attackerConnection.send(
              JSON.stringify({
                type: "CLOSE_COMBAT_MENU",
                reason: "Combat being processed by defender",
              })
            );
          }

          // STEP 1: Update both units with combat results FIRST
          console.log(`🎯 Step 1: Updating units with combat results`);
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === counterId) {
              // Move combat from combatSent to processedCombatSent and set canCounter
              const processedCombat = unit.combatSent.find(
                (c) => c.defender.id === counterDefenderId
              );
              const remainingCombatSent = unit.combatSent.filter(
                (c) => c.defender.id !== counterDefenderId
              );

              return {
                ...updatedAttacker,
                combatSent: remainingCombatSent,
                processedCombatSent: [
                  ...(unit.processedCombatSent || []),
                  processedCombat,
                ],
              };
            }
            if (unit.id === counterDefenderId) {
              // Move combat from combatReceived to processedCombatReceived
              return {
                ...counterDefender,
                combatReceived: {},
                canCounter: true,
                processedCombatReceived: [
                  ...(unit.processedCombatReceived || []),
                  unit.combatReceived,
                ],
              };
            }
            return unit;
          });

          console.log(
            `🎯 Step 2: Processing trigger effects AFTER unit updates`
          );

          // STEP 2: NOW process trigger effects (after unit updates are complete)

          // Fire RECEIVE_DAMAGE event
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.RECEIVE_DAMAGE,
            {
              attackerId: updatedAttacker.id,
              defenderId: counterDefender.id,
              damage: counterResults.finalDamage.total,
              combatResults: counterResults,
            },
            player.currentRoom
          );

          // Check if this was a successful attack
          const was_Successful = counterResults.finalDamage.total > 0;
          console.log(`🎯 Attack was successful: ${was_Successful}`);

          if (was_Successful) {
            console.log(
              `🎯 Firing SUCCESSFUL_ATTACK event for ${
                updatedAttacker.name || updatedAttacker.id
              }`
            );

            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.SUCCESSFUL_ATTACK,
              {
                attackerId: updatedAttacker.id,
                defenderId: counterDefender.id,
                damage: counterResults.finalDamage.total,
                wasCritical: counterResults.criticals.rolled,
                wasSuccessful: true,
                combatResults: counterResults,
              },
              player.currentRoom
            );
          }

          // Check for HP loss
          if (counterResults.finalDamage.total > 0) {
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.HP_LOSS,
              {
                unitId: counterDefender.id,
                hpLost: counterResults.finalDamage.total,
                newHp: counterDefender.hp,
              },
              player.currentRoom
            );
          }

          // Check for unit defeat
          if (counterDefender.hp <= 0) {
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.UNIT_DEFEATED,
              {
                defeatedUnitId: counterDefender.id,
                attackerId: updatedAttacker.id,
              },
              player.currentRoom
            );
          }

          console.log(`🎯 Step 3: Broadcasting final state to room`);

          // STEP 3: Broadcast the final state (only once, after all processing)
          broadcastToRoom(player.currentRoom);

          // Send completion notification
          Object.entries(room.gameState.players).forEach(
            ([playerId, playerInfo]) => {
              const connection = connections[playerId];
              if (connection) {
                connection.send(
                  JSON.stringify({
                    type: "COMBAT_COMPLETION_NOTIFICATION",
                    message:
                      counterOutcome === "hit"
                        ? "All combat steps except counter were solved, damage received and effects were applied"
                        : "All combat steps except counter were solved, attack was evaded",
                  })
                );
              }
            }
          );

          console.log(
            `🎯 PROCESS_COMBAT_AND_INITIATE_COUNTER: Completed successfully`
          );
          break;

        case "PROCESS_COMBAT_COMPLETE":
          const {
            attackerId: completeAttackerId,
            defenderId: completeDefenderId,
            updatedDefender: completeDefender,
            combatResults: completeResults,
            outcome: completeOutcome,
          } = message;

          const completeAttacker = room.gameState.units.find(
            (u) => u.id === completeAttackerId
          );

          // FIRST: Send message to close attacker's combat menu if it's open
          const completeAttackerConnection = connections[completeAttackerId];
          if (completeAttackerConnection) {
            completeAttackerConnection.send(
              JSON.stringify({
                type: "CLOSE_COMBAT_MENU",
                reason: "Combat completed",
              })
            );
          }

          // Update units and move combats to processed arrays
          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === completeAttackerId) {
              // Move combat from combatSent to processedCombatSent
              const processedCombat = unit.combatSent.find(
                (c) => c.defender.id === completeDefenderId
              );
              const remainingCombatSent = unit.combatSent.filter(
                (c) => c.defender.id !== completeDefenderId
              );
              return {
                ...unit,
                canCounter: false,
                counteringAgainstWho: null,
                combatSent: remainingCombatSent,
                processedCombatSent: [
                  ...(unit.processedCombatSent || []),
                  processedCombat,
                ],
              };
            }
            if (unit.id === completeDefenderId) {
              // Move combat from combatReceived to processedCombatReceived
              return {
                ...completeDefender,
                combatReceived: {},
                processedCombatReceived: [
                  ...(unit.processedCombatReceived || []),
                  unit.combatReceived,
                ],
              };
            }
            return unit;
          });

          console.log(
            `🎯 Step 2: Processing trigger effects AFTER unit updates`
          );

          // STEP 2: NOW process trigger effects (after unit updates are complete)

          // Fire RECEIVE_DAMAGE event
          room.gameState = processTriggerEffectsForAction(
            room.gameState,
            EventTypes.RECEIVE_DAMAGE,
            {
              attackerId: completeAttackerId.id,
              defenderId: completeDefenderId.id,
              damage: completeResults.finalDamage.total,
              combatResults: completeResults,
            },
            player.currentRoom
          );

          // Check if this was a successful attack
          const was__Successful = completeResults.finalDamage.total > 0;
          console.log(
            `🎯 Attack from attacker POV (handleConfirmCombatResults) was successful: ${was_Successful}`
          );

          if (was__Successful) {
            console.log(
              `🎯 Firing SUCCESSFUL_ATTACK event for ${
                completeAttacker.name || completeAttackerId
              }`
            );

            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.SUCCESSFUL_ATTACK,
              {
                attackerId: completeAttackerId.id,
                defenderId: completeAttackerId.id,
                damage: completeResults.finalDamage.total,
                wasCritical: completeResults.criticals.rolled,
                wasSuccessful: true,
                combatResults: completeResults,
              },
              player.currentRoom
            );
          }

          // Check for HP loss
          if (completeResults.finalDamage.total > 0) {
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.HP_LOSS,
              {
                unitId: completeDefenderId.id,
                hpLost: completeResults.finalDamage.total,
                newHp: completeDefenderId.hp,
              },
              player.currentRoom
            );
          }

          // Check for unit defeat
          if (completeDefenderId.hp <= 0) {
            room.gameState = processTriggerEffectsForAction(
              room.gameState,
              EventTypes.UNIT_DEFEATED,
              {
                defeatedUnitId: completeDefenderId.id,
                attackerId: completeAttackerId,
              },
              player.currentRoom
            );
          }

          console.log(`🎯 Step 3: Broadcasting final state to room`);
          broadcastToRoom(player.currentRoom);

          // Send completion notification
          Object.entries(room.gameState.players).forEach(
            ([playerId, playerInfo]) => {
              const connection = connections[playerId];
              if (connection) {
                connection.send(
                  JSON.stringify({
                    type: "COMBAT_COMPLETION_NOTIFICATION",
                    message:
                      completeOutcome === "hit"
                        ? "Combat complete, damage received and effects were applied"
                        : "Combat complete, attack was evaded",
                  })
                );
              }
            }
          );
          broadcastToRoom(player.currentRoom);
          break;

        case "RESET_COUNTER_STATUS":
          const { unitId: resetUnitId } = message;

          room.gameState.units = room.gameState.units.map((unit) => {
            if (unit.id === resetUnitId) {
              return {
                ...unit,
                canCounter: false,
                counteringAgainstWho: 0,
              };
            }
            return unit;
          });

          broadcastToRoom(player.currentRoom);
          break;
      }
      createAutosave(
        player.currentRoom,
        room.gameState,
        message.action,
        "after"
      );
      broadcastToRoom(player.currentRoom);
      break;
  }
};

const handleClose = (uuid) => {
  const player = playerStates[uuid];
  if (player && player.currentRoom) {
    const room = rooms[player.currentRoom];
    if (room) {
      delete room.gameState.players[uuid];
      if (Object.keys(room.gameState.players).length === 0) {
        delete rooms[player.currentRoom];
      } else {
        broadcastToRoom(player.currentRoom);
      }
    }
  }
  delete connections[uuid];
  delete playerStates[uuid];
};

// NEW: Enhanced visibility calculation for 3D grid
const calculateVisibleCells = (unit, terrain, gridSize = 11, maxHeight = 3) => {
  const visibleCells = new Set();
  const visionRange = unit.visionRange || 3;

  console.log(
    `🔍 Calculating visibility for ${unit.name} at ${unit.x},${unit.y},${unit.z} with range ${visionRange}`
  );

  // Calculate Manhattan distance for vision
  for (
    let x = Math.max(0, unit.x - visionRange);
    x <= Math.min(gridSize - 1, unit.x + visionRange);
    x++
  ) {
    for (
      let y = Math.max(0, unit.y - visionRange);
      y <= Math.min(gridSize - 1, unit.y + visionRange);
      y++
    ) {
      const distance = Math.max(Math.abs(unit.x - x), Math.abs(unit.y - y));
      if (distance <= visionRange) {
        // NEW: Check visibility for ALL height levels, not just adjacent ones
        for (let z = 1; z <= maxHeight; z++) {
          const cell = terrain?.[z]?.[x]?.[y];
          if (cell) {
            let canSee = false;

            if (z === unit.z) {
              // Same height - always visible
              canSee = true;
            } else if (z < unit.z) {
              // Looking down - check canBeSeenFromAbove
              canSee = cell.canBeSeenFromAbove !== false;
            } else {
              // Looking up - check canBeSeenFromBelow
              canSee = cell.canBeSeenFromBelow !== false;
            }

            if (canSee) {
              visibleCells.add(`${x},${y},${z}`);
            }
          }
        }
      }
    }
  }

  console.log(
    `🔍 Unit ${unit.name} can see ${visibleCells.size} cells across all heights`
  );
  return visibleCells;
};

// Update the getVisibleUnits function in server.js to handle True Sight
const getVisibleUnits = (gameState, playerTeam) => {
  const visibleCells = new Set();
  const unitsWithTrueSight = new Set();

  console.log(`🔍 Calculating team visibility for ${playerTeam}`);

  gameState.units
    .filter((unit) => unit.team === playerTeam)
    .forEach((unit) => {
      // NEW: Pass terrain data to visibility calculation
      const unitVisibleCells = calculateVisibleCells(unit, gameState.terrain);
      unitVisibleCells.forEach((cell) => visibleCells.add(cell));

      if (
        unit.effects?.some(
          (effect) =>
            effect.name === "True Sight" &&
            effect.appliedAt + effect.duration > gameState.currentTurn
        )
      ) {
        unitsWithTrueSight.add(unit.id);
      }
    });

  console.log(
    `🔍 Team ${playerTeam} can see ${visibleCells.size} total cells across all heights`
  );

  const filteredUnits = gameState.units
    .map((unit) => {
      const isVisible = visibleCells.has(`${unit.x},${unit.y},${unit.z}`);
      const isAlly = unit.team === playerTeam;
      const hasConcealment = unit.effects?.some(
        (effect) =>
          effect.name === "Presence Concealment" &&
          effect.appliedAt + effect.duration > gameState.currentTurn
      );

      if (isAlly) return unit;
      if (!isVisible) return null;

      if (hasConcealment && unitsWithTrueSight.size > 0) {
        return unit;
      }

      if (hasConcealment) {
        return null;
      }

      return unit;
    })
    .filter(Boolean);

  return {
    units: filteredUnits,
    visibleCells: Array.from(visibleCells),
  };
};

// Helper function to detect if combat was initiated by comparing game states
const detectCombatInitiation = (originalGameState, updatedGameState) => {
  // Check if any unit has new combatReceived or combatSent entries
  for (let i = 0; i < updatedGameState.units.length; i++) {
    const updatedUnit = updatedGameState.units[i];
    const originalUnit = originalGameState.units.find(
      (u) => u.id === updatedUnit.id
    );

    if (!originalUnit) continue;

    // Check for new combatReceived
    const hadCombatReceived =
      originalUnit.combatReceived &&
      Object.keys(originalUnit.combatReceived).length > 0;
    const hasCombatReceived =
      updatedUnit.combatReceived &&
      Object.keys(updatedUnit.combatReceived).length > 0;

    if (!hadCombatReceived && hasCombatReceived) {
      return true; // Combat was initiated
    }

    // Check for new combatSent
    const originalCombatSentCount = originalUnit.combatSent
      ? originalUnit.combatSent.length
      : 0;
    const updatedCombatSentCount = updatedUnit.combatSent
      ? updatedUnit.combatSent.length
      : 0;

    if (updatedCombatSentCount > originalCombatSentCount) {
      return true; // Combat was initiated
    }
  }

  return false; // No combat was initiated
};

const broadcastToRoom = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  Object.entries(room.gameState.players).forEach(([playerId, playerInfo]) => {
    const connection = connections[playerId];
    if (connection) {
      const { units, visibleCells } = getVisibleUnits(
        room.gameState,
        playerInfo.team
      );

      connection.send(
        JSON.stringify({
          type: "GAME_STATE_UPDATE",
          gameState: {
            ...room.gameState,
            units,
            visibleCells,
          },
        })
      );
    }
  });
};

wsServer.on("connection", (connection, request) => {
  const { username } = url.parse(request.url, true).query;
  const uuid = uuidv4();

  connections[uuid] = connection;
  playerStates[uuid] = {
    username,
    currentRoom: null,
  };

  connection.on("message", (message) => handleMessage(message, uuid));
  connection.on("close", () => handleClose(uuid));
});

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});
