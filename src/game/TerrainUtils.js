// TerrainUtils.js - Utility functions for terrain and height management

export class TerrainUtils {
  static getTerrainEffectDescription(terrainType) {
    switch (terrainType) {
      case "fire":
        return "Burn: Units take 2 damage per turn for 3 turns";
      case "ice":
        return "Slow: Movement reduced by 1 for 2 turns";
      case "healing":
        return "Regeneration: Heals 3 HP per turn for 2 turns";
      case "elevator":
        return "Elevator: Use to change height levels";
      default:
        return "Normal terrain";
    }
  }

  static getTerrainColor(terrainType) {
    switch (terrainType) {
      case "fire":
        return "#FEE2E2"; // bg-red-100 equivalent
      case "ice":
        return "#DBEAFE"; // bg-blue-100 equivalent
      case "healing":
        return "#DCFCE7"; // bg-green-100 equivalent
      case "elevator":
        return "#FEF3C7"; // bg-yellow-100 equivalent
      default:
        return "#F0FDF4"; // bg-green-50 equivalent
    }
  }

  static getTerrainIcon(terrainType) {
    switch (terrainType) {
      case "fire":
        return "🔥";
      case "ice":
        return "❄️";
      case "healing":
        return "💚";
      case "elevator":
        return "🔺🔻";
      default:
        return "";
    }
  }

  static canUnitMoveToCell(
    unit,
    targetX,
    targetY,
    targetZ,
    terrain,
    gameState
  ) {
    // Check if target cell exists and has floor
    const targetCell = terrain?.[targetZ]?.[targetX]?.[targetY];
    if (!targetCell || !targetCell.isFloor) {
      return { canMove: false, reason: "No floor at target location" };
    }

    // Check if another unit is already there
    const occupyingUnit = gameState.units.find(
      (u) =>
        u.x === targetX &&
        u.y === targetY &&
        u.z === targetZ &&
        u.id !== unit.id
    );
    if (occupyingUnit) {
      return { canMove: false, reason: "Cell occupied by another unit" };
    }

    // Check movement range (only for same height moves)
    if (targetZ === unit.z) {
      const distance = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
      if (distance > unit.movementLeft) {
        return { canMove: false, reason: "Target is too far" };
      }
    }

    // Check height change restrictions
    if (targetZ !== unit.z) {
      const currentCell = terrain?.[unit.z]?.[unit.x]?.[unit.y];
      if (!currentCell || currentCell.terrainType !== "elevator") {
        return {
          canMove: false,
          reason: "Can only change height from elevator",
        };
      }

      // Validate height change rules
      if (targetZ > unit.z) {
        // Going up - check for valid floor space within 1 cell distance
        let hasValidSpace = false;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const checkX = unit.x + dx;
            const checkY = unit.y + dy;
            const checkCell = terrain?.[targetZ]?.[checkX]?.[checkY];
            if (checkCell && checkCell.isFloor) {
              hasValidSpace = true;
              break;
            }
          }
          if (hasValidSpace) break;
        }
        if (!hasValidSpace) {
          return { canMove: false, reason: "No valid floor space above" };
        }
      } else {
        // Going down - check if target level has floor at same position
        if (!targetCell.isFloor) {
          return { canMove: false, reason: "No floor below" };
        }
      }
    }

    return { canMove: true, reason: "Move is valid" };
  }

  static getHeightTransitionOptions(unit, terrain, maxHeight = 3) {
    const currentCell = terrain?.[unit.z]?.[unit.x]?.[unit.y];
    if (!currentCell || currentCell.terrainType !== "elevator") {
      return [];
    }

    const options = [];
    for (let z = 1; z <= maxHeight; z++) {
      if (z !== unit.z) {
        const moveCheck = this.canUnitMoveToCell(
          unit,
          unit.x,
          unit.y,
          z,
          terrain,
          { units: [] }
        );
        if (moveCheck.canMove) {
          options.push({
            height: z,
            direction: z > unit.z ? "up" : "down",
            description: `Height ${z}${z > unit.z ? " (Up)" : " (Down)"}`,
          });
        }
      }
    }
    return options;
  }

  static applyTerrainEffectsToUnit(unit, terrain, currentTurn) {
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
        const effectToApply = {
          ...terrainEffect,
          appliedAt: currentTurn,
          source: "terrain",
        };

        switch (terrainEffect.type) {
          case "DamageOverTime":
          case "HealOverTime":
            newEffects.push(effectToApply);
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
            break;
        }
      }
    });

    updatedUnit.effects = newEffects;
    return updatedUnit;
  }

  static processOngoingTerrainEffects(unit, currentTurn) {
    if (!unit.effects || unit.effects.length === 0) return unit;

    const updatedUnit = { ...unit };
    let hpChanged = false;

    // Process damage over time and healing over time effects
    updatedUnit.effects.forEach((effect) => {
      if (
        effect.source === "terrain" &&
        effect.appliedAt + effect.duration > currentTurn
      ) {
        switch (effect.type) {
          case "DamageOverTime":
            updatedUnit.hp = Math.max(0, updatedUnit.hp - effect.value);
            hpChanged = true;
            break;
          case "HealOverTime":
            const maxHp = updatedUnit.maxHp || 100;
            updatedUnit.hp = Math.min(maxHp, updatedUnit.hp + effect.value);
            hpChanged = true;
            break;
        }
      }
    });

    // Remove expired effects and restore movement for expired slow effects
    const activeEffects = [];
    let movementRestored = false;

    updatedUnit.effects.forEach((effect) => {
      if (effect.source === "terrain") {
        if (effect.appliedAt + effect.duration > currentTurn) {
          activeEffects.push(effect);
        } else if (effect.type === "MovementReduction") {
          // Restore movement when slow effect expires
          updatedUnit.movementRange += effect.value;
          updatedUnit.movementLeft = Math.min(
            updatedUnit.movementLeft + effect.value,
            updatedUnit.movementRange
          );
          movementRestored = true;
        }
      } else {
        activeEffects.push(effect);
      }
    });

    updatedUnit.effects = activeEffects;
    return updatedUnit;
  }

  static generateRandomTerrain(gridSize = 11, maxHeight = 3) {
    const terrain = {};

    for (let z = 1; z <= maxHeight; z++) {
      terrain[z] = {};
      for (let x = 0; x < gridSize; x++) {
        terrain[z][x] = {};
        for (let y = 0; y < gridSize; y++) {
          terrain[z][x][y] = {
            x,
            y,
            z,
            isFloor: z === 1, // Only height 1 has floor by default
            terrainType: this.getRandomTerrainType(x, y, z),
            terrainEffects: this.getTerrainEffects(
              this.getRandomTerrainType(x, y, z)
            ),
          };
        }
      }
    }

    // Add elevators
    this.addElevators(terrain, maxHeight);

    return terrain;
  }

  static getRandomTerrainType(x, y, z, seed = null) {
    // Use seed for deterministic generation if provided
    const random = seed
      ? this.seededRandom(seed + x * 100 + y * 10 + z)
      : Math.random();

    if (random < 0.05) return "elevator";
    if (random < 0.1) return "fire";
    if (random < 0.15) return "ice";
    if (random < 0.2) return "healing";
    return "normal";
  }

  static seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  static getTerrainEffects(terrainType) {
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
  }

  static addElevators(terrain, maxHeight) {
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
            terrain[z][pos.x][pos.y].isFloor = true;
          }
        }
      }
    });
  }

  static getVisibleCellsForUnit(unit, gridSize = 11, maxHeight = 3) {
    const visibleCells = new Set();
    const visionRange = unit.visionRange || 3;

    // Calculate vision on current height
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

          // Limited visibility to adjacent height levels
          if (unit.z > 1) {
            visibleCells.add(`${x},${y},${unit.z - 1}`);
          }
          if (unit.z < maxHeight) {
            visibleCells.add(`${x},${y},${unit.z + 1}`);
          }
        }
      }
    }

    return visibleCells;
  }

  static validateTerrainData(terrain) {
    const errors = [];

    if (!terrain || typeof terrain !== "object") {
      errors.push("Terrain data is missing or invalid");
      return errors;
    }

    Object.keys(terrain).forEach((z) => {
      const height = parseInt(z);
      if (!terrain[z] || typeof terrain[z] !== "object") {
        errors.push(`Height ${height} data is invalid`);
        return;
      }

      Object.keys(terrain[z]).forEach((x) => {
        const xPos = parseInt(x);
        if (!terrain[z][x] || typeof terrain[z][x] !== "object") {
          errors.push(`Height ${height}, X ${xPos} data is invalid`);
          return;
        }

        Object.keys(terrain[z][x]).forEach((y) => {
          const yPos = parseInt(y);
          const cell = terrain[z][x][y];

          if (!cell || typeof cell !== "object") {
            errors.push(`Cell at ${xPos},${yPos},${height} is invalid`);
            return;
          }

          // Validate required properties
          if (typeof cell.isFloor !== "boolean") {
            errors.push(
              `Cell at ${xPos},${yPos},${height} missing isFloor property`
            );
          }

          if (typeof cell.terrainType !== "string") {
            errors.push(
              `Cell at ${xPos},${yPos},${height} missing terrainType property`
            );
          }

          if (!Array.isArray(cell.terrainEffects)) {
            errors.push(
              `Cell at ${xPos},${yPos},${height} terrainEffects must be an array`
            );
          }
        });
      });
    });

    return errors;
  }
}
