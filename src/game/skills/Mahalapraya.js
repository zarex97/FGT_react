import { Skill, MicroAction, TargetingType } from '../index';

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

    return new Skill(
        "Mahalapraya",
        "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
        5, // cooldown
        6, // skill range
        [mahalaprayaAction] // single microAction that applies both effects
    );
};