import { TargetingType } from '../targeting/TargetingTypes';
import { TargetingLogic } from '../targeting/TargetingLogic';


// Skill implementations repository
export const SkillImplementations = {
    "Mahalapraya": {
        name: "Mahalapraya",
        description: "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
        cooldown: 5,
        range: 6,
        microActions: [{
            targetingType: TargetingType.AOE_FROM_POINT,
            range: 6,
            dimensions: { width: 7, height: 7 },
            getAffectedCells: (caster, targetX, targetY, gridSize) => {
                const affectedCells = new Set();
                const halfWidth = 3; // (7-1)/2
                const halfHeight = 3;

                // Check if target point is within skill range from caster
                const distanceToTarget = Math.abs(caster.x - targetX) + Math.abs(caster.y - targetY);
                if (distanceToTarget <= 6) {
                    // Add all cells in the area
                    for (let x = targetX - halfWidth; x <= targetX + halfWidth; x++) {
                        for (let y = targetY - halfHeight; y <= targetY + halfHeight; y++) {
                            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                                affectedCells.add(`${x},${y}`);
                            }
                        }
                    }
                }
                return affectedCells;
            },
            execute: (gameState, caster, affectedCells) => {
                const updatedUnits = gameState.units.map(unit => {
                    if (unit.team !== caster.team && 
                        affectedCells.has(`${unit.x},${unit.y}`)) {
                        return {
                            ...unit,
                            hp: Math.max(0, unit.hp - (5 * caster.atk)),
                            effects: [...(unit.effects || []), {
                                name: 'uwu',
                                duration: 7,
                                appliedAt: gameState.currentTurn
                            }]
                        };
                    }
                    return unit;
                });

                return {
                    ...gameState,
                    units: updatedUnits
                };
            }
        }]
    },
    // Add more skills here
};

// Utility functions to work with skills
export const getSkillImplementation = (skillId) => {
    return SkillImplementations[skillId];
};

export const isSkillOnCooldown = (skillRef, currentTurn) => {
    return currentTurn < skillRef.onCooldownUntil;
};

export const executeSkill = (skillRef, gameState, caster, targetX, targetY) => {
    const skillImpl = getSkillImplementation(skillRef.id);
    
    if (!skillImpl) {
        console.error(`No implementation found for skill: ${skillRef.id}`);
        return { success: false, message: 'Skill not found' };
    }

    if (isSkillOnCooldown(skillRef, gameState.currentTurn)) {
        return { success: false, message: 'Skill is on cooldown' };
    }

    let updatedGameState = { ...gameState };
    
    for (const microAction of skillImpl.microActions) {
        const affectedCells = microAction.getAffectedCells(caster, targetX, targetY, 11);
        updatedGameState = microAction.execute(updatedGameState, caster, affectedCells);
    }

    // Update cooldown in the reference
    skillRef.onCooldownUntil = gameState.currentTurn + skillImpl.cooldown;

    return {
        success: true,
        message: `${skillImpl.name} executed successfully`,
        updatedGameState
    };
};