export class Action {
  constructor(
    name,
    description,
    cooldown,
    range,
    microActions,
    type,
    isAttack = false,
    affectsAttackCount = false,
    isReactionary = false,
    rankLetter = null,
    rankScale = null
  ) {
    this.name = name;
    this.description = description;
    this.cooldown = cooldown;
    this.range = range;
    this.microActions = microActions;
    this.type = type;
    this.onCooldownUntil = 0;
    this.isAttack = isAttack;
    this.affectsAttackCount = affectsAttackCount;
    this.isReactionary = false;
    this.rankLetter = null;
    this.rankScale = null;

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
        message: "action is on cooldown",
      };
    }

    // Check if unit has already attacked this turn and this is an attack action
    if (this.isAttack && this.affectsAttackCount && caster.hasAttacked) {
      return {
        success: false,
        message: "Unit has already attacked this turn",
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
        affectedCells,
        this
      );
    }

    // Update hasAttacked status if this was an attack that affects attack count
    if (this.isAttack && this.affectsAttackCount) {
      updatedGameState = {
        ...updatedGameState,
        units: updatedGameState.units.map((unit) =>
          unit.id === caster.id ? { ...unit, hasAttacked: true } : unit
        ),
      };
    }

    this.startCooldown(gameState.currentTurn);

    return {
      success: true,
      message: `${this.name} executed successfully`,
      updatedGameState,
    };
  }
}
