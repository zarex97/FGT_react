// src/game/servants/archer/Gogh_unit.js
import { MicroAction } from "../../MicroAction.js";
import { Skill } from "../../Skill.js";
import { TargetingType } from "../../targeting/TargetingTypes.js";
import { Combat } from "../../Combat.js";
import { Action } from "../../actions/Action.js";
import { ActionType } from "../../actions/ActionTypes.js";
import { NoblePhantasm } from "../../NoblePhantasm.js";
import { TriggerEffect } from "../../TriggerEffect.js";
import { EventTypes } from "../../EventTypes.js";

// MicroAction 1: Apply buffs to ally within 2 panels
const channelMarkerAllyBuffMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT_WITHIN_RANGE,
  range: 2,
  dimensions: { width: 5, height: 5 },
  applyCornerRule: false,
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team === caster.team &&
        unit.id !== caster.id &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];

        const attackUpEffect = {
          name: "AttackUp",
          type: "AttackUp",
          duration: 1,
          appliedAt: gameState.currentTurn,
          value: 30, // 30% for normal attacks, 15% for NP
          flatOrMultiplier: "multiplier",
          source: "Channel Marker Soul",
          npModifier: 0.5,
        };

        const critUpEffect = {
          name: "CritUp",
          type: "CritUp",
          duration: 1,
          appliedAt: gameState.currentTurn,
          value: 60,
          flatOrMultiplier: "flat",
          source: "Channel Marker Soul",
        };

        return {
          ...unit,
          effects: [...currentEffects, attackUpEffect, critUpEffect],
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// The trigger effect that activates on successful attacks
const GoghSuccessfulAttackTrigger = new TriggerEffect({
  eventType: EventTypes.SUCCESSFUL_ATTACK,
  name: "Gogh Buff Trigger",
  description:
    "Reduces curse stage and applies attack buff when Gogh successfully attacks",
  source: "Channel Marker Soul",
  priority: 5,

  conditionLogic: (eventData, gameState, unit) => {
    // Check if this unit is the attacker and has the "Gogh" buff
    return (
      eventData.attackerId === unit.id &&
      unit.effects?.some((effect) => effect.name === "Gogh")
    );
  },

  effectLogic: (eventData, gameState, unit) => {
    const updatedUnits = gameState.units.map((gameUnit) => {
      if (gameUnit.id === unit.id) {
        let updatedUnit = { ...gameUnit };
        let curseRemoved = false;
        let stagesRemoved = 0;

        // Find the curse effect
        const curseIndex = updatedUnit.effects?.findIndex(
          (e) => e.name === "Curse"
        );

        if (curseIndex !== -1) {
          updatedUnit.effects = [...updatedUnit.effects];
          const curseEffect = updatedUnit.effects[curseIndex];
          const currentStage = curseEffect.stage || 1;

          // Determine how many stages to remove (1 for normal hit, 2 for critical)
          const stagesToRemove = eventData.wasCritical ? 2 : 1;
          stagesRemoved = Math.min(stagesToRemove, currentStage);

          if (currentStage <= stagesToRemove) {
            // Remove the curse entirely if stage would be 0 or less
            updatedUnit.effects.splice(curseIndex, 1);
            curseRemoved = true;
          } else {
            // Reduce the curse stage
            const newStage = currentStage - stagesToRemove;
            const newValue = 25 * newStage;

            updatedUnit.effects[curseIndex] = {
              ...curseEffect,
              stage: newStage,
              value: newValue,
              description: `Cursed by frozen despair - Stage ${newStage}`,
            };
            curseRemoved = true;
          }
        }

        // If curse was completely removed, also remove the CurseTriggerEffect reference
        if (curseRemoved && currentStage <= stagesToRemove) {
          // Remove CurseTriggerEffect reference from triggerEffects
          updatedUnit.triggerEffects = (
            updatedUnit.triggerEffects || []
          ).filter((triggerRef) => triggerRef.id !== "CurseTriggerEffect");
          console.log(
            `🎨 GOGH TRIGGER: Removed CurseTriggerEffect reference from ${unit.name}`
          );
        }

        // If curse was affected, apply Attack Up buff(s)
        if (curseRemoved && stagesRemoved > 0) {
          const attackUpEffect = {
            name: "AttackUp",
            type: "AttackUp",
            duration: 1,
            appliedAt: gameState.currentTurn,
            value: 10, // 10% damage increase, 5% for NP
            flatOrMultiplier: "multiplier",
            source: "Gogh Buff Trigger",
            npModifier: 0.5,
          };

          // Apply one AttackUp buff per stage removed
          for (let i = 0; i < stagesRemoved; i++) {
            updatedUnit.effects = [
              ...(updatedUnit.effects || []),
              { ...attackUpEffect },
            ];
          }
        }

        return updatedUnit;
      }
      return gameUnit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// MicroAction 2: Apply "Gogh" buff to self and add trigger effect
const channelMarkerGoghBuffMicroAction = new MicroAction({
  targetingType: TargetingType.SELF,
  range: 0,
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.id === caster.id) {
        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];

        const goghBuffEffect = {
          name: "Gogh",
          type: "SpecialBuff",
          duration: 1,
          appliedAt: gameState.currentTurn,
          description: "Triggers special effects on successful attacks",
          source: "Channel Marker Soul",
        };

        // Add the trigger effect to the unit's triggerEffects array
        const currentTriggerEffects = Array.isArray(unit.triggerEffects)
          ? unit.triggerEffects
          : [];

        // Store only a reference (following your skill pattern)
        const triggerEffectReference = {
          id: "GoghSuccessfulAttackTrigger",
          appliedAt: gameState.currentTurn,
          source: "Channel Marker Soul",
        };

        console.log(
          `🎨💫 Created trigger effect reference:`,
          triggerEffectReference
        );
        console.log(
          `🎨💫 Reference ID specifically:`,
          triggerEffectReference.id
        );
        console.log(
          `🎨💫 Reference keys:`,
          Object.keys(triggerEffectReference)
        );

        console.log(
          `🎨 CHANNEL MARKER: Adding trigger effect reference:`,
          triggerEffectReference
        );
        const updatedUnit = {
          ...unit,
          effects: [...currentEffects, goghBuffEffect],
          triggerEffects: [...currentTriggerEffects, triggerEffectReference],
        };

        console.log(
          `🎨💫 Updated unit trigger effects:`,
          updatedUnit.triggerEffects
        );
        console.log(
          `🎨💫 Updated unit trigger effects count:`,
          updatedUnit.triggerEffects.length
        );
        console.log(
          `🎨💫 Updated unit trigger effect IDs:`,
          updatedUnit.triggerEffects.map((tr) => {
            console.log(`🎨💫   Trigger object:`, tr);
            console.log(`🎨💫   Trigger ID:`, tr.id);
            return tr.id;
          })
        );

        console.log(`🎨 CHANNEL MARKER: Unit after adding trigger:`, {
          name: updatedUnit.name,
          effectsCount: updatedUnit.effects.length,
          triggerEffectsCount: updatedUnit.triggerEffects.length,
          hasGoghBuff: updatedUnit.effects.some((e) => e.name === "Gogh"),
          triggerIds: updatedUnit.triggerEffects.map((tr) => tr.id),
        });

        return updatedUnit;
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// MicroAction 3: Curse redistribution

const channelMarkerCurseRedistributionMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_AROUND_SELF,
  range: 3,
  applyCornerRule: false,
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("🔄💀 Executing Curse Redistribution:", {
      caster: caster.name,
      affectedCellsCount: affectedCells.size,
    });

    let totalCurseStages = 0;

    // First pass: collect all curse stages from units in range and remove their curses
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.id !== caster.id && affectedCells.has(`${unit.x},${unit.y}`)) {
        const curseEffects =
          unit.effects?.filter((e) => e.name === "Curse") || [];

        // Sum up all curse stages from this unit
        curseEffects.forEach((curse) => {
          const stage = curse.stage || 1;
          totalCurseStages += stage;
          console.log(`🔄💀 COLLECTING: ${unit.name} had curse stage ${stage}`);
        });

        // Remove all curses from this unit and also remove CurseTriggerEffect reference
        return {
          ...unit,
          effects: unit.effects?.filter((e) => e.name !== "Curse") || [],
          triggerEffects: (unit.triggerEffects || []).filter(
            (triggerRef) => triggerRef.id !== "CurseTriggerEffect"
          ),
        };
      }
      return unit;
    });

    console.log(`🔄💀 TOTAL COLLECTED STAGES: ${totalCurseStages}`);

    // Second pass: apply all collected curse stages to Gogh
    const finalUnits = updatedUnits.map((unit) => {
      if (unit.id === caster.id && totalCurseStages > 0) {
        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
        const currentTriggerEffects = Array.isArray(unit.triggerEffects)
          ? unit.triggerEffects
          : [];

        // Check if Gogh already has a curse
        const existingCurseIndex = currentEffects.findIndex(
          (e) => e.name === "Curse"
        );

        // Check if Gogh already has CurseTriggerEffect reference
        const hasCurseTrigger = currentTriggerEffects.some(
          (triggerRef) => triggerRef.id === "CurseTriggerEffect"
        );

        let updatedEffects = currentEffects;
        let updatedTriggerEffects = currentTriggerEffects;

        if (existingCurseIndex !== -1) {
          // Gogh already has a curse - upgrade it
          const existingCurse = currentEffects[existingCurseIndex];
          const currentStage = existingCurse.stage || 1;
          const newStage = currentStage + totalCurseStages;
          const newValue = 25 * newStage;

          console.log(
            `🔄💀 UPGRADING GOGH'S CURSE: Stage ${currentStage} + ${totalCurseStages} = ${newStage}`
          );

          updatedEffects = [...currentEffects];
          updatedEffects[existingCurseIndex] = {
            ...existingCurse,
            stage: newStage,
            value: newValue,
            description: `Cursed by frozen despair - Stage ${newStage}`,
          };
        } else {
          // Gogh doesn't have a curse - create a new one
          const newCurseEffect = {
            name: "Curse",
            type: "Curse",
            duration: 5,
            appliedAt: gameState.currentTurn,
            value: 25 * totalCurseStages,
            description: `Cursed - Stage ${totalCurseStages}`,
            source: "Channel Marker Curse Redistribution",
            stage: totalCurseStages,
          };

          console.log(
            `🔄💀 CREATING NEW CURSE ON GOGH: Stage ${totalCurseStages}, Value ${newCurseEffect.value}`
          );

          updatedEffects = [...currentEffects, newCurseEffect];
        }

        // Add CurseTriggerEffect reference if Gogh doesn't have it
        if (!hasCurseTrigger) {
          const curseTriggerReference = {
            id: "CurseTriggerEffect",
            appliedAt: gameState.currentTurn,
            source: "Channel Marker Curse Redistribution",
          };

          updatedTriggerEffects = [
            ...currentTriggerEffects,
            curseTriggerReference,
          ];
          console.log(
            `🔄💀 ADDING CURSE TRIGGER: ${unit.name} will now take curse damage over time`
          );
        }

        return {
          ...unit,
          effects: updatedEffects,
          triggerEffects: updatedTriggerEffects,
        };
      }
      return unit;
    });

    console.log("🔄💀 Curse Redistribution complete:", {
      totalStagesCollected: totalCurseStages,
      goghNewCurseStage:
        finalUnits
          .find((u) => u.id === caster.id)
          ?.effects?.find((e) => e.name === "Curse")?.stage || 0,
    });

    return {
      ...gameState,
      units: finalUnits,
    };
  },
});

const snegletaDefenseDownMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 3, // rangeOfBasicAttack + 1
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        const modifiedUnit = JSON.parse(JSON.stringify(unit));
        const backUpUnit = modifiedUnit;

        const currentEffects = Array.isArray(modifiedUnit.effects)
          ? modifiedUnit.effects
          : [];
        const defenseDownEffect = {
          name: "DefenseDown",
          type: "DefenseDown",
          duration: 2,
          appliedAt: gameState.currentTurn,
          value: 30,
          flatOrMultiplier: "multiplier",
          source: "Snegleta・Snegurochka",
        };

        modifiedUnit.effects = [...currentEffects, defenseDownEffect];

        return {
          ...unit,
          statusIfHit: modifiedUnit,
          backUpStatus: backUpUnit,
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

// Create the MicroAction for the damage and skill seal
const snegletaDamageAndSealMicroAction = new MicroAction({
  targetingType: TargetingType.SINGLE_TARGET,
  range: 3, // rangeOfBasicAttack + 1
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        // Use existing statusIfHit to build upon previous effects (needed for NPs, actions, anything that has more than 1 microAction)
        const modifiedUnit = unit.statusIfHit;
        const backUpUnit = modifiedUnit;

        const combat = new Combat({
          typeOfAttackCausingIt: "Noble Phantasm",
          proportionOfMagicUsed: 1, // 100% magic
          proportionOfStrengthUsed: 0, // no strength
          attacker: caster,
          defender: modifiedUnit,
          gameState: gameState,
          integratedAttackMultiplier: 3.5,
          integratedAttackFlatBonus: 0,
        });

        const initiationResults = combat.initiateCombat();
        caster.combatSent = JSON.parse(JSON.stringify(combat.combatResults));
        modifiedUnit.combatReceived = JSON.parse(
          JSON.stringify(combat.combatResults)
        );

        const currentEffects = Array.isArray(modifiedUnit.effects)
          ? modifiedUnit.effects
          : [];
        const skillSealEffect = {
          name: "SkillSeal",
          type: "SkillSeal",
          duration: 1,
          appliedAt: gameState.currentTurn,
          description: "Cannot use skills",
          source: "Snegleta・Snegurochka",
        };

        modifiedUnit.effects = [...currentEffects, skillSealEffect];

        // Add debug logging
        console.log("NP Second MicroAction Effects:", {
          unit: unit.name,
          previousEffects: currentEffects,
          newEffects: modifiedUnit.effects,
          combatResults: combat.combatResults,
        });

        return {
          ...unit,
          statusIfHit: modifiedUnit,
          backUpStatus: backUpUnit,
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});

const mahalaprayaMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT,
  range: 6,
  dimensions: { width: 7, height: 7 },
  applyCornerRule: false,
  effectLogic: (gameState, caster, affectedCells) => {
    console.log("🔥🔥🔥 GOGH MAHALAPRAYA EXECUTING! 🔥🔥🔥");
    console.log("Executing Mahalapraya MicroAction:", {
      caster,
      affectedCellsCount: affectedCells.size,
      currentGameState: gameState,
    });

    // Initialize combatSent as an array if it doesn't exist
    caster.combatSent = [];

    const updatedUnits = gameState.units.map((unit) => {
      if (
        unit.team !== caster.team &&
        affectedCells.has(`${unit.x},${unit.y}`)
      ) {
        console.log("💥 Processing unit:", unit.name);
        const backUpUnit = JSON.parse(JSON.stringify(unit));
        // Create modified attributes for the copy

        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];

        const casterDeepCopy = JSON.parse(JSON.stringify(caster));

        const unitDeepCopy = JSON.parse(JSON.stringify(unit));

        // const newHp = Math.max(0, modifiedUnit.hp - (5 * caster.atk));

        const combat = new Combat({
          typeOfAttackCausingIt: "Skill",
          proportionOfMagicUsed: 1, // 30% of magic
          proportionOfStrengthUsed: 0, // 120% of strength
          attacker: casterDeepCopy,
          defender: unitDeepCopy,
          gameState: gameState,
          integratedAttackMultiplier: 5,
          integratedAttackFlatBonus: 0,
        });
        const initiationResults = combat.initiateCombat();
        // Store only the necessary combat data, avoiding circular references
        caster.combatSent.push(
          JSON.parse(JSON.stringify(combat.combatResults))
        );
        console.log("Sent combat:", caster.combatSent);

        unit.combatReceived = JSON.parse(JSON.stringify(combat.combatResults));
        console.log("received combat:", unit.combatReceived);

        // modifiedUnit.combatReceived = JSON.parse(
        //   JSON.stringify(combat.combatResults)
        // );

        const newEffect = {
          name: "uwu",
          duration: 7,
          appliedAt: gameState.currentTurn,
          description: "Under the effect of Mahalapraya",
        };

        // Modify the copy
        // modifiedUnit.hp = newHp;
        unit.effectsReceived = [...currentEffects, newEffect];

        console.log("Applying effect to unit:", {
          unitName: unit.name,
          current: unit.hp,
          newEffect,
        });

        // Create a copy of the unit for statusIfHit
        const modifiedUnit = JSON.parse(JSON.stringify(unit));

        console.log("✅ Applied combat and effect to:", unit.name);

        return {
          ...unit,
          statusIfHit: modifiedUnit,
          backUpStatus: backUpUnit,
        };
      }
      return unit;
    });

    const newGameState = {
      ...gameState,
      units: updatedUnits,
    };
    console.log("🎯 GOGH MAHALAPRAYA COMPLETED SUCCESSFULLY! 🎯");
    console.log("MicroAction execution result:", {
      updatedUnitsCount: updatedUnits.length,
      affectedUnits: updatedUnits.filter((u) =>
        u.effects?.some((e) => e.name === "uwu")
      ),
    });

    return newGameState;
  },
});

export const GoghTriggerEffects = {
  GoghSuccessfulAttackTrigger: GoghSuccessfulAttackTrigger,
};
export const GoghNPs = {
  SnegletaSnegurochka: new NoblePhantasm(
    "Snegleta・Snegurochka: Summer Snow, Beautiful Drops of Hoarfrost",
    "Weakens enemy defenses and seals their skills while dealing massive magical damage",
    42, // cooldown
    3, // rangeOfBasicAttack + 1
    [snegletaDefenseDownMicroAction, snegletaDamageAndSealMicroAction],
    true, // isAttack
    true, // affectsAttackCount
    false, // isReactionary
    6 // usableFromRound
  ),
};

const dodgeMicroAction = new MicroAction({
  targetingType: TargetingType.SELF,
  range: 0,
  effectLogic: (gameState, caster, affectedCells) => {
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.id === caster.id) {
        return {
          ...unit,
          effects: [
            ...(unit.effects || []),
            {
              name: "Dodge",
              type: "DefenseUp",
              duration: 1,
              appliedAt: gameState.currentTurn,
              value: 50,
              flatOrMultiplier: "multiplier",
            },
          ],
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: updatedUnits,
    };
  },
});
export const GoghActions = {
  common: {
    dodge: new Action(
      "Dodge",
      "Increases defense by 50% until next turn",
      3, // cooldown
      0, // self-targeting
      [dodgeMicroAction],
      ActionType.common,
      true, // is reactionary
      false,
      false
    ),
  },
  unique: {},
};

// Define Gogh's skills
export const GoghSkills = {
  ChannelMarkerSoul: new Skill(
    "Channel Marker Soul",
    "Applies buffs to ally, grants special Gogh buff to self, and redistributes curses",
    4, // cooldown in turns
    2, // range
    [
      channelMarkerAllyBuffMicroAction,
      channelMarkerGoghBuffMicroAction,
      channelMarkerCurseRedistributionMicroAction,
    ],
    false, // not an attack skill
    false, // doesn't affect attack count
    false // not reactionary
  ),
  Mahalapraya: new Skill(
    "Mahalapraya",
    "Hits a 7x7 panel area within 6 cells. Applies 'uwu' effect and deals 5x ATK damage.",
    5, // cooldown
    6, // range
    [mahalaprayaMicroAction],
    true, // isAttack
    true, //counts towards limit of attacks
    true
  ),
};

// Define Gogh's base stats and attributes
export const GoghAttributes = {
  name: "Gogh",
  class: "Archer",
  // Base Stats
  baseHp: 1200,
  maxHp: 1200,
  baseDef: 1,
  baseMovementRange: 5,
  movementRange: 5,
  movementLeft: 5,
  rangeOfBasicAttack: 2,
  // Combat Stats
  strength: 200, // Physical attack power
  magic: 300, // Magical attack power
  // Vision and Targeting
  visionRange: 5,
  // Agility Stats
  baseAgility: 16,
  maxAgility: 20,
  // Luck Stats
  baseLuck: 2,
  maxLuck: 12,
  // Sustainability
  sustainability: "4",
  // Visual
  sprite: "dist/sprites/(Archer) Gogh_portrait.webp",
  combatSent: [],
  combatReceived: {},
  processedCombatSent: [],
  processedCombatReceived: [],
  canCounter: false,
  counteringAgainstWho: null,
  agilityChecks: null,
  luckChecks: null,
  triggerEffects: [],
  effects: [
    {
      name: "Freedom's Blessing",
      type: "Specific Immunity",
      immuneTo: ["Immobility Debuffs"],
      duration: null,
      uses: 1,
      appliedAt: 1, // Adjust this to your current game turn
      description: "Divine blessing grants immunity to one immobility effect",
      source: "Divine Protection",
      archetype: "buff",
      category: "Defensive Buffs",
      removable: false,
    },
  ],
  aboardVehicle: null, // ID of vehicle this unit is aboard, null if not aboard
  vehicleRelativePosition: null, // {x, y} relative position within vehicle
  isVehicle: false, // Mark regular units as not vehicles
};

// Export complete Gogh unit template
export const GoghTemplate = {
  ...GoghAttributes,
  // These will be populated by UnitUtils methods when needed
  statusIfHit: null,
  backUpStatus: null,
  triggerEffects: [
    // Initially empty - trigger effects are added dynamically by skills/buffs
  ],
  skills: [
    {
      id: "Gogh_ChannelMarkerSoul",
      onCooldownUntil: 0,
      isAttack: false, // New property
      affectsAttackCount: false, // New property
    },
    {
      id: "Gogh_Mahalapraya",
      onCooldownUntil: 0,
      isAttack: true, // New property
      affectsAttackCount: true, // New property
    },
  ],
  noblePhantasms: [
    {
      id: "Gogh_SnegletaSnegurochka",
      name: "Snegleta・Snegurochka: Summer Snow, Beautiful Drops of Hoarfrost",
      description:
        "Weakens enemy defenses and seals their skills while dealing massive magical damage",
      cooldown: 42,
      onCooldownUntil: 0,
      isAttack: true,
      affectsAttackCount: true,
    },
  ],
  reactions: [
    {
      id: 1,
      name: "Gogh_Instinct",
      description: "May evade incoming attacks",
    },
  ],
  actions: {
    common: [
      {
        id: "Gogh_dodge",
        onCooldownUntil: 0,
      },
    ],
    unique: [
      {
        id: "Gogh_winterEscape",
        onCooldownUntil: 0,
      },
    ],
  },
};

//notes, sucessive microActions chaining (see: SnegletaSnegurochka) will require for the 2nd and onward effect to change how modified unit is defined, modifiedUnit = unit.statusIfHit (see snegletaDamageAndSealMicroAction)
