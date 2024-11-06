import { Skill } from '../Skill';
import { MicroAction } from '../MicroAction';
import { TargetingType } from '../targeting/TargetingTypes';
import { TargetingLogic } from '../targeting/TargetingLogic';

export const createMahalapraya = () => {
    const mahalaprayaAction = new MicroAction({
        targetingType: TargetingType.AOE_FROM_POINT,
        range: 6,
        dimensions: { width: 7, height: 7 },
        effectLogic: (gameState, caster, affectedCells) => {
            const updatedUnits = gameState.units.map(unit => {
                // Check if unit is an enemy and in the affected area
                if (unit.team !== caster.team && 
                    affectedCells.has(`${unit.x},${unit.y}`)) {
                    return {
                        ...unit,
                        // Apply both effects at once
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

    const skill = new Skill(
        "Mahalapraya",
        "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
        5, // cooldown
        6, // skill range
        [mahalaprayaAction]
    );

    console.log('Created skill instance:', skill); // Debug log
    console.log('Skill prototype:', Object.getPrototypeOf(skill)); // Debug log
    return skill;
}