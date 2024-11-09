// src/game/servants/archer/Anastasia_unit.js
import { MicroAction } from '../../MicroAction';
import { Skill } from '../../Skill';
import { TargetingType } from '../../targeting/TargetingTypes';

// Define Anastasia's skills' MicroActions
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
                
                const newHp = Math.max(0, unit.hp - (5 * caster.atk));
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

// Define Anastasia's skills
export const AnastasiaSkills = {
    Mahalapraya: new Skill(
        "Mahalapraya",
        "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
        5, // cooldown
        6, // range
        [mahalaprayaMicroAction]
    )
};

// Define Anastasia's base stats and attributes
export const AnastasiaAttributes = {
    name: 'Anastasia',
    class: 'Archer',
    baseHp: 20,
    baseAtk: 8,
    baseDef: 5,
    baseMovementRange: 5,
    sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp"
};

// Export complete Anastasia unit template
export const AnastasiaTemplate = {
    ...AnastasiaAttributes,
    skills: [
        {
            id: "Mahalapraya",
            onCooldownUntil: 0
        }
    ],
    noblePhantasms: [
        { 
            id: 1, 
            name: 'Snegleta・Snegurochka: Summer Snow', 
            description: 'Unleashes the power of summer', 
            cooldown: 5 
        }
    ],
    reactions: [
        { 
            id: 1, 
            name: 'Instinct', 
            description: 'May evade incoming attacks' 
        }
    ]
};