// Combat.js
export class Combat {
    constructor({
        typeOfAttackCausingIt,
        proportionOfMagicUsed,
        proportionOfStrengthUsed,
        attacker,
        defender,
        gameState,
        integratedAttackMultiplier,
        integratedAttackFlatBonus
    }) {
        this.type = typeOfAttackCausingIt;
        this.proportionOfMagicUsed = proportionOfMagicUsed;
        this.proportionOfStrengthUsed = proportionOfStrengthUsed;
        this.attacker = attacker;
        this.defender = defender;
        this.gameState = gameState;
        this.integratedAttackMultiplier = integratedAttackMultiplier;
        this.integratedAttackFlatBonus = integratedAttackFlatBonus;

        // Initialize combat results
        this.combatResults = {
            initialForces: {
                magic: 0,
                strength: 0,
                total: 0
            },
            attackComposition: {
                magicalPortion: 0,
                physicalPortion: 0
            },
            criticals: {
                chance: 50,  // Base crit chance
                rolled: false,
                modifier: 0,
                damage: 0,
                damageModifierMagic: 0,
                damageModifierPhysical: 0
            },
            modifiers: {
                attacker: {
                    flatAttack: 0,
                    multiplierAttack: 0,
                    critChance: 0,
                    critDamage: 0
                },
                defender: {
                    flatDefense: 0,
                    multiplierDefense: 0,
                    critResistance: 0,
                    critDamageResistance: 0
                }
            },
            finalDamage: {
                magical: 0,
                physical: 0,
                total: 0
            },
            typeOfAttackCausingIt: this.typeOfAttackCausingIt,
            proportionOfMagicUsed: this.proportionOfMagicUsed,
            attacker: this.attacker,
            defender:this.defender,
            gameState: this.gameState,
            integratedAttackMultiplier: this.integratedAttackMultiplier,
            integratedAttackFlatBonus: this.integratedAttackFlatBonus
        };
    }

    // Step 1: Initialize combat from attacker's perspective
    initiateCombat() {
        this.calculateInitialForces();
        this.calculateAttackComposition();
        this.collectAttackerModifiers();
        this.collectDefenderModifiers();
        this.calculateFinalDamage();
        return this.combatResults;
    }

    // Step 2: Process defender's response
    receiveCombat() {
        this.collectDefenderModifiers();
        this.rollCritical();
        this.calculateFinalDamage();
        return this.combatResults;
    }

     calculateInitialForces() {
        const { magic, strength } = this.attacker;
        const initialForceMagic = this.proportionOfMagicUsed * magic;
        const initialForceStrength = this.proportionOfStrengthUsed * strength;

        this.combatResults.initialForces = {
            magic: initialForceMagic,
            strength: initialForceStrength,
            total: initialForceMagic + initialForceStrength
        };
    }

     calculateAttackComposition() {
        const { magic, strength, total } = this.combatResults.initialForces;
        
        this.combatResults.attackComposition = {
            magicalPortion: total === 0 ? 0 : magic / total,
            physicalPortion: total === 0 ? 0 : strength / total
        };
    }

    collectAttackerModifiers() {
        const modifiers = {
            flatAttack: 0,
            multiplierAttack: 0,
            critChance: 0,
            critDamage: 0
        };

        this.attacker.effects?.forEach(effect => {
            switch(effect.type) {
                case 'AttackUp':
                    if (effect.flatOrMultiplier === 'flat') modifiers.flatAttack += effect.value;
                    else modifiers.multiplierAttack += effect.value;
                    break;
                case 'AttackDown':
                    if (effect.flatOrMultiplier === 'flat') modifiers.flatAttack -= effect.value;
                    else modifiers.multiplierAttack -= effect.value;
                    break;
                case 'CritUp':
                    modifiers.critChance += effect.value;
                    break;
                case 'CritDown':
                    modifiers.critChance -= effect.value;
                    break;
                case 'CritDmgUp':
                    modifiers.critDamage += effect.value;
                    break;
                case 'CritDmgDown':
                    modifiers.critDamage -= effect.value;
                    break;
            }
        });

        this.combatResults.modifiers.attacker = modifiers;
    }

    collectDefenderModifiers() {
        const modifiers = {
            flatDefense: 0,
            multiplierDefense: 0,
            critResistance: 0,
            critDamageResistance: 0
        };

        this.defender.effects?.forEach(effect => {
            switch(effect.type) {
                case 'DefenseUp':
                    if (effect.flatOrMultiplier === 'flat') modifiers.flatDefense += effect.value;
                    else modifiers.multiplierDefense += effect.value;
                    break;
                case 'DefenseDown':
                    if (effect.flatOrMultiplier === 'flat') modifiers.flatDefense -= effect.value;
                    else modifiers.multiplierDefense -= effect.value;
                    break;
                case 'CritResUp':
                    modifiers.critResistance += effect.value;
                    break;
                case 'CritResDown':
                    modifiers.critResistance -= effect.value;
                    break;
                case 'CritDmgResUp':
                    modifiers.critDamageResistance += effect.value;
                    break;
                case 'CritDmgResDown':
                    modifiers.critDamageResistance -= effect.value;
                    break;
            }
        });

        this.combatResults.modifiers.defender = modifiers;
    }

    rollCritical() {
        const { attacker, defender } = this.combatResults.modifiers;
        const critChanceModifier = attacker.critChance - defender.critResistance;
        const roll = Math.floor(Math.random() * 100) + 1;
        
        this.combatResults.criticals = {
            chance: this.combatResults.criticals.chance + critChanceModifier,
            rolled: roll <= (this.combatResults.criticals.chance + critChanceModifier),
            modifier: roll <= (this.combatResults.criticals.chance + critChanceModifier) ? 1 : 0,
            damage: attacker.critDamage - defender.critDamageResistance,
            damageModifierMagic: (attacker.critDamage - defender.critDamageResistance) * this.combatResults.attackComposition.magicalPortion,
            damageModifierPhysical: (attacker.critDamage - defender.critDamageResistance) * this.combatResults.attackComposition.physicalPortion
        };
    }

    calculateFinalDamage() {
        const { attacker, defender } = this.combatResults.modifiers;
        const { criticals, initialForces, attackComposition } = this.combatResults;

        const calculateDamageComponent = (initialForce, critDamageMod) => {
            return (
                (
                    (
                        (initialForce + (criticals.modifier * critDamageMod)) *
                        this.integratedAttackMultiplier +
                        this.integratedAttackFlatBonus
                    ) * (1 + ((attacker.multiplierAttack - defender.multiplierDefense) * 0.01))
                ) + (attacker.flatAttack - defender.flatDefense)
            );
        };

        this.combatResults.finalDamage = {
            magical: calculateDamageComponent(initialForces.magic, criticals.damageModifierMagic),
            physical: calculateDamageComponent(initialForces.strength, criticals.damageModifierPhysical),
            total: 0
        };

        this.combatResults.finalDamage.total = 
            this.combatResults.finalDamage.magical + 
            this.combatResults.finalDamage.physical;
    }

    getSanitizedResults() {
        return {
            initialForces: this.combatResults.initialForces,
            attackComposition: this.combatResults.attackComposition,
            criticals: this.combatResults.criticals,
            modifiers: this.combatResults.modifiers,
            finalDamage: this.combatResults.finalDamage,
            attackerInfo: {
                id: this.attacker.id,
                name: this.attacker.name,
                strength: this.attacker.strength,
                magic: this.attacker.magic
            },
            defenderInfo: {
                id: this.defender.id,
                name: this.defender.name
            },
            typeOfAttackCausingIt: this.type,
            proportionOfMagicUsed: this.proportionOfMagicUsed,
            proportionOfStrengthUsed: this.proportionOfStrengthUsed,
            integratedAttackMultiplier: this.integratedAttackMultiplier,
            integratedAttackFlatBonus: this.integratedAttackFlatBonus
        };
    }


    // Method to store combat results in units
    storeCombatResults() {
        // Store in attacker
        this.attacker.combatSent = { ...this.combatResults };
        
        // Store in defender
        this.defender.combatReceived = { ...this.combatResults };
        
        return this.combatResults;
    }
}