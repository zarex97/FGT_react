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
  const cell = terrain?.[unit.z]?.[unit.x]?.[unit.y];
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
          },
        };
        // Load existing autosaves for this room
        loadAutosavesFromDisk(message.roomId);
      }

      // Add player to room
      const playerNumber =
        Object.keys(rooms[message.roomId].gameState.players).length + 1;
      rooms[message.roomId].gameState.players[uuid] = {
        id: uuid,
        username: player.username,
        team: `player${playerNumber}`,
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
          // Add the new unit to the game state
          room.gameState.units.push(newUnit);
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
const calculateVisibleCells = (unit, gridSize = 11) => {
  const visibleCells = new Set();
  const visionRange = unit.visionRange || 3;

  // Calculate Manhattan distance for vision on the same height level
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
        // Add visibility for the unit's current height
        visibleCells.add(`${x},${y},${unit.z}`);

        // NEW: Limited visibility to adjacent height levels
        if (unit.z > 1) {
          visibleCells.add(`${x},${y},${unit.z - 1}`);
        }
        if (unit.z < 3) {
          // Assuming max height of 3
          visibleCells.add(`${x},${y},${unit.z + 1}`);
        }
      }
    }
  }
  return visibleCells;
};

// Update the getVisibleUnits function in server.js to handle True Sight
const getVisibleUnits = (gameState, playerTeam) => {
  const visibleCells = new Set();
  const unitsWithTrueSight = new Set();

  gameState.units
    .filter((unit) => unit.team === playerTeam)
    .forEach((unit) => {
      const unitVisibleCells = calculateVisibleCells(unit);
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
