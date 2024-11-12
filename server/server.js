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
  const room = rooms[player.currentRoom];
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
          break;

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
      const caster = room.gameState.units.find(u => u.id === message.casterId);
      if (!caster) return;
      const skillName = message.skillName;
      const casterId = message.casterId;
      const newCooldownUntil = message.newCooldownUntil;
      
      room.gameState = {
          ...message.updatedGameState,
          units: message.updatedGameState.units.map(updatedUnit => {
              if (updatedUnit.id === casterId) {
                  return {
                      ...updatedUnit,
                      skills: updatedUnit.skills.map(skill => {
                          if (skill.id === skillName) {
                              return {
                                  ...skill,
                                  onCooldownUntil: newCooldownUntil
                              };
                          }
                          return skill;
                      })
                  };
              }
              return updatedUnit;
          })
      };
      
      console.log('Updated game state after skill:', room.gameState);
      broadcastToRoom(player.currentRoom);
      break;

      case 'START_COMBAT':
        if (!player.currentRoom || !room) return;
            const { attackerId, defenderId, attackType, attackData } = message;
            const room = rooms[player.currentRoom];
            
            // Initialize combat state
            room.currentCombat = {
                attacker: room.gameState.units.find(u => u.id === attackerId),
                defender: room.gameState.units.find(u => u.id === defenderId),
                attackType,
                attackData,
                phase: 'DEFENDER_CHOICE',
                isCounter: message.isCounter || false
            };

            // Broadcast combat start to all players
            broadcastToRoom(player.currentRoom, {
                type: 'COMBAT_UPDATE',
                combat: room.currentCombat
            });
            break;

        case 'COMBAT_CHOICE':
            const combatRoom = rooms[player.currentRoom];
            if (!combatRoom.currentCombat) return;

            const { choice } = message;
            processCombatChoice(combatRoom, choice, (updatedGameState) => {
                // Update game state with combat results
                combatRoom.gameState = updatedGameState;
                
                // Broadcast updated state
                broadcastToRoom(player.currentRoom, {
                    type: 'COMBAT_RESOLUTION',
                    gameState: updatedGameState,
                    combatResults: combatRoom.currentCombat.results
                });

                // Clean up combat state if combat is finished
                if (combatRoom.currentCombat.phase === 'COMPLETED') {
                    delete combatRoom.currentCombat;
                }
            });
            break;

        case 'INITIATE_COUNTER':
            const counterRoom = rooms[player.currentRoom];
            if (!counterRoom.currentCombat?.results) return;

            const { counterAction, counterTarget } = message;
            processCounterAttack(counterRoom, counterAction, counterTarget, (updatedGameState) => {
                counterRoom.gameState = updatedGameState;
                broadcastToRoom(player.currentRoom);
            });
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
        const distance = Math.max(Math.abs(unit.x - x), Math.abs(unit.y - y));
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


const processCombatChoice = (room, choice, callback) => {
  const combat = room.currentCombat;
  const { attacker, defender } = combat;

  switch (choice) {
      case 'defend':
          combat.damageMultiplier = 0.7;
          resolveCombatDamage(room, callback);
          break;

      case 'evade':
          handleEvasionAttempt(room, callback);
          break;

      case 'nothing':
          combat.damageMultiplier = 1;
          resolveCombatDamage(room, callback);
          break;
  }
};

const handleEvasionAttempt = (room, callback) => {
  const combat = room.currentCombat;
  const { attacker, defender } = combat;

  // Try agility evasion first
  const agilityDiff = defender.agility - attacker.agility;
  const agilityPenalty = agilityDiff >= 0 ? 0 : 4;
  const agilityRoll = Math.floor(Math.random() * 20) + 1;

  if ((agilityRoll - agilityPenalty) < defender.agility) {
      // Successful evasion
      combat.results = {
          evaded: true,
          type: 'agility',
          roll: agilityRoll
      };
      combat.phase = 'AWAITING_COUNTER';
      callback(room.gameState);
      return;
  }

  // Try luck evasion if agility failed
  const luckDiff = defender.luck - attacker.luck;
  const luckPenalty = luckDiff >= 0 ? 0 : 4;
  const luckRoll = Math.floor(Math.random() * 20) + 1;

  if ((luckRoll - luckPenalty) < defender.luck) {
      // Successful evasion
      combat.results = {
          evaded: true,
          type: 'luck',
          roll: luckRoll
      };
      combat.phase = 'AWAITING_COUNTER';
      callback(room.gameState);
      return;
  }

  // Failed to evade, resolve damage
  combat.damageMultiplier = 1;
  resolveCombatDamage(room, callback);
};

const resolveCombatDamage = (room, callback) => {
  const combat = room.currentCombat;
  const { attacker, defender } = combat;

  // Calculate base damage
  let damage = attacker.atk - defender.def;

  // Check for critical hit
  const critRoll = Math.floor(Math.random() * 100) + 1;
  const criticalHit = critRoll <= 50; // Base 50% chance

  if (criticalHit) {
      let critDamage = 0;
      for (let i = 0; i < 10; i++) {
          critDamage += Math.floor(Math.random() * 20) + 1;
      }
      damage += critDamage;
  }

  // Apply defender's choice multiplier
  damage = Math.floor(Math.max(0, damage * combat.damageMultiplier));

  // Update defender's HP
  const updatedGameState = {
      ...room.gameState,
      units: room.gameState.units.map(unit => {
          if (unit.id === defender.id) {
              const newHp = Math.max(0, unit.hp - damage);
              
              // Check for agility reduction
              let agilityReduction = 0;
              if (damage > 100) {
                  agilityReduction = Math.floor(Math.random() * 4) + 1; // 1d4
              }

              return {
                  ...unit,
                  hp: newHp,
                  agility: Math.max(0, unit.agility - agilityReduction)
              };
          }
          return unit;
      })
  };

  // Store combat results
  combat.results = {
      damage,
      criticalHit,
      defenderAlive: defender.hp > 0,
      agilityReduction: damage > 100 ? agilityReduction : 0
  };

  combat.phase = 'AWAITING_COUNTER';
  callback(updatedGameState);
};

const processCounterAttack = (room, counterAction, counterTarget, callback) => {
  // Validate counter attack
  if (!validateCounterAttack(room, counterAction, counterTarget)) {
      return;
  }

  // Start new combat as counter attack
  room.currentCombat = {
      attacker: room.currentCombat.defender,
      defender: room.currentCombat.attacker,
      attackType: counterAction.type,
      attackData: counterAction,
      phase: 'DEFENDER_CHOICE',
      isCounter: true
  };

  callback(room.gameState);
};


const validateCounterAttack = (room, action, target) => {
  const combat = room.currentCombat;
  
  // Must target original attacker
  if (target.id !== combat.attacker.id) return false;

  // Action must be an attack
  if (action.type === 'skill' && !action.isAttack) return false;

  return true;
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