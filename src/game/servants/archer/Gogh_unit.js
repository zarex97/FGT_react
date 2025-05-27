// src/game/servants/archer/Gogh_unit.js
import { MicroAction } from "../../MicroAction";
import { Skill } from "../../Skill";
import { TargetingType } from "../../targeting/TargetingTypes";
import { Combat } from "../../Combat";
import { Action } from "../../actions/Action";
import { ActionType } from "../../actions/ActionTypes";
import { NoblePhantasm } from "../../NoblePhantasm";
import { TriggerEffect } from "../TriggerEffect";
import { EventTypes } from "../EventTypes";

// MicroAction 1: Apply buffs to ally within 2 panels
const channelMarkerAllyBuffMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_FROM_POINT_WITHIN_RANGE,
  range: 2,
  dimensions: { width: 5, height: 5 },
  applyCornerRule: true,
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
export const GoghSuccessfulAttackTrigger = new TriggerEffect({
  eventType: EventTypes.SUCCESSFUL_ATTACK,
  name: "Gogh Buff Trigger",
  description:
    "Removes curse and applies attack buff when Gogh successfully attacks",
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

        // Remove one stage of Curse from Gogh
        const curseIndex = updatedUnit.effects?.findIndex(
          (e) => e.name === "Curse"
        );
        if (curseIndex !== -1) {
          updatedUnit.effects = [...updatedUnit.effects];
          updatedUnit.effects.splice(curseIndex, 1);
          curseRemoved = true;
        }

        // If curse was removed, apply Attack Up buff
        if (curseRemoved) {
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

          updatedUnit.effects = [
            ...(updatedUnit.effects || []),
            attackUpEffect,
          ];

          // If it was a critical, remove second curse and apply buff twice
          if (eventData.wasCritical) {
            const secondCurseIndex = updatedUnit.effects?.findIndex(
              (e) => e.name === "Curse"
            );
            if (secondCurseIndex !== -1) {
              updatedUnit.effects.splice(secondCurseIndex, 1);
            }

            // Apply the attack up buff a second time
            updatedUnit.effects = [
              ...updatedUnit.effects,
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

        return {
          ...unit,
          effects: [...currentEffects, goghBuffEffect],
          triggerEffects: [
            ...currentTriggerEffects,
            GoghSuccessfulAttackTrigger,
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

// MicroAction 3: Curse redistribution
const channelMarkerCurseRedistributionMicroAction = new MicroAction({
  targetingType: TargetingType.AOE_AROUND_SELF,
  range: 3,
  dimensions: { width: 7, height: 7 },
  applyCornerRule: false,
  effectLogic: (gameState, caster, affectedCells) => {
    let collectedCurses = [];

    // First pass: collect all curse effects from units in range
    const updatedUnits = gameState.units.map((unit) => {
      if (unit.id !== caster.id && affectedCells.has(`${unit.x},${unit.y}`)) {
        const curseEffects =
          unit.effects?.filter((e) => e.name === "Curse") || [];
        collectedCurses = [...collectedCurses, ...curseEffects];

        // Remove curses from this unit
        return {
          ...unit,
          effects: unit.effects?.filter((e) => e.name !== "Curse") || [],
        };
      }
      return unit;
    });

    // Second pass: apply all collected curses to Gogh
    const finalUnits = updatedUnits.map((unit) => {
      if (unit.id === caster.id) {
        const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
        return {
          ...unit,
          effects: [...currentEffects, ...collectedCurses],
        };
      }
      return unit;
    });

    return {
      ...gameState,
      units: finalUnits,
    };
  },
});

// The complete skill definition
export const GoghChannelMarkerSoul = new Skill(
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
);

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
  GoghChannelMarkerSoul: new Skill(
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
};

// Export complete Gogh unit template
export const GoghTemplate = {
  ...GoghAttributes,
  // These will be populated by UnitUtils methods when needed
  statusIfHit: null,
  backUpStatus: null,
  skills: [
    {
      id: "ChannelMarkerSoul",
      onCooldownUntil: 0,
      isAttack: false, // New property
      affectsAttackCount: false, // New property
    },
  ],
  noblePhantasms: [
    {
      id: "SnegletaSnegurochka",
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
      name: "Instinct",
      description: "May evade incoming attacks",
    },
  ],
  actions: {
    common: [
      {
        id: "dodge",
        onCooldownUntil: 0,
      },
    ],
    unique: [
      {
        id: "winterEscape",
        onCooldownUntil: 0,
      },
    ],
  },
};

//notes, sucessive microActions chaining (see: SnegletaSnegurochka) will require for the 2nd and onward effect to change how modified unit is defined, modifiedUnit = unit.statusIfHit (see snegletaDamageAndSealMicroAction)
