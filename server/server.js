const { WebSocketServer } = require("ws")
const http = require("http")
const uuidv4 = require("uuid").v4
const url = require("url")

const server = http.createServer()
const wsServer = new WebSocketServer({ server })

const port = 8000
const connections = {}
const rooms = {}
const playerStates = {}

const handleMessage = (bytes, uuid) => {
  const message = JSON.parse(bytes.toString())
  const player = playerStates[uuid]
  
  switch (message.type) {
    case 'JOIN_ROOM':
      // Create room if it doesn't exist
      if (!rooms[message.roomId]) {
        rooms[message.roomId] = {
          gameState: {
            units: message.initialUnits || [],
            turn: 'player1',
            currentTurn: 1,
            currentRound: 1,
            turnsPerRound: message.turnsPerRound || 2, // Default to 2 if not specified
            players: {},
            detectionsThisTurn: [] // Initialize as array - Track who has used detection
          }
        }
      }
      
      // Add player to room
      const playerNumber = Object.keys(rooms[message.roomId].gameState.players).length + 1
      rooms[message.roomId].gameState.players[uuid] = {
        id: uuid,
        username: player.username,
        team: `player${playerNumber}`
      }
      
      player.currentRoom = message.roomId
      broadcastToRoom(message.roomId)
      break

    case 'GAME_ACTION':
      if (!player.currentRoom) return
      
      const room = rooms[player.currentRoom]
      if (!room) return

      // Update game state based on action
      switch (message.action) {

        case 'ADD_UNIT':
          // Add the new unit to the game state
          room.gameState.units.push(message.unit);
          broadcastToRoom(player.currentRoom);
          break;

        case 'MOVE_UNIT':
          room.gameState.units = room.gameState.units.map(unit => {
            if (unit.id === message.unitId) {
              return {
                ...unit,
                x: message.newX,
                y: message.newY,
                movementLeft: message.newMovementLeft
              }
            }
            return unit
          })
          break

        case 'ATTACK':
          // Handle attack action
          room.gameState.units = room.gameState.units.map(unit => {
            if (unit.id === message.targetId) {
              return {
                ...unit,
                hp: message.newHp
              }
            }
            if (unit.id === message.attackerId) {
              return {
                ...unit,
                hasAttacked: true
              }
            }
            return unit
          })
          break

        // In server.js, update the END_TURN case:

case 'END_TURN':
  const newTurn = message.nextTurn;
  const currentTurn = room.gameState.currentTurn + 1;
  let newRound = room.gameState.currentRound;

  // Check if we need to increment the round
  if (currentTurn % room.gameState.turnsPerRound === 1) {
      newRound += 1;
      console.log(`Starting round ${newRound}`);
  }

  // Preserve all unit data while updating movement and attack status
  const updatedUnits = room.gameState.units.map(existingUnit => {
      const updatedUnit = message.updatedUnits.find(u => u.id === existingUnit.id);
      if (updatedUnit) {
          return {
              ...existingUnit,  // Keep all existing unit data
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
      detectionsThisTurn: [] // Reset as empty array
  };
  
  broadcastToRoom(player.currentRoom);
  break;

  case 'ATTEMPT_DETECTION':
    // Check if player has already used detection this turn
    if (room.gameState.detectionsThisTurn.includes(uuid)) {
        connection.send(JSON.stringify({
            type: 'DETECTION_ERROR',
            message: 'Detection already used this turn'
        }));
        return;
    }

    const detectingTeam = room.gameState.players[uuid].team;
    const visibilityInfo = getVisibleUnits(room.gameState, detectingTeam);
    const visibleCellsSet = new Set(visibilityInfo.visibleCells);

    // Get all enemy units that could be visible (in range) but are concealed
    const concealedUnits = room.gameState.units.filter(unit => {
        const isEnemy = unit.team !== detectingTeam;
        const isInRange = visibleCellsSet.has(`${unit.x},${unit.y}`);
        const hasConcealment = unit.effects?.some(
            effect => effect.name === 'Presence Concealment' &&
            effect.appliedAt + effect.duration > room.gameState.currentTurn
        );
        return isEnemy && isInRange && hasConcealment;
    });

    // Attempt detection for each concealed unit
    const detectionResults = concealedUnits.map(unit => {
        const concealmentEffect = unit.effects.find(e => e.name === 'Presence Concealment');
        const detectAttemptNumber = Math.floor(Math.random() * 100) + 1;
        const wasDetected = detectAttemptNumber <= concealmentEffect.chanceOfBeingDiscovered;

        return {
            unitId: unit.id,
            wasDetected,
            roll: detectAttemptNumber,
            threshold: concealmentEffect.chanceOfBeingDiscovered
        };
    });

    // Update units based on detection results
    room.gameState.units = room.gameState.units.map(unit => {
        const detectionResult = detectionResults.find(r => r.unitId === unit.id);
        if (detectionResult?.wasDetected) {
            return {
                ...unit,
                effects: unit.effects.filter(e => e.name !== 'Presence Concealment')
            };
        }
        return unit;
    });

    // Mark detection as used for this player
    room.gameState.detectionsThisTurn.push(uuid);

    // Send detection results to all players
    Object.entries(room.gameState.players).forEach(([playerId, playerInfo]) => {
        const connection = connections[playerId];
        if (connection) {
            connection.send(JSON.stringify({
                type: 'DETECTION_RESULTS',
                results: detectionResults,
                playerTeam: playerInfo.team
            }));
        }
    });

    broadcastToRoom(player.currentRoom);
    break;

          case 'USE_SKILL':
    // Validate the action
    const caster = room.gameState.units.find(u => u.id === message.casterId);
    if (!caster) return;

    // Update the entire game state including effects and HP changes
    room.gameState = {
        ...message.updatedGameState,
        units: message.updatedGameState.units.map(updatedUnit => {
            // Preserve skill cooldowns while updating unit state
            const existingUnit = room.gameState.units.find(u => u.id === updatedUnit.id);
            if (existingUnit) {
                return {
                    ...updatedUnit,
                    skills: existingUnit.skills.map(skill => {
                        if (skill.id === message.skillName && updatedUnit.id === message.casterId) {
                            return {
                                ...skill,
                                onCooldownUntil: message.newCooldownUntil
                            };
                        }
                        return skill;
                    })
                };
            }
            return updatedUnit;
        })
    };
    
    console.log('Updated game state after skill:', room.gameState); // Debug log
    broadcastToRoom(player.currentRoom);
    break;
      
      }
      
      broadcastToRoom(player.currentRoom)
      break
  }
}

const handleClose = (uuid) => {
  const player = playerStates[uuid]
  if (player && player.currentRoom) {
    const room = rooms[player.currentRoom]
    if (room) {
      delete room.gameState.players[uuid]
      if (Object.keys(room.gameState.players).length === 0) {
        delete rooms[player.currentRoom]
      } else {
        broadcastToRoom(player.currentRoom)
      }
    }
  }
  delete connections[uuid]
  delete playerStates[uuid]
}

const calculateVisibleCells = (unit, gridSize = 11) => {
  const visibleCells = new Set();
  const visionRange = unit.visionRange || 3; // Default vision of 3 if not specified

  // Calculate Manhattan distance for vision
  for (let x = Math.max(0, unit.x - visionRange); x <= Math.min(gridSize - 1, unit.x + visionRange); x++) {
      for (let y = Math.max(0, unit.y - visionRange); y <= Math.min(gridSize - 1, unit.y + visionRange); y++) {
          const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
          if (distance <= visionRange) {
              visibleCells.add(`${x},${y}`);
          }
      }
  }
  return visibleCells;
};

// Update the getVisibleUnits function in server.js to handle True Sight
const getVisibleUnits = (gameState, playerTeam) => {
  // Get all cells visible to the player's units and check for True Sight
  const visibleCells = new Set();
  const unitsWithTrueSight = new Set();
  
  gameState.units
      .filter(unit => unit.team === playerTeam)
      .forEach(unit => {
          const unitVisibleCells = calculateVisibleCells(unit);
          unitVisibleCells.forEach(cell => visibleCells.add(cell));
          
          // Check if unit has True Sight
          if (unit.effects?.some(effect => 
              effect.name === 'True Sight' && 
              effect.appliedAt + effect.duration > gameState.currentTurn
          )) {
              unitsWithTrueSight.add(unit.id);
          }
      });

  // Filter units based on visibility and concealment
  const filteredUnits = gameState.units.map(unit => {
      const isVisible = visibleCells.has(`${unit.x},${unit.y}`);
      const isAlly = unit.team === playerTeam;
      const hasConcealment = unit.effects?.some(
          effect => effect.name === 'Presence Concealment' && 
          effect.appliedAt + effect.duration > gameState.currentTurn
      );
      
      // Always show allied units
      if (isAlly) return unit;

      // If unit is not in visible range, don't show it
      if (!isVisible) return null;

      // If unit has concealment but there's a unit with True Sight that can see it, show it
      if (hasConcealment && unitsWithTrueSight.size > 0) {
          return unit;
      }

      // If unit has concealment and no True Sight can see it, hide it
      if (hasConcealment) {
          return null;
      }

      // Show visible enemies without concealment
      return unit;
  }).filter(Boolean);

  return {
      units: filteredUnits,
      visibleCells: Array.from(visibleCells)
  };
};



const broadcastToRoom = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  Object.entries(room.gameState.players).forEach(([playerId, playerInfo]) => {
      const connection = connections[playerId];
      if (connection) {
          const { units, visibleCells } = getVisibleUnits(room.gameState, playerInfo.team);
          
          connection.send(JSON.stringify({
              type: 'GAME_STATE_UPDATE',
              gameState: {
                  ...room.gameState,
                  units,
                  visibleCells
              }
          }));
      }
  });
};

wsServer.on("connection", (connection, request) => {
  const { username } = url.parse(request.url, true).query
  const uuid = uuidv4()
  
  connections[uuid] = connection
  playerStates[uuid] = {
    username,
    currentRoom: null
  }

  connection.on("message", (message) => handleMessage(message, uuid))
  connection.on("close", () => handleClose(uuid))
})

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`)
})