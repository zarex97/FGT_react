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
            players: {}
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

        case 'END_TURN':
          room.gameState.units = message.updatedUnits
          room.gameState.turn = message.nextTurn
          break

        case 'USE_SKILL':
            // Validate the action
            const caster = room.gameState.units.find(u => u.id === message.casterId);
            if (!caster) return;

            // Update game state with the skill results
            room.gameState = message.updatedGameState;
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

const broadcastToRoom = (roomId) => {
  const room = rooms[roomId]
  if (!room) return

  Object.entries(room.gameState.players).forEach(([playerId, _]) => {
    const connection = connections[playerId]
    if (connection) {
      connection.send(JSON.stringify({
        type: 'GAME_STATE_UPDATE',
        gameState: room.gameState
      }))
    }
  })
}

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