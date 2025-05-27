// src/game/NoblePhantasm.js
import { TargetingLogic } from "../game/targeting/TargetingLogic.js";
import { TargetingType } from "../game/targeting/TargetingTypes.js";

export class NoblePhantasm {
  constructor(
    name,
    description,
    cooldown,
    range,
    microActions,
    isAttack = false,
    affectsAttackCount = false,
    isReactionary = false,
    usableFromRound = 6 // Default to round 6
  ) {
    this.name = name;
    this.description = description;
    this.cooldown = cooldown;
    this.range = range;
    this.microActions = microActions;
    this.onCooldownUntil = 0;
    this.isAttack = isAttack;
    this.affectsAttackCount = affectsAttackCount;
    this.isReactionary = isReactionary;
    this.usableFromRound = usableFromRound;

    this.isOnCooldown = this.isOnCooldown.bind(this);
    this.startCooldown = this.startCooldown.bind(this);
    this.execute = this.execute.bind(this);
  }

  isOnCooldown(currentTurn) {
    return currentTurn < this.onCooldownUntil;
  }

  canUseNPOnThisRound(currentRound) {
    return currentRound >= this.usableFromRound;
  }

  startCooldown(currentTurn) {
    this.onCooldownUntil = currentTurn + this.cooldown;
  }

  execute(gameState, caster, targetX, targetY) {
    console.log("NP Execute called with:", {
      gameState: gameState?.currentRound,
      caster: caster?.name,
      targetX,
      targetY,
      usableFromRound: this.usableFromRound,
    });

    if (this.isOnCooldown(gameState.currentTurn)) {
      console.log("NP is on cooldown");
      return {
        success: false,
        message: "Noble Phantasm is on cooldown",
      };
    }

    if (!this.canUseNPOnThisRound(gameState.currentRound)) {
      console.log("NP cannot be used this round");
      return {
        success: false,
        message: `Noble Phantasm cannot be used until round ${this.usableFromRound}`,
      };
    }

    let updatedGameState = { ...gameState };

    // Execute each microaction in sequence
    for (const microAction of this.microActions) {
      const affectedCells = microAction.getAffectedCells(
        caster,
        targetX,
        targetY,
        11
      );
      updatedGameState = microAction.execute(
        updatedGameState,
        caster,
        affectedCells
      );
    }

    this.startCooldown(gameState.currentTurn);

    return {
      success: true,
      message: `${this.name} executed successfully`,
      updatedGameState,
    };
  }
}

export const createNoblePhantasm = (
  name,
  description,
  cooldown,
  range,
  microActions,
  isAttack = false,
  affectsAttackCount = false,
  isReactionary = false,
  usableFromRound = 6
) => {
  return new NoblePhantasm(
    name,
    description,
    cooldown,
    range,
    microActions,
    isAttack,
    affectsAttackCount,
    isReactionary,
    usableFromRound
  );
};
