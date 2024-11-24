const handleDoNothing = () => {
  const currentAttacker = gameState.units.find(
    (u) => u.id === unit.combatReceived.attacker.id
  );
  const currentDefender = gameState.units.find(
    (u) => u.id === unit.combatReceived.defender.id
  );

  if (!currentAttacker || !currentDefender) {
    console.error("Could not find current units");
    return;
  }

  const currentAttackerDeepCopy = JSON.parse(JSON.stringify(currentAttacker));

  const currentDefenderDeepCopy = JSON.parse(JSON.stringify(currentDefender));

  const gameStateDeepCopy = JSON.parse(JSON.stringify(gameState));

  const combat = new Combat({
    typeOfAttackCausingIt: unit.combatReceived.typeOfAttackCausingIt,
    proportionOfMagicUsed: unit.combatReceived.proportionOfMagicUsed,
    proportionOfStrengthUsed: unit.combatReceived.proportionOfStrengthUsed,
    attacker: currentAttackerDeepCopy,
    defender: currentDefenderDeepCopy,
    gameState: gameStateDeepCopy,
    integratedAttackMultiplier: unit.combatReceived.integratedAttackMultiplier,
    integratedAttackFlatBonus: unit.combatReceived.integratedAttackFlatBonus,
    isAoE: unit.combatReceived.isAoE || false,
  });
  combat.finalResults = unit.combatReceived;
  const finalResults = combat.receiveCombat();
  unit.combatReceived = finalResults;

  // unit.statusIfHit.hp =
  //   unit.statusIfHit.hp - finalResults.finalDamage.total;
  // unit = JSON.parse(JSON.stringify(unit.statusIfHit));
  const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
  const newEffect = unit.effectsReceived;

  const updatedUnit = {
    ...unit,
    hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
    effects: [...currentEffects, newEffect],
  };

  sendJsonMessage({
    type: "GAME_ACTION",
    action: "RECEIVE_ATTACK",
    updatedUnit,
    combatResults: finalResults,
  });

  onClose();
};
