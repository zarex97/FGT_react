import { TargetingLogic } from "../game/targeting/TargetingLogic.js";
import { TargetingType } from "../game/targeting/TargetingTypes.js";

export class MicroAction {
  constructor({
    targetingType,
    range,
    applyCornerRule = false,
    dimensions = null,
    effectLogic,
  }) {
    this.targetingType = targetingType;
    this.range = range;
    this.applyCornerRule = applyCornerRule;
    this.dimensions = dimensions;
    this.effectLogic = effectLogic;
  }

  getAffectedCells(caster, targetX, targetY, gridSize) {
    return TargetingLogic.getAffectedCells({
      targetingType: this.targetingType,
      casterX: caster.x,
      casterY: caster.y,
      range: this.range,
      targetX,
      targetY,
      applyCornerRule: this.applyCornerRule,
      gridSize,
      dimensions: this.dimensions,
    });
  }

  execute(gameState, caster, affectedCells, skill = null) {
    return this.effectLogic(gameState, caster, affectedCells, skill);
  }
}
