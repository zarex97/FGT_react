import { TargetingType } from '../targeting/TargetingTypes';

export class TargetingLogic {
    static calculateChebyshevDistance(x1, y1, x2, y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    static isCornerCell(originX, originY, cellX, cellY, range) {
        const xDiff = Math.abs(cellX - originX);
        const yDiff = Math.abs(cellY - originY);
        
        return (
            (xDiff === range && Math.abs(yDiff) > 1) ||
            (yDiff === range && Math.abs(xDiff) > 1)
        );
    }

    static getAffectedCells(params) {
        const {
            targetingType,
            casterX,
            casterY,
            range,
            targetX,
            targetY,
            applyCornerRule,
            gridSize = 11,  // Default grid size
            dimensions     // For AOE_FROM_POINT, e.g., { width: 7, height: 7 }
        } = params;

        const affectedCells = new Set();

        switch (targetingType) {
            case TargetingType.SELF:
                // Only affect the caster's position
                affectedCells.add(`${casterX},${casterY}`);
                break;

            case TargetingType.SINGLE_TARGET:
                if (targetX !== undefined && targetY !== undefined) {
                    const distance = this.calculateChebyshevDistance(casterX, casterY, targetX, targetY);
                    if (distance <= range) {
                        affectedCells.add(`${targetX},${targetY}`);
                    }
                }
                break;

            case TargetingType.AOE_AROUND_SELF:
                for (let x = Math.max(0, casterX - range); x <= Math.min(gridSize - 1, casterX + range); x++) {
                    for (let y = Math.max(0, casterY - range); y <= Math.min(gridSize - 1, casterY + range); y++) {
                        const distance = this.calculateChebyshevDistance(casterX, casterY, x, y);
                        if (distance <= range) {
                            if (!applyCornerRule || !this.isCornerCell(casterX, casterY, x, y, range)) {
                                affectedCells.add(`${x},${y}`);
                            }
                        }
                    }
                }
                break;

            case TargetingType.AOE_CARDINAL_DIRECTION:
                if (targetX !== undefined && targetY !== undefined) {
                    const halfWidth = Math.floor((range + 1) / 2);
                    // Determine direction
                    const dx = Math.sign(targetX - casterX);
                    const dy = Math.sign(targetY - casterY);
                    
                    if (dx !== 0) { // Horizontal
                        const x = casterX + (dx * range);
                        for (let y = casterY - halfWidth; y <= casterY + halfWidth; y++) {
                            if (y >= 0 && y < gridSize && x >= 0 && x < gridSize) {
                                affectedCells.add(`${x},${y}`);
                            }
                        }
                    } else if (dy !== 0) { // Vertical
                        const y = casterY + (dy * range);
                        for (let x = casterX - halfWidth; x <= casterX + halfWidth; x++) {
                            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                                affectedCells.add(`${x},${y}`);
                            }
                        }
                    }
                }
                break;

            case TargetingType.AOE_FROM_POINT:
                if (targetX !== undefined && targetY !== undefined && dimensions) {
                    const { width, height } = dimensions;
                    const halfWidth = Math.floor(width / 2);
                    const halfHeight = Math.floor(height / 2);

                    // Check if target point is within skill range
                    const distanceToTarget = this.calculateChebyshevDistance(casterX, casterY, targetX, targetY);
                    if (distanceToTarget <= range) {
                        // Add all cells in the area
                        for (let x = targetX - halfWidth; x <= targetX + halfWidth; x++) {
                            for (let y = targetY - halfHeight; y <= targetY + halfHeight; y++) {
                                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                                    if (!applyCornerRule || !this.isCornerCell(targetX, targetY, x, y, Math.max(halfWidth, halfHeight))) {
                                        affectedCells.add(`${x},${y}`);
                                    }
                                }
                            }
                        }
                    }
                }
                break;

                case TargetingType.AOE_FROM_POINT_WITHIN_RANGE:
                if (targetX !== undefined && targetY !== undefined && dimensions) {
                    const { width, height } = dimensions;
                    const halfWidth = Math.floor(width / 2);
                    const halfHeight = Math.floor(height / 2);

                    // Check if target point is within skill range
                    const distanceToTarget = this.calculateChebyshevDistance(casterX, casterY, targetX, targetY);
                    if (distanceToTarget <= range) {
                        // Add cells in the area that are within range of caster
                        for (let x = targetX - halfWidth; x <= targetX + halfWidth; x++) {
                            for (let y = targetY - halfHeight; y <= targetY + halfHeight; y++) {
                                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                                    const distanceToCaster = this.calculateChebyshevDistance(casterX, casterY, x, y);
                                    if (distanceToCaster <= range) { // Key difference: check distance to caster
                                        if (!applyCornerRule || !this.isCornerCell(targetX, targetY, x, y, Math.max(halfWidth, halfHeight))) {
                                            affectedCells.add(`${x},${y}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                break;
        }

        return affectedCells;
    }
}