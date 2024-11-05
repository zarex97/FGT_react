export class Skill {
    constructor(name, description, cooldown, range, microActions) {
        this.name = name;
        this.description = description;
        this.cooldown = cooldown;
        this.range = range;
        this.microActions = microActions;
        this.onCooldownUntil = 0;
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