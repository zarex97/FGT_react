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
    if (!vehicle || !vehicle.isVehicle) {
      return false;
    }

    if (!vehicle.boardCells && vehicle.dimensions) {
      vehicle.boardCells = VehicleUtils.generateBoardCells(
        vehicle.dimensions,
        vehicle.x,
        vehicle.y,
        vehicle.z
      );
    }

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

  // IMPROVED: Move vehicle and all contained units using relative positions
  moveVehicle: (vehicle, newX, newY, newZ, gameState) => {
    const deltaX = newX - vehicle.x;
    const deltaY = newY - vehicle.y;
    const deltaZ = newZ - vehicle.z;

    console.log(
      `🚤 Moving vehicle ${vehicle.name} by delta (${deltaX}, ${deltaY}, ${deltaZ})`
    );

    // Update vehicle position and board cells
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

    // Update all contained units using their relative positions
    const updatedUnits = gameState.units.map((unit) => {
      if (vehicle.containedUnits.includes(unit.id)) {
        // Use relative position if available, otherwise calculate from current position
        let newUnitPos;
        if (unit.vehicleRelativePosition) {
          newUnitPos = VehicleUtils.relativeToWorld(
            updatedVehicle,
            unit.vehicleRelativePosition.x,
            unit.vehicleRelativePosition.y
          );
        } else {
          // Fallback: maintain current relative position
          const currentRelative = VehicleUtils.worldToRelative(
            vehicle,
            unit.x,
            unit.y
          );
          if (currentRelative) {
            newUnitPos = VehicleUtils.relativeToWorld(
              updatedVehicle,
              currentRelative.x,
              currentRelative.y
            );
            // Update the relative position for future moves
            unit.vehicleRelativePosition = currentRelative;
          } else {
            // Emergency fallback: just move by delta
            newUnitPos = {
              x: unit.x + deltaX,
              y: unit.y + deltaY,
              z: unit.z + deltaZ,
            };
          }
        }

        console.log(
          `🚶 Moving contained unit ${unit.name || unit.id} to (${
            newUnitPos.x
          }, ${newUnitPos.y}, ${newUnitPos.z})`
        );

        return {
          ...unit,
          x: newUnitPos.x,
          y: newUnitPos.y,
          z: newUnitPos.z,
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

  // Board a unit onto a vehicle with proper validation
  boardUnit: (vehicle, unit, relativeX, relativeY) => {
    // Validate relative position
    if (
      relativeX < 0 ||
      relativeX >= vehicle.dimensions.width ||
      relativeY < 0 ||
      relativeY >= vehicle.dimensions.height
    ) {
      console.error(
        `Invalid relative position (${relativeX}, ${relativeY}) for vehicle dimensions ${vehicle.dimensions.width}x${vehicle.dimensions.height}`
      );
      return null;
    }

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

    console.log(
      `🚌 Unit ${unit.name || unit.id} boarded vehicle ${
        vehicle.name || vehicle.id
      } at relative position (${relativeX}, ${relativeY})`
    );

    return { updatedVehicle, updatedUnit };
  },

  // Board a unit automatically to the first available position
  boardUnitAuto: (vehicle, unit, gameState) => {
    // Find first available position
    for (let y = 0; y < vehicle.dimensions.height; y++) {
      for (let x = 0; x < vehicle.dimensions.width; x++) {
        // Check if this position is free
        const isOccupied = vehicle.containedUnits.some((containedUnitId) => {
          const containedUnit = gameState.units.find(
            (u) => u.id === containedUnitId
          );
          return (
            containedUnit?.vehicleRelativePosition?.x === x &&
            containedUnit?.vehicleRelativePosition?.y === y
          );
        });

        if (!isOccupied) {
          return VehicleUtils.boardUnit(vehicle, unit, x, y);
        }
      }
    }

    console.error(
      `No available positions on vehicle ${vehicle.name || vehicle.id}`
    );
    return null;
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

    console.log(
      `🚶 Unit ${unit.name || unit.id} disembarked from vehicle ${
        vehicle.name || vehicle.id
      }`
    );

    return { updatedVehicle, updatedUnit };
  },

  // Check if a unit can board a vehicle (team logic)
  canUnitBoardVehicle: (unit, vehicle, gameState) => {
    // Basic checks
    if (!vehicle.isVehicle) return false;
    if (unit.aboardVehicle) return false; // Already aboard another vehicle
    if (vehicle.containedUnits.length >= vehicle.maxPassengers) return false;

    // Team-based logic
    if (unit.team === vehicle.team) {
      // Allies can always board (subject to capacity)
      return true;
    } else {
      // Enemies might be able to board based on vehicle-specific logic
      // This could be implemented with trigger effects later
      return false;
    }
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
    const cells =
      vehicle.boardCells ||
      VehicleUtils.generateBoardCells(
        vehicle.dimensions,
        vehicle.x,
        vehicle.y,
        vehicle.z
      );

    // Check all cells around the vehicle perimeter
    cells.forEach((cell) => {
      const adjacentPositions = [
        { x: cell.x - 1, y: cell.y, z: cell.z },
        { x: cell.x + 1, y: cell.y, z: cell.z },
        { x: cell.x, y: cell.y - 1, z: cell.z },
        { x: cell.x, y: cell.y + 1, z: cell.z },
      ];

      adjacentPositions.forEach((pos) => {
        if (
          pos.x >= 0 &&
          pos.x < gridSize &&
          pos.y >= 0 &&
          pos.y < gridSize
          // &&
          // !VehicleUtils.isPositionInVehicle(vehicle, pos.x, pos.y, pos.z) &&
          // !VehicleUtils.isPositionOccupied(gameState, pos.x, pos.y, pos.z)
        ) {
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
      // Skip units that are aboard vehicles (they don't block ground positions)
      if (unit.aboardVehicle) return false;
      return VehicleUtils.doesUnitOccupyPosition(unit, x, y, z);
    });
  },

  // Get possible moves for a vehicle
  getPossibleVehicleMoves: (vehicle, gameState, gridSize = 11) => {
    const moves = [];
    const range = vehicle.movementLeft;

    for (let x = 0; x < gridSize - vehicle.dimensions.width + 1; x++) {
      for (let y = 0; y < gridSize - vehicle.dimensions.height + 1; y++) {
        const distance = calculateDistance(vehicle.x, vehicle.y, x, y);
        if (distance <= range && distance > 0) {
          if (
            VehicleUtils.canVehicleMoveTo(
              vehicle,
              x,
              y,
              vehicle.z,
              gameState,
              gridSize
            )
          ) {
            moves.push({ x, y, z: vehicle.z, distance });
          }
        }
      }
    }

    return moves;
  },

  // Check if vehicle can move to a position
  canVehicleMoveTo: (vehicle, newX, newY, newZ, gameState, gridSize = 11) => {
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

        // Skip checking current vehicle position
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

        // Check terrain validity
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
        const boardCells =
          vehicle.boardCells ||
          VehicleUtils.generateBoardCells(
            vehicle.dimensions,
            vehicle.x,
            vehicle.y,
            vehicle.z
          );
        boardCells.forEach((boardCell) => {
          const terrainCell =
            updatedTerrain?.[boardCell.z]?.[boardCell.x]?.[boardCell.y];
          if (terrainCell) {
            terrainCell.vehicleId = vehicle.id;
            terrainCell.isVehicleFloor = true;
            terrainCell.isFloor = true;
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

  // Check if a unit occupies a specific position
  doesUnitOccupyPosition: (unit, x, y, z) => {
    if (!unit) return false;

    if (!unit.isBiggerThanOneCell) {
      return unit.x === x && unit.y === y && unit.z === z;
    } else {
      if (unit.boardCells && Array.isArray(unit.boardCells)) {
        return unit.boardCells.some(
          (cell) => cell.x === x && cell.y === y && cell.z === z
        );
      } else if (unit.isVehicle) {
        return VehicleUtils.isPositionInVehicle(unit, x, y, z);
      }
    }

    return false;
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

// Helper function for distance calculation
const calculateDistance = (x1, y1, x2, y2) => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

export default VehicleUtils;
