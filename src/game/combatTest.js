//asuming unitAttacking is the Attacker of the Combat Class"
const unitAttacking = {
    id: 1, 
    x: 1, 
    y: 1, 
    team: 'player1', 
    name: 'Anastasia',
    class: 'Archer',
    // Base Stats
    baseHp: 500,
    maxHp: 500,
    baseDef: 1,
    baseMovementRange: 5,
    rangeOfBasicAttack: 2,
    // Combat Stats
    strength: 80,  // Physical attack power
    magic: 120,    // Magical attack power
    // Vision and Targeting
    visionRange: 5,
    // Agility Stats
    baseAgility: 16,
    maxAgility: 20,
    // Luck Stats
    baseLuck: 8,
    maxLuck: 12,
    // Sustainability
    sustainability: "4",
    // Visual 
    sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp",

    effects: [
        { 
        name: 'uwu',
        type: "other",
        duration: 7,
        appliedAt: 5,
        value: 5,
        description: 'Under the effect of Mahalapraya'
        }
    ]
};


//asuming unitAttacking is the Defender of the Combat Class"
const unitDefending = {
    id: 345, 
    x: 4, 
    y: 5, 
    team: 'player2', 
    name: 'Anastasia',
    class: 'Archer',
    // Base Stats
    baseHp: 200,
    maxHp: 500,
    baseDef: 1,
    baseMovementRange: 5,
    rangeOfBasicAttack: 2,
    // Combat Stats
    strength: 80,  // Physical attack power
    magic: 120,    // Magical attack power
    // Vision and Targeting
    visionRange: 5,
    // Agility Stats
    baseAgility: 16,
    maxAgility: 20,
    // Luck Stats
    baseLuck: 8,
    maxLuck: 12,
    // Sustainability
    sustainability: "4",
    // Visual 
    sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp",

    effects: [
        { 
        name: 'uwu',
        type: "other",
        duration: 7,
        appliedAt: 5,
        value: 5,
        description: 'Under the effect of Mahalapraya'
        }
    ]
};
let integratedAttackMultiplier = 1; //this should be in the constructor of the class
let integratedAttackFlatBonus = 0;


let initialForceMagic = proportionOfMagicUsed*(unitAttacking.magic); //e.g 30% of magic used would be 0.3 * 120, equal to 36
let initialForceStrength =  proportionOfStrengthUsed*(unitAttacking.strength); // e.g: 120% of Strength used would be 1.2*80, equal to 96
let sumOfInitialForces = initialForceMagic+initialForceStrength; // if we followed the previous examples here it would give 132 (96+36)
let howMuchOfAttackIsMagical = initialForceMagic/sumOfInitialForces; // this would a give a percentage of how much of the Attack is made of a magical component There should be something to handle when initialForceMagic is equal to 0
let howMuchOfAttackIsPhysical = sumOfInitialForces/initialForceStrength; // this would a give a percentage of how much of the Attack is made of a physical component There should be something to handle when initialForceStrength is equal to 0


let critChance = 50;
let modCritChance= 0;

//Finds out if the attack was a critical hit, it was it return 1 that will be multiplied by the critDmg, if it wasn't it will return 0 then the critDmg will be multiplied by 0, because no matter how power the criticalDmg is, if there wasn't a critical it will be 0
function rollCritical() {
    const critChanceModifier = getCritModifiersFromAttacker() - getCritModifiersFromDefender();
    const roll = Math.floor(Math.random() * 100) + 1;
    if (roll <= (critChance + critChanceModifier)) {
        modCritChance = 1;
        return modCritChance
    }
    else {
        return modCritChance
    }
};
modCritChance = rollCritical();



function getCritModifiersFromAttacker() {
    let modifier = 0;
        this.attacker.effects?.forEach(effect => {
            if (effect.type === 'CritUp') modifier += effect.value;
            if (effect.type === 'CritDown') modifier -= effect.value;
        });
        return modifier;
};
let CritModifiersFromAttacker = getCritModifiersFromAttacker();


function getCritModifiersFromDefender() {
    let modifier = 0;
        this.defender.effects?.forEach(effect => {
            if (effect.type === 'CritResUp') modifier += effect.value;
            if (effect.type === 'CritResDown') modifier -= effect.value;
        });
        return modifier;
};

let CritModifiersFromDefender = getCritModifiersFromDefender();

let critDamage = 0;
function getCritDamageModifiersFromAttacker() {
    let modifier = 0;
        this.attacker.effects?.forEach(effect => {
            if (effect.type === 'CritDmgUp') modifier += effect.value;
            if (effect.type === 'CritDmgDown') modifier -= effect.value;
        });
        return modifier;
};
function getCritDamageModifiersFromDefender() {
    let modifier = 0;
        this.defender.effects?.forEach(effect => {
            if (effect.type === 'CritDmgResUp') modifier += effect.value;
            if (effect.type === 'CritDmgResDown') modifier -= effect.value;
        });
        return modifier;
};
let CritDamageModifiersFromAttacker = getCritDamageModifiersFromAttacker();
let CritDamageModifiersFromDefender = getCritDamageModifiersFromDefender();
let modCritDamage = CritDamageModifiersFromAttacker - CritDamageModifiersFromDefender; 
let modCritDamageForMagic = modCritDamage*howMuchOfAttackIsMagical;
let modCritDamageForStrength = modCritDamage*howMuchOfAttackIsPhysical;
function getMultipliersAttackModifiersFromAttacker() {
    let modifier = 0;
        this.attacker.effects?.forEach(effect => {
            if (effect.type === 'AttackUp' &&  effect.flatOrMultiplier === "multiplier") modifier += effect.value;
            if (effect.type === 'AttackDown'&&  effect.flatOrMultiplier === "multiplier") modifier -= effect.value;
        });
        return modifier;
};
let MultipliersAttackModifiersFromAttacker = getMultipliersAttackModifiersFromAttacker();

function getMultipliersAttackModifiersFromDefender() {
    let modifier = 0;
        this.defender.effects?.forEach(effect => {
            if (effect.type === 'DefenseUp' &&  effect.flatOrMultiplier === "multiplier") modifier += effect.value;
            if (effect.type === 'DefenseDown' &&  effect.flatOrMultiplier === "multiplier") modifier -= effect.value;
        });
        return modifier;
};

let multipliersAttackModifiersFromDefender = getMultipliersAttackModifiersFromDefender();

function getFlatAttackModifiersFromAttacker() {
    let modifier = 0;
        this.attacker.effects?.forEach(effect => {
            if (effect.type === 'AttackUp' &&  effect.flatOrMultiplier === "flat") modifier += effect.value;
            if (effect.type === 'AttackDown'&&  effect.flatOrMultiplier === "flat") modifier -= effect.value;
        });
        return modifier;
};
let flatAttackModifiersFromAttacker = getFlatAttackModifiersFromAttacker();

function getFlatAttackModifiersFromDefender() {
    let modifier = 0;
        this.defender.effects?.forEach(effect => {
            if (effect.type === 'DefenseUp' &&  effect.flatOrMultiplier === "flat") modifier += effect.value;
            if (effect.type === 'DefenseDown' &&  effect.flatOrMultiplier === "flat") modifier -= effect.value;
        });
        return modifier;
};
let flatAttackModifiersFromDefender = getFlatAttackModifiersFromDefender();


let modAttackDamageMultiplier = MultipliersAttackModifiersFromAttacker - multipliersAttackModifiersFromDefender; 
let modAttackDamageFlat = flatAttackModifiersFromAttacker - flatAttackModifiersFromDefender;
let damageMagic = ( ( ( (initialForceMagic+(modCritChance*modCritDamageForMagic))*(integratedAttackMultiplier) + integratedAttackFlatBonus)*(1+(modAttackDamageMultiplier*0.01) ) ) + modAttackDamageFlat);
let damagePhysical = ( ( ( (initialForceStrength+(modCritChance*modCritDamageForStrength))*(integratedAttackMultiplier) + integratedAttackFlatBonus)*(1+(modAttackDamageMultiplier*0.01) ) ) + modAttackDamageFlat);
finalDamage =damageMagic + damagePhysical;

//e.g: at the end it should export something like this, inside the unit that attacked and the unit that was attacked (in the unit that attacked it would be saved inside "combatSent", and inside the unit that is the target of the attack it would be saved as "Combat received"):
// ...all of the other attributes of the unit
// combatSent:
    // {
    //     finalDamage: finalDamage,
    //     damageMagic: damageMagic,
    //     damagePhysical: damagePhysical,
    //     flatAttackModifiersFromAttacker: flatAttackModifiersFromAttacker,
    //     flatAttackModifiersFromDefender: flatAttackModifiersFromDefender,


    //     MultipliersAttackModifiersFromAttacker: MultipliersAttackModifiersFromAttacker,
    //     multipliersAttackModifiersFromDefender: multipliersAttackModifiersFromDefender,
    //     CritDamageModifiersFromAttacker: CritDamageModifiersFromAttacker,
    //     CritDamageModifiersFromDefender: CritDamageModifiersFromDefender,
    //     CritModifiersFromAttacker: CritModifiersFromAttacker,  
    //     CritModifiersFromAttacker: CritModifiersFromDefender,  

    // }

    //there should be a method called "initiateCombat" that would fill all the variables related to the Attacker (like flatAttackModifiersFromAttacker, or the CritModifiersFromAttacker) and then a method called "receiveCombat" that would fill all the variable relating to the defender and do the final calculations for damage (like calculating damageMagic or damagePhysical)