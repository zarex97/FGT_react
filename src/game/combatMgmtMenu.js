const CombatManagementMenu = ({ unit, onClose }) => {
  const [activeCheck, setActiveCheck] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [showLuckOption, setShowLuckOption] = useState(false);

  const handleDoNothing = () => {
    const currentAttacker = gameState.units.find(
      (u) => u.id === unit.statusIfHit.combatReceived.attacker.id
    );
    const currentDefender = gameState.units.find(
      (u) => u.id === unit.statusIfHit.combatReceived.defender.id
    );

    if (!currentAttacker || !currentDefender) {
      console.error("Could not find current units");
      return;
    }

    const combat = new Combat({
      typeOfAttackCausingIt:
        unit.statusIfHit.combatReceived.typeOfAttackCausingIt,
      proportionOfMagicUsed:
        unit.statusIfHit.combatReceived.proportionOfMagicUsed,
      proportionOfStrengthUsed:
        unit.statusIfHit.combatReceived.proportionOfStrengthUsed,
      attacker: currentAttacker,
      defender: currentDefender,
      gameState: gameState,
      integratedAttackMultiplier:
        unit.statusIfHit.combatReceived.integratedAttackMultiplier,
      integratedAttackFlatBonus:
        unit.statusIfHit.combatReceived.integratedAttackFlatBonus,
      isAoE: unit.statusIfHit.combatReceived.isAoE || false,
    });

    const finalResults = combat.receiveCombat();
    unit.combatReceived = finalResults;
    unit.statusIfHit.combatReceived = finalResults;

    unit.statusIfHit.hp = unit.statusIfHit.hp - finalResults.finalDamage.total;
    unit = JSON.parse(JSON.stringify(unit.statusIfHit));

    const updatedUnit = {
      ...unit,
      hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
    };

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "RECEIVE_ATTACK",
      updatedUnit,
      combatResults: finalResults,
    });

    onClose();
  };

  const handleBlock = () => {
    const currentDefender = gameState.units.find(
      (u) => u.id === unit.statusIfHit.combatReceived.defender.id
    );

    if (!currentDefender) return;

    // Add temporary block effect
    const blockEffect = {
      name: "BlockDefense",
      type: "DefenseUp",
      duration: 1,
      appliedAt: gameState.currentTurn,
      value: 30,
      flatOrMultiplier: "multiplier",
    };

    currentDefender.effects = [...(currentDefender.effects || []), blockEffect];

    // Proceed with combat resolution
    handleDoNothing();

    // Remove block effect
    currentDefender.effects = currentDefender.effects.filter(
      (e) => e.name !== "BlockDefense"
    );
  };

  const performCheck = (type) => {
    const baseRoll = Math.floor(Math.random() * 20) + 1;
    let totalModifier = 0;
    const combat = unit.combatReceived;

    // Calculate modifiers
    if (type === "agility") {
      if (unit.baseAgility < combat.attacker.baseAgility) totalModifier -= 4;
      if (combat.typeOfAttackCausingIt === "NP") totalModifier += 3;
      if (combat.isAoE) totalModifier += 2;
    } else if (type === "luck") {
      if (unit.baseLuck < combat.attacker.baseLuck) totalModifier -= 4;
      if (combat.isAoE) totalModifier += 2;
    }

    const finalRoll = baseRoll + totalModifier;
    const threshold = type === "agility" ? unit.baseAgility : unit.baseLuck;
    const success = finalRoll <= threshold;

    const result = {
      type,
      roll: baseRoll,
      modifiers: totalModifier,
      finalRoll,
      threshold,
      success,
      turn: gameState.currentTurn,
    };

    // Update check history
    const historyKey = `${type}Checks`;
    unit[historyKey] = [...(unit[historyKey] || []).slice(-9), result];

    setCheckResult(result);
    return result;
  };

  const handleEvade = async () => {
    setActiveCheck("agility");
    const agilityCheck = performCheck("agility");

    const updatedResponse = {
      ...(unit.combatReceived.response || {}),
      AgiEvasion_defender: {
        done: true,
        success: agilityCheck.success,
      },
    };

    updateCombatResponse(updatedResponse);

    if (!agilityCheck.success) {
      setShowLuckOption(true);
    }
  };

  const handleLuckEvade = () => {
    setActiveCheck("luck");
    const luckCheck = performCheck("luck");

    const updatedResponse = {
      ...unit.combatReceived.response,
      evadeWithLuck_defender: {
        done: true,
        success: luckCheck.success,
      },
    };

    updateCombatResponse(updatedResponse);
  };

  const handleCommandSeal = () => {
    const updatedResponse = {
      AgiEvasion_defender: { done: true, success: true },
      hitWithLuck_attacker: { done: false, success: false },
      evadeWithLuck_defender: { done: false, success: false },
    };

    updateCombatResponse(updatedResponse);

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "USE_COMMAND_SEAL",
      unitId: unit.id,
      purpose: "evade",
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Combat Management</h3>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
            ✕
          </button>
        </div>

        {unit.combatReceived && (
          <div className="space-y-4">
            <div className="p-3 border rounded">
              <h4 className="font-bold mb-2">Incoming Combat</h4>
              <p>From: {unit.combatReceived.attacker.name}</p>
              <p>Type: {unit.combatReceived.typeOfAttackCausingIt}</p>
              <p>
                Potential Damage:{" "}
                {unit.combatReceived.combatResults.finalDamage.total}
              </p>

              {unit.combatReceived.response && (
                <CombatResponse
                  response={unit.combatReceived.response}
                  combat={unit.combatReceived}
                />
              )}
            </div>

            {!unit.combatReceived.response && (
              <div className="flex gap-2">
                <button
                  onClick={handleDoNothing}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Do Nothing
                </button>
                <button
                  onClick={handleBlock}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Block
                </button>
                <button
                  onClick={handleEvade}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Evade
                </button>
              </div>
            )}

            {showLuckOption && (
              <div className="mt-4">
                <button
                  onClick={handleLuckEvade}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Try Luck Evasion
                </button>
                <button
                  onClick={handleCommandSeal}
                  className="ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Use Command Seal
                </button>
              </div>
            )}

            {checkResult && (
              <div className="p-3 bg-gray-100 rounded">
                <h4 className="font-bold">Check Result</h4>
                <div
                  className={`text-lg ${
                    checkResult.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {checkResult.type.charAt(0).toUpperCase() +
                    checkResult.type.slice(1)}{" "}
                  Check: {checkResult.success ? "Success!" : "Failed"}
                </div>
                <div className="text-sm">
                  Roll: {checkResult.roll}{" "}
                  {checkResult.modifiers >= 0 ? "+" : ""}
                  {checkResult.modifiers}= {checkResult.finalRoll} vs{" "}
                  {checkResult.threshold}
                </div>
              </div>
            )}

            <CheckHistoryDisplay checks={unit.agilityChecks} type="Agility" />
            <CheckHistoryDisplay checks={unit.luckChecks} type="Luck" />
          </div>
        )}
      </div>
    </div>
  );
};
