// src/game/skills/registry.js
import { MicroAction } from '../MicroAction';
import { TargetingLogic } from '../targeting/TargetingLogic';
import { TargetingType } from '../targeting/TargetingTypes';
import { Skill } from '../Skill';

// Create the MicroAction instances first
const mahalaprayaMicroAction = new MicroAction({
    targetingType: TargetingType.AOE_FROM_POINT,
    range: 6,
    dimensions: { width: 7, height: 7 },
    applyCornerRule: false,
    effectLogic: (gameState, caster, affectedCells) => {
        console.log('Executing Mahalapraya MicroAction:', {
            caster,
            affectedCellsCount: affectedCells.size,
            currentGameState: gameState
        });

        const updatedUnits = gameState.units.map(unit => {
            if (unit.team !== caster.team && 
                affectedCells.has(`${unit.x},${unit.y}`)) {
                
                // Calculate new HP
                const newHp = Math.max(0, unit.hp - (5 * caster.atk));
                
                // Ensure effects array exists and add new effect
                const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
                const newEffect = {
                    name: 'uwu',
                    duration: 7,
                    appliedAt: gameState.currentTurn,
                    description: 'Under the effect of Mahalapraya'
                };

                console.log('Applying effect to unit:', {
                    unitName: unit.name,
                    oldHp: unit.hp,
                    newHp,
                    newEffect
                });

                return {
                    ...unit,
                    hp: newHp,
                    effects: [...currentEffects, newEffect]
                };
            }
            return unit;
        });

        const newGameState = {
            ...gameState,
            units: updatedUnits
        };

        console.log('MicroAction execution result:', {
            updatedUnitsCount: updatedUnits.length,
            affectedUnits: updatedUnits.filter(u => u.effects?.some(e => e.name === 'uwu'))
        });

        return newGameState;
    }
});

// Create Skill instances using our Skill class
const mahalapraya = new Skill(
    "Mahalapraya",
    "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
    5, // cooldown
    6, // range
    [mahalaprayaMicroAction]
);

// Export the skill implementations using our class instances
export const SkillImplementations = {
    "Mahalapraya": mahalapraya
};

export const getSkillImplementation = (skillId) => {
    return SkillImplementations[skillId];
};

export const isSkillOnCooldown = (skillRef, currentTurn) => {
    if (!skillRef || typeof skillRef.onCooldownUntil !== 'number') return false;
    return currentTurn <= skillRef.onCooldownUntil;
};

export const executeSkill = (skillRef, gameState, caster, targetX, targetY) => {
    const skillImpl = getSkillImplementation(skillRef.id);
    
    console.log('Executing skill:', {
        skillName: skillRef.id,
        caster,
        targetX,
        targetY,
        currentTurn: gameState.currentTurn
    });
    
    if (!skillImpl) {
        console.error(`No implementation found for skill: ${skillRef.id}`);
        return { success: false, message: 'Skill not found' };
    }

    if (isSkillOnCooldown(skillRef, gameState.currentTurn)) {
        console.log('Skill is on cooldown:', {
            currentTurn: gameState.currentTurn,
            cooldownUntil: skillRef.onCooldownUntil
        });
        return { success: false, message: 'Skill is on cooldown' };
    }

    // Use the Skill class's execute method
    const result = skillImpl.execute(gameState, caster, targetX, targetY);
    
    console.log('Skill execution result:', {
        success: result.success,
        updatedState: result.updatedGameState ? {
            unitCount: result.updatedGameState.units.length,
            affectedUnits: result.updatedGameState.units.filter(u => u.effects?.some(e => e.name === 'uwu'))
        } : null
    });
    
    // Update cooldown in the reference if execution was successful
    if (result.success) {
        skillRef.onCooldownUntil = gameState.currentTurn + skillImpl.cooldown;
    }

    return result;
};

export const getSkillAffectedCells = (skillImpl, caster, targetX, targetY, gridSize) => {
    if (!skillImpl.microActions?.[0]) return new Set();

    const affectedCells = TargetingLogic.getAffectedCells({
        targetingType: skillImpl.microActions[0].targetingType,
        casterX: caster.x,
        casterY: caster.y,
        range: skillImpl.microActions[0].range,
        targetX,
        targetY,
        applyCornerRule: skillImpl.microActions[0].applyCornerRule,
        gridSize,
        dimensions: skillImpl.microActions[0].dimensions
    });

    console.log('Calculated affected cells:', {
        targetingType: skillImpl.microActions[0].targetingType,
        casterPosition: { x: caster.x, y: caster.y },
        targetPosition: { x: targetX, y: targetY },
        cellCount: affectedCells.size
    });

    return affectedCells;
};