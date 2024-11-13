// src/game/combat/Combat.js
import { CombatResponseType, CombatEventType } from './CombatTypes';

export class Combat {
    constructor(attacker, defender, attack, gameState) {
        this.attacker = attacker;
        this.defender = defender;
        this.attack = attack;
        this.gameState = { ...gameState }; // Create a local copy of gameState
        this.isCounter = false;
        this.damageDealt = 0;
    }

    async executeCombat(defenderChoice) {
        let damageMultiplier = 1;
        let evaded = false;
        let results = {};

        // Handle defender's choice
        switch (defenderChoice) {
            case CombatResponseType.DEFEND:
                damageMultiplier = 0.7; // 30% damage reduction
                break;
            
            case CombatResponseType.EVADE:
                const evasionResult = this.handleEvasion();
                evaded = evasionResult.evaded;
                if (evaded) {
                    return {
                        success: false,
                        message: 'Attack evaded',
                        evaded: true,
                        evasionDetails: evasionResult,
                        updatedGameState: this.gameState
                    };
                }
                break;
            
            case CombatResponseType.NOTHING:
                // Proceed with normal damage
                break;
        }

        // Only proceed with damage if attack wasn't evaded
        if (!evaded) {
            // Check for critical hit
            const isCritical = this.rollCritical();
            
            // Calculate and apply damage
            this.damageDealt = this.calculateDamage(damageMultiplier, isCritical);
            
            // Update defender's HP in local gameState
            this.gameState.units = this.gameState.units.map(unit => {
                if (unit.id === this.defender.id) {
                    const newHp = Math.max(0, unit.hp - this.damageDealt);
                    let newAgility = unit.agility;

                    // Handle agility reduction if applicable
                    if (this.damageDealt > 100) {
                        const injuryRoll = Math.floor(Math.random() * 4) + 1; // 1d4
                        newAgility = Math.max(0, unit.agility - injuryRoll);
                    }

                    return {
                        ...unit,
                        hp: newHp,
                        agility: newAgility
                    };
                }
                if (unit.id === this.attacker.id && this.attack.affectsAttackCount) {
                    return {
                        ...unit,
                        hasAttacked: true
                    };
                }
                return unit;
            });

            results = {
                damage: this.damageDealt,
                critical: isCritical,
                defenderAlive: this.gameState.units.find(u => u.id === this.defender.id).hp > 0,
                agilityReduction: this.damageDealt > 100
            };
        }

        return {
            success: true,
            results,
            evaded,
            updatedGameState: this.gameState
        };
    }

    handleEvasion() {
        // Try Agility Evasion first
        const agilityResult = this.tryAgilityEvasion();
        if (agilityResult.success) {
            return {
                evaded: true,
                type: 'agility',
                roll: agilityResult.roll,
                threshold: agilityResult.threshold
            };
        }
        
        // Try Luck Evasion if Agility failed
        const luckResult = this.tryLuckEvasion();
        if (luckResult.success) {
            return {
                evaded: true,
                type: 'luck',
                roll: luckResult.roll,
                threshold: luckResult.threshold
            };
        }

        return { evaded: false };
    }

    tryAgilityEvasion() {
        const agilityDiff = this.defender.agility - this.attacker.agility;
        const penalty = agilityDiff >= 0 ? 0 : 4;
        const roll = Math.floor(Math.random() * 20) + 1; // 1d20
        const threshold = this.defender.agility;
        return {
            success: (roll - penalty) < threshold,
            roll,
            threshold,
            penalty
        };
    }

    tryLuckEvasion() {
        const luckDiff = this.defender.luck - this.attacker.luck;
        const penalty = luckDiff >= 0 ? 0 : 4;
        const roll = Math.floor(Math.random() * 20) + 1; // 1d20
        const threshold = this.defender.luck;
        return {
            success: (roll - penalty) < threshold,
            roll,
            threshold,
            penalty
        };
    }

    rollCritical() {
        const baseCritChance = 50;
        const critModifier = this.getCritModifiers();
        const roll = Math.floor(Math.random() * 100) + 1;
        return roll <= (baseCritChance + critModifier);
    }

    getCritModifiers() {
        let modifier = 0;
        this.attacker.effects?.forEach(effect => {
            if (effect.type === 'CritUp') modifier += effect.value;
            if (effect.type === 'CritDown') modifier -= effect.value;
        });
        return modifier;
    }

    calculateDamage(damageMultiplier, isCritical) {
        // Base damage calculation
        let damage = this.attacker.atk - this.defender.def;
        
        // Critical hit calculation
        let critDamage = 0;
        if (isCritical) {
            for (let i = 0; i < 10; i++) {
                critDamage += Math.floor(Math.random() * 20) + 1;
            }
        }
    
        // For skills/NPs, apply their specific damage formula
        if (this.attack.type === 'skill' || this.attack.type === 'noblePhantasm') {
            const {
                damageMultiplier: skillMultiplier = 1,
                flatDamageBonus = 0
            } = this.attack.attackData;
    
            // Apply the full damage formula:
            // [(Base + Crit) * (1 + Skill multiplier) + flat bonuses] * defender multiplier
            damage = (
                (damage + (isCritical ? critDamage : 0)) * 
                (1 + skillMultiplier) + 
                flatDamageBonus
            ) * damageMultiplier;
        } else {
            // Basic attack formula
            damage = (damage + (isCritical ? critDamage : 0)) * damageMultiplier;
        }
    
        return Math.floor(Math.max(0, damage));
    }

    validateCounterAction(action, target) {
        if (target.id !== this.attacker.id) {
            return {
                valid: false,
                message: "The unit that attacked you must be targeted"
            };
        }

        if (action.type === 'skill' && !action.isAttack) {
            return {
                valid: false,
                message: "The selected action is not an attack"
            };
        }

        return {
            valid: true
        };
    }
}