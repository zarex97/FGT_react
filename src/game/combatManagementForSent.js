const CombatManagementMenuForSent = ({ unit, combat, onClose }) => {
  // Effect to watch for defender's initial response
  useEffect(() => {
    if (combat.response?.AgiEvasion_defender?.done) {
      if (combat.response.AgiEvasion_defender.success) {
        setAwaitingDefender(false);
        setCurrentStep(2);
      } else {
        setAwaitingDefender(true);
        setCurrentStep(2);
      }
    }
  }, [combat.response?.AgiEvasion_defender?.done]);

  // useEffect(() => {
  //   // If we have a successful agility evasion and attacker tries a luck hit
  //   if (
  //     combat.response?.AgiEvasion_defender?.success &&
  //     combat.response?.hitWithLuck_attacker?.done
  //   ) {
  //     setAwaitingAttacker(false);
  //     // If attacker succeeded with luck hit, show luck evade option
  //     if (
  //       combat.response?.hitWithLuck_attacker.success &&
  //       !combat.response?.evadeWithLuck_defender?.done
  //     ) {
  //       setCurrentStep(2);
  //     } else {
  //       setCurrentStep(3);
  //       setReadyToConfirm(true);
  //     }
  //   }
  // }, [unit.combatReceived?.response]);

  // Effect to watch for defender's luck response
  useEffect(() => {
    if (combat.response?.evadeWithLuck_defender?.done) {
      setAwaitingDefender(false);
      setCurrentStep(3);
      setReadyToConfirm(true);
    }
  }, [combat.response?.evadeWithLuck_defender?.done]);

  const performCheck = (type) => {
    const baseRoll = Math.floor(Math.random() * 20) + 1;
    let totalModifier = 0;

    if (type === "luck") {
      if (unit.baseLuck < combat.defender.baseLuck) totalModifier -= 4;
      if (combat.isAoE) totalModifier += 2;
    }

    const finalRoll = baseRoll + totalModifier;
    const threshold = unit.baseLuck;
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

  const handleLuckHit = () => {
    setActiveCheck("luck");
    const luckCheck = performCheck("luck");

    const updatedResponse = {
      ...combat.response,
      hitWithLuck_attacker: {
        done: true,
        success: luckCheck.success,
      },
      currentStep: 2,
      awaitingDefender: true,
      awaitingAttacker: false,
    };

    if (luckCheck.success) {
      setAwaitingDefender(true);
      setAwaitingAttacker(false);
      setCurrentStep(2);
      updateCombatResponse(updatedResponse);
    } else {
      setCurrentStep(3);
      setReadyToConfirm(true);
      setAwaitingDefender(false);
      const updatedResponse2 = {
        ...updatedResponse,
        currentStep: 3,
        awaitingDefender: false,
        readyToConfirm: true,
      };
      updateCombatResponse(updatedResponse2);
    }
  };

  const updateCombatResponse = (updatedResponse) => {
    const attackerId = unit.id;
    const defenderId = combat.defender.id;

    console.log("Sending combat response update:", {
      attackerId,
      defenderId,
      response: updatedResponse,
    });

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "UPDATE_COMBAT_RESPONSE",
      attackerId,
      defenderId,
      response: updatedResponse,
    });

    setCurrentStep(updatedResponse.currentStep);
    setReadyToConfirm(updatedResponse.readyToConfirm);
    setAwaitingDefender(updatedResponse.awaitingDefender);
    setAwaitingAttacker(updatedResponse.awaitingAttacker);
  };

  const handleDoNothing = () => {
    const currentAttacker = gameState.units.find((u) => u.id === unit.id);
    const currentDefender = gameState.units.find(
      (u) => u.id === combat.defender.id
    );

    if (!currentAttacker || !currentDefender) {
      console.error("Could not find current units");
      return;
    }

    const currentAttackerDeepCopy = JSON.parse(JSON.stringify(currentAttacker));
    const currentDefenderDeepCopy = JSON.parse(JSON.stringify(currentDefender));
    const gameStateDeepCopy = JSON.parse(JSON.stringify(gameState));

    //forSentCombats
    const combatInstance = new Combat({
      typeOfAttackCausingIt: combat.typeOfAttackCausingIt,
      proportionOfMagicUsed: combat.proportionOfMagicUsed,
      proportionOfStrengthUsed: combat.proportionOfStrengthUsed,
      attacker: currentAttackerDeepCopy,
      defender: currentDefenderDeepCopy,
      gameState: gameStateDeepCopy,
      integratedAttackMultiplier: combat.integratedAttackMultiplier,
      integratedAttackFlatBonus: combat.integratedAttackFlatBonus,
      isAoE: combat.isAoE || false,
    });

    // Copy over the stored combat results
    combatInstance.combatResults = JSON.parse(JSON.stringify(combat));

    const finalResults = combatInstance.receiveCombat();

    const updatedDefender = {
      ...currentDefender,
      hp: Math.max(0, currentDefender.hp - finalResults.finalDamage.total),
      effects: [
        ...(currentDefender.effects || []),
        currentDefender.effectsReceived,
      ],
    };

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "RECEIVE_ATTACK",
      updatedUnit: updatedDefender,
      combatResults: finalResults,
    });

    onClose();
  };

  const determineOutcome = (response) => {
    // Command Seal auto-wins
    if (response.evadeWithCS_defender?.success) {
      return "evade";
    }

    // Check Luck tier
    const attackerLuckSuccess = response.hitWithLuck_attacker?.success;
    const defenderLuckSuccess = response.evadeWithLuck_defender?.success;

    if (attackerLuckSuccess && !defenderLuckSuccess) {
      return "hit";
    }
    if (!attackerLuckSuccess && defenderLuckSuccess) {
      return "evade";
    }
    if (attackerLuckSuccess && defenderLuckSuccess) {
      // Luck cancels out, check Agility
      return response.AgiEvasion_defender?.success ? "evade" : "hit";
    }

    // No luck checks or both failed, check Agility
    return response.AgiEvasion_defender?.success ? "evade" : "hit";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Combat Management (Attacker)</h3>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Combat info - Always shown */}
          <div className="p-3 border rounded">
            <h4 className="font-bold mb-2">Outgoing Combat</h4>
            <p>To: {combat.defender.name}</p>
            <p>Type: {combat.typeOfAttackCausingIt}</p>
            <p>Potential Damage: {combat.finalDamage.total}</p>

            {combat.response && (
              <CombatResponse response={combat.response} combat={combat} />
            )}
          </div>

          {/* Step 1: Awaiting Defender */}
          {currentStep === 1 && awaitingDefender && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-center">
              <p className="text-yellow-700 font-semibold">
                Awaiting Defender's Response...
              </p>
            </div>
          )}

          {/* Step 2: After Defender's Evasion */}
          {currentStep === 2 && (!awaitingDefender || awaitingAttacker) && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleLuckHit}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                disabled={combat.response?.hitWithLuck_attacker?.done}
              >
                Try Luck Hit
              </button>
              <button
                onClick={() => {
                  setCurrentStep(3);
                  setReadyToConfirm(true);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Skip
              </button>
            </div>
          )}

          {/* Step 2.5: Awaiting Defender's Luck Response */}
          {currentStep === 2 &&
            awaitingDefender &&
            combat.response?.hitWithLuck_attacker?.success && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-center">
                <p className="text-yellow-700 font-semibold">
                  Awaiting Defender's Response to Luck Hit...
                </p>
                {combat.response?.evadeWithLuck_defender?.done && (
                  <button
                    onClick={() => {
                      setCurrentStep(3);
                      setReadyToConfirm(true);
                      setAwaitingDefender(false);
                    }}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Continue
                  </button>
                )}
              </div>
            )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && readyToConfirm && (
            <div className="mt-4">
              <button
                onClick={() => {
                  const outcome = determineOutcome(combat.response);
                  if (outcome === "hit") {
                    handleDoNothing();
                  } else {
                    onClose();
                  }
                }}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm Results of Combat
              </button>
            </div>
          )}

          {/* Check Result Display */}
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
                Roll: {checkResult.roll} {checkResult.modifiers >= 0 ? "+" : ""}
                {checkResult.modifiers}= {checkResult.finalRoll} vs{" "}
                {checkResult.threshold}
              </div>
            </div>
          )}

          {/* History Displays */}
          <CheckHistoryDisplay checks={unit.luckChecks} type="Luck" />
        </div>
      </div>
    </div>
  );
};
