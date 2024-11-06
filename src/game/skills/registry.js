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

// The rest of your utility functions now work with the class instances
export const getSkillImplementation = (skillId) => {
    return SkillImplementations[skillId];
};

export const isSkillOnCooldown = (skillRef, currentTurn) => {
    return currentTurn < (skillRef.onCooldownUntil || 0);
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

    // Use the Skill class's execute method
    const result = skillImpl.execute(gameState, caster, targetX, targetY);
    
    // Update cooldown in the reference if execution was successful
    if (result.success) {
        skillRef.onCooldownUntil = gameState.currentTurn + skillImpl.cooldown;
    }

    return result;
};

// Utility function to get affected cells using TargetingLogic
export const getSkillAffectedCells = (skillImpl, caster, targetX, targetY, gridSize) => {
    if (!skillImpl.microActions?.[0]) return new Set();

    return TargetingLogic.getAffectedCells({
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
};