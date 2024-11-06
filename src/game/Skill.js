import { TargetingLogic } from '../game/targeting/TargetingLogic';
import { TargetingType } from '../game/targeting/TargetingTypes';


export class Skill {
    constructor(name, description, cooldown, range, microActions) {
        this.name = name;
        this.description = description;
        this.cooldown = cooldown;
        this.range = range;
        this.microActions = microActions;
        this.onCooldownUntil = 0;

        this.isOnCooldown = this.isOnCooldown.bind(this);
        this.startCooldown = this.startCooldown.bind(this);
        this.execute = this.execute.bind(this);
    }

    isOnCooldown(currentTurn) {
        return currentTurn < this.onCooldownUntil;
    }

    startCooldown(currentTurn) {
        this.onCooldownUntil = currentTurn + this.cooldown;
    }

    execute(gameState, caster, targetX, targetY) {
        if (this.isOnCooldown(gameState.currentTurn)) {
            return {
                success: false,
                message: 'Skill is on cooldown'
            };
        }

        let updatedGameState = { ...gameState };
        
        // Execute each microaction in sequence
        for (const microAction of this.microActions) {
            const affectedCells = microAction.getAffectedCells(caster, targetX, targetY, 11);
            updatedGameState = microAction.execute(updatedGameState, caster, affectedCells);
        }

        this.startCooldown(gameState.currentTurn);

        return {
            success: true,
            message: `${this.name} executed successfully`,
            updatedGameState
        };
    }
}

export const createSkill = (name, description, cooldown, range, microActions) => {
    return new Skill(name, description, cooldown, range, microActions);
};