
// src/game/combat/Combat.js
import { CombatResponseType, CombatEventType } from './CombatTypes';

export class Combat {
    constructor(attacker, defender, attack, gameState) {
        this.attacker = attacker;
        this.defender = defender;
        this.attack = attack;
        this.gameState = gameState;
        this.isCounter = false;
        this.damageDealt = 0;
    }

    async executeCombat() {
        this.gameState.emit(CombatEventType.COMBAT_START, {
            attacker: this.attacker,
            defender: this.defender,
            attack: this.attack
        });

        // Step 1: Let defender choose response
        const defenderChoice = await this.getDefenderChoice();
        let damageMultiplier = 1;
        let evaded = false;

        // Step 2: Handle defender's choice
        switch (defenderChoice) {
            case CombatResponseType.DEFEND:
                damageMultiplier = 0.7; // 30% damage reduction
                break;
            
            case CombatResponseType.EVADE:
                evaded = await this.handleEvasion();
                if (evaded) {
                    if (!this.isCounter) {
                        await this.offerCounter();
                    }
                    return {
                        success: false,
                        message: 'Attack evaded',
                        evaded: true
                    };
                }
                break;
            
            case CombatResponseType.NOTHING:
                // Proceed with normal damage
                break;
        }

        // Only proceed with damage if attack wasn't evaded
        if (!evaded) {
            // Step 3: Check for critical hit
            const isCritical = await this.rollCritical();
            
            // Step 4: Calculate and apply damage
            this.damageDealt = this.calculateDamage(damageMultiplier, isCritical);
            await this.applyDamage();
            
            // Step 5: Handle agility reduction if applicable
            if (this.damageDealt > 100) {
                await this.reduceAgility();
            }

            // Step 6: Offer counter if defender survived and this isn't already a counter
            if (this.defender.hp > 0 && !this.isCounter) {
                await this.offerCounter();
            }
        }

        this.gameState.emit(CombatEventType.COMBAT_END, {
            attacker: this.attacker,
            defender: this.defender,
            damageDealt: this.damageDealt,
            evaded: evaded
        });

        return {
            success: true,
            damage: this.damageDealt,
            evaded: evaded
        };
    }

    async getDefenderChoice() {
        this.gameState.emit(CombatEventType.DEFENDER_CHOICE, {
            defender: this.defender
        });

        return new Promise((resolve) => {
            this.gameState.pendingDefenderChoice = {
                defendingUnit: this.defender,
                onChoice: (choice) => {
                    resolve(choice);
                }
            };
        });
    }

    async handleEvasion() {
        this.gameState.emit(CombatEventType.EVASION_ATTEMPT, {
            defender: this.defender
        });

        // Try Agility Evasion first
        if (await this.tryAgilityEvasion()) {
            return true;
        }
        
        // Try Luck Evasion if Agility failed
        if (await this.tryLuckEvasion()) {
            return true;
        }

        return false;
    }

    async tryAgilityEvasion() {
        const agilityDiff = this.defender.agility - this.attacker.agility;
        const penalty = agilityDiff >= 0 ? 0 : 4;
        const roll = Math.floor(Math.random() * 20) + 1; // 1d20
        return (roll - penalty) < this.defender.agility;
    }

    async tryLuckEvasion() {
        const luckDiff = this.defender.luck - this.attacker.luck;
        const penalty = luckDiff >= 0 ? 0 : 4;
        const roll = Math.floor(Math.random() * 20) + 1; // 1d20
        return (roll - penalty) < this.defender.luck;
    }

    async rollCritical() {
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

    calculateCriticalDamage() {
        let critDamage = 0;
        for (let i = 0; i < 10; i++) {
            critDamage += Math.floor(Math.random() * 20) + 1;
        }
        return critDamage;
    }

    calculateDamage(damageMultiplier, isCritical) {
        let damage = this.attacker.atk - this.defender.def;
        
        if (isCritical) {
            damage += this.calculateCriticalDamage();
        }
        
        return Math.floor(Math.max(0, damage * damageMultiplier));
    }

    async applyDamage() {
        this.defender.hp = Math.max(0, this.defender.hp - this.damageDealt);
        
        this.gameState.emit(CombatEventType.DAMAGE_CALCULATION, {
            target: this.defender,
            damage: this.damageDealt
        });
    }

    async reduceAgility() {
        const injuryRoll = Math.floor(Math.random() * 4) + 1; // 1d4
        this.defender.agility = Math.max(0, this.defender.agility - injuryRoll);
    }

    async offerCounter() {
        this.gameState.emit(CombatEventType.COUNTER_OPPORTUNITY, {
            defender: this.defender,
            attacker: this.attacker
        });

        return new Promise((resolve) => {
            this.gameState.pendingCounter = {
                defendingUnit: this.defender,
                attackingUnit: this.attacker,
                onCounterAction: async (action, target) => {
                    const validation = this.validateCounterAction(action, target);
                    if (validation.valid) {
                        await this.executeCounter(action);
                        resolve();
                    }
                    return validation;
                }
            };
        });
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

    async executeCounter(counterAction) {
        const counterCombat = new Combat(
            this.defender,
            this.attacker,
            counterAction,
            this.gameState
        );
        counterCombat.isCounter = true;
        await counterCombat.executeCombat();
    }
}