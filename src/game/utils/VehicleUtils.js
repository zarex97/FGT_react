// src/game/utils/VehicleUtils.js

export const VehicleUtils = {
  // Generate all cells that this vehicle occupies
  generateBoardCells: (dimensions, x, y, z) => {
    const cells = [];
    for (let dx = 0; dx < dimensions.width; dx++) {
      for (let dy = 0; dy < dimensions.height; dy++) {
        cells.push({
          x: x + dx,
          y: y + dy,
          z: z,
          relativeX: dx,
          relativeY: dy,
          isFloor: true, // Vehicle creates floor terrain
        });
      }
    }
    return cells;
  },

  // Check if a position is within vehicle boundaries
  isPositionInVehicle: (vehicle, x, y, z) => {
    // Add defensive check for vehicle and boardCells
    if (!vehicle || !vehicle.isVehicle) {
      return false;
    }

    // If boardCells doesn't exist, generate it
    if (!vehicle.boardCells && vehicle.dimensions) {
      vehicle.boardCells = VehicleUtils.generateBoardCells(
        vehicle.dimensions,
        vehicle.x,
        vehicle.y,
        vehicle.z
      );
    }

    // If still no boardCells, fall back to dimension-based check
    if (!vehicle.boardCells) {
      return (
        x >= vehicle.x &&
        x < vehicle.x + (vehicle.dimensions?.width || 1) &&
        y >= vehicle.y &&
        y < vehicle.y + (vehicle.dimensions?.height || 1) &&
        z === vehicle.z
      );
    }

    return vehicle.boardCells.some(
      (cell) => cell.x === x && cell.y === y && cell.z === z
    );
  },

  // Convert world coordinates to vehicle relative coordinates
  worldToRelative: (vehicle, worldX, worldY) => {
    const relativeX = worldX - vehicle.x;
    const relativeY = worldY - vehicle.y;

    // Check if position is within vehicle bounds
    if (
      relativeX >= 0 &&
      relativeX < vehicle.dimensions.width &&
      relativeY >= 0 &&
      relativeY < vehicle.dimensions.height
    ) {
      return { x: relativeX, y: relativeY };
    }
    return null;
  },

  // Convert vehicle relative coordinates to world coordinates
  relativeToWorld: (vehicle, relativeX, relativeY) => {
    return {
      x: vehicle.x + relativeX,
      y: vehicle.y + relativeY,
      z: vehicle.z,
    };
  },

  // Move vehicle and all contained units
  moveVehicle: (vehicle, newX, newY, newZ, gameState) => {
    const deltaX = newX - vehicle.x;
    const deltaY = newY - vehicle.y;
    const deltaZ = newZ - vehicle.z;

    // Update vehicle position
    const updatedVehicle = {
      ...vehicle,
      x: newX,
      y: newY,
      z: newZ,
      boardCells: VehicleUtils.generateBoardCells(
        vehicle.dimensions,
        newX,
        newY,
        newZ
      ),
    };

    // Update all contained units
    const updatedUnits = gameState.units.map((unit) => {
      if (vehicle.containedUnits.includes(unit.id)) {
        return {
          ...unit,
          x: unit.x + deltaX,
          y: unit.y + deltaY,
          z: unit.z + deltaZ,
        };
      }
      return unit;
    });

    return {
      updatedVehicle,
      updatedGameState: {
        ...gameState,
        units: updatedUnits.map((unit) =>
          unit.id === vehicle.id ? updatedVehicle : unit
        ),
      },
    };
  },

  // Board a unit onto a vehicle
  boardUnit: (vehicle, unit, relativeX, relativeY) => {
    const worldPos = VehicleUtils.relativeToWorld(
      vehicle,
      relativeX,
      relativeY
    );

    const updatedVehicle = {
      ...vehicle,
      containedUnits: [...vehicle.containedUnits, unit.id],
    };

    const updatedUnit = {
      ...unit,
      x: worldPos.x,
      y: worldPos.y,
      z: worldPos.z,
      aboardVehicle: vehicle.id,
      vehicleRelativePosition: { x: relativeX, y: relativeY },
    };

    return { updatedVehicle, updatedUnit };
  },

  // Disembark a unit from a vehicle
  disembarkUnit: (vehicle, unit, targetX, targetY, targetZ) => {
    const updatedVehicle = {
      ...vehicle,
      containedUnits: vehicle.containedUnits.filter((id) => id !== unit.id),
    };

    const updatedUnit = {
      ...unit,
      x: targetX,
      y: targetY,
      z: targetZ,
      aboardVehicle: null,
      vehicleRelativePosition: null,
    };

    return { updatedVehicle, updatedUnit };
  },

  // Find vehicle at a specific position
  findVehicleAtPosition: (gameState, x, y, z) => {
    if (!gameState || !gameState.units) {
      return null;
    }

    return gameState.units.find((unit) => {
      if (!unit || !unit.isVehicle) {
        return false;
      }
      return VehicleUtils.isPositionInVehicle(unit, x, y, z);
    });
  },

  // Get all valid positions around a vehicle for disembarking
  getDisembarkPositions: (vehicle, gameState, gridSize = 11) => {
    const positions = [];
    const cells = vehicle.boardCells;

    // Check all cells around the vehicle perimeter
    cells.forEach((cell) => {
      const adjacentPositions = [
        { x: cell.x - 1, y: cell.y, z: cell.z },
        { x: cell.x + 1, y: cell.y, z: cell.z },
        { x: cell.x, y: cell.y - 1, z: cell.z },
        { x: cell.x, y: cell.y + 1, z: cell.z },
      ];

      adjacentPositions.forEach((pos) => {
        // Check if position is valid and not occupied
        if (
          pos.x >= 0 &&
          pos.x < gridSize &&
          pos.y >= 0 &&
          pos.y < gridSize &&
          !VehicleUtils.isPositionInVehicle(vehicle, pos.x, pos.y, pos.z) &&
          !VehicleUtils.isPositionOccupied(gameState, pos.x, pos.y, pos.z)
        ) {
          // Avoid duplicates
          if (
            !positions.some(
              (p) => p.x === pos.x && p.y === pos.y && p.z === pos.z
            )
          ) {
            positions.push(pos);
          }
        }
      });
    });

    return positions;
  },

  // Check if a position is occupied by any unit or vehicle
  isPositionOccupied: (gameState, x, y, z) => {
    if (!gameState || !gameState.units) {
      return false;
    }

    return gameState.units.some((unit) => {
      if (!unit) return false;

      if (unit.isVehicle) {
        return VehicleUtils.isPositionInVehicle(unit, x, y, z);
      } else {
        return unit.x === x && unit.y === y && unit.z === z;
      }
    });
  },

  // Get possible moves for a vehicle (similar to unit movement but considering vehicle size)
  getPossibleVehicleMoves: (vehicle, gameState, gridSize = 11) => {
    const moves = [];
    const range = vehicle.movementLeft;

    for (let x = 0; x < gridSize - vehicle.dimensions.width + 1; x++) {
      for (let y = 0; y < gridSize - vehicle.dimensions.height + 1; y++) {
        const distance = calculateDistance(vehicle.x, vehicle.y, x, y);
        if (distance <= range && distance > 0) {
          // Check if all cells of the vehicle would be valid at new position
          const wouldBeValid = VehicleUtils.canVehicleMoveTo(
            vehicle,
            x,
            y,
            vehicle.z,
            gameState,
            gridSize
          );
          if (wouldBeValid) {
            moves.push({ x, y, z: vehicle.z, distance });
          }
        }
      }
    }

    return moves;
  },

  // Check if vehicle can move to a position
  canVehicleMoveTo: (vehicle, newX, newY, newZ, gameState, gridSize = 11) => {
    // Add defensive checks
    if (!vehicle || !vehicle.dimensions) {
      console.warn("Invalid vehicle object passed to canVehicleMoveTo");
      return false;
    }

    // Check bounds
    if (
      newX < 0 ||
      newY < 0 ||
      newX + vehicle.dimensions.width > gridSize ||
      newY + vehicle.dimensions.height > gridSize
    ) {
      return false;
    }

    // Check if all cells would be valid
    for (let dx = 0; dx < vehicle.dimensions.width; dx++) {
      for (let dy = 0; dy < vehicle.dimensions.height; dy++) {
        const checkX = newX + dx;
        const checkY = newY + dy;

        // Skip checking current vehicle position (only if vehicle has an ID)
        if (
          vehicle.id &&
          VehicleUtils.isPositionInVehicle(vehicle, checkX, checkY, newZ)
        ) {
          continue;
        }

        // Check if position would be occupied by another unit/vehicle
        if (VehicleUtils.isPositionOccupied(gameState, checkX, checkY, newZ)) {
          return false;
        }

        // Check terrain validity (if terrain system exists)
        const terrainCell = gameState.terrain?.[newZ]?.[checkX]?.[checkY];
        if (terrainCell && !terrainCell.isFloor) {
          return false;
        }
      }
    }

    return true;
  },

  // Update vehicle terrain effects on the game state
  applyVehicleTerrainEffects: (gameState) => {
    const updatedTerrain = { ...gameState.terrain };

    // Reset vehicle terrain effects
    Object.keys(updatedTerrain).forEach((z) => {
      Object.keys(updatedTerrain[z]).forEach((x) => {
        Object.keys(updatedTerrain[z][x]).forEach((y) => {
          const cell = updatedTerrain[z][x][y];
          if (cell.vehicleId) {
            // Remove previous vehicle effects
            delete cell.vehicleId;
            delete cell.isVehicleFloor;
          }
        });
      });
    });

    // Apply current vehicle effects
    gameState.units
      .filter((unit) => unit.isVehicle)
      .forEach((vehicle) => {
        vehicle.boardCells.forEach((boardCell) => {
          const terrainCell =
            updatedTerrain?.[boardCell.z]?.[boardCell.x]?.[boardCell.y];
          if (terrainCell) {
            terrainCell.vehicleId = vehicle.id;
            terrainCell.isVehicleFloor = true;
            terrainCell.isFloor = true; // Vehicle creates floor
          }
        });
      });

    return {
      ...gameState,
      terrain: updatedTerrain,
    };
  },

  // Get units that are aboard a specific vehicle
  getUnitsAboard: (vehicle, gameState) => {
    return gameState.units.filter((unit) =>
      vehicle.containedUnits.includes(unit.id)
    );
  },

  // Validate vehicle template
  validateVehicleTemplate: (template) => {
    const required = ["name", "dimensions", "hp", "movementRange"];
    const missing = required.filter((prop) => !(prop in template));

    if (missing.length > 0) {
      throw new Error(
        `Vehicle template missing required properties: ${missing.join(", ")}`
      );
    }

    if (!template.dimensions.width || !template.dimensions.height) {
      throw new Error("Vehicle dimensions must have width and height");
    }

    return true;
  },
};

// Helper function for distance calculation if not already available
const calculateDistance = (x1, y1, x2, y2) => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

export default VehicleUtils;
