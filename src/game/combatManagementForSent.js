const CombatManagementMenuForSent = ({ unit, defenderId, onClose }) => {
  // // Get fresh combat data from unit's combatSent array
  // const comba1 = useMemo(() => {
  //   return unit.combatSent.find((c) => c.defender.id === defenderId);
  // }, [unit.combatSent, defenderId]);
  const defender = gameState.units.find((u) => u.id === defenderId);
  const combat = defender?.combatReceived;

  console.log("combat obtained on MenuForSent:", combat);

  // Helper function to check if combat object is valid/has required data
  const isCombatValid = (combat) => {
    if (!combat) return false;
    if (typeof combat !== "object") return false;
    if (Object.keys(combat).length === 0) return false; // Empty object
    if (!combat.defender || !combat.attacker) return false; // Missing required properties
    return true;
  };

  // if (combat.response.currentStep > 1) {
  //   setCurrentStep(1);
  //   setAwaitingAttacker(false);
  //   setReadyToConfirm(false);
  //   setAwaitingDefender(true);
  //   setHasProcessedResponse(false);
  // }

  // Defensive programming: If combat is invalid/empty, close the menu
  useEffect(() => {
    if (!isCombatValid(combat)) {
      console.log(
        "Combat data not found or invalid, closing menu. Combat:",
        combat
      );
      onClose();
      return;
    }
  }, [combat, onClose]);

  // If combat is not available or invalid, show loading message briefly before closing
  if (!isCombatValid(combat)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 w-[500px]">
          <div className="text-center">
            <p className="text-gray-600">
              Combat data unavailable. Menu will close shortly...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Effect to watch for defender's initial response
  useEffect(() => {
    if (!combat) return;
    console.log("Effect triggered. Combat response:", combat.response);

    if (combat.response?.AgiEvasion_defender?.done) {
      if (combat.response.AgiEvasion_defender.success) {
        // If defender succeeds agility check, show attacker luck hit options
        console.log(
          "Defender succeeded agility check - showing luck hit options"
        );
        setAwaitingDefender(false);
        setAwaitingAttacker(true);
        setCurrentStep(2);
        setReadyToConfirm(false);
      } else {
        // If defender fails agility check, wait for their luck evade attempt
        console.log("Defender failed agility check - waiting for luck evade");
        setAwaitingDefender(true);
        setAwaitingAttacker(false);
        setCurrentStep(1);
        setReadyToConfirm(false);
      }
    }
  }, [combat.response?.AgiEvasion_defender]);

  // Second useEffect - Handle defender's luck evade after failed agility
  useEffect(() => {
    if (!combat) return;
    if (
      combat.response?.evadeWithLuck_defender?.done &&
      !combat.response?.AgiEvasion_defender?.success
    ) {
      if (combat.response.evadeWithLuck_defender.success) {
        // If defender succeeds luck evade after failed agility, show attacker options
        console.log(
          "Defender succeeded luck evade after failed agility - showing luck hit options"
        );
        setAwaitingDefender(false);
        setAwaitingAttacker(true);
        setCurrentStep(2);
        setReadyToConfirm(false);
      } else {
        // If defender fails luck evade after failed agility, move to confirmation
        console.log(
          "Defender failed luck evade after failed agility - moving to confirmation"
        );
        setAwaitingDefender(false);
        setAwaitingAttacker(false);
        setCurrentStep(3);
        setReadyToConfirm(true);
      }
    }
  }, [
    combat.response?.evadeWithLuck_defender,
    combat.response?.AgiEvasion_defender,
  ]);

  // Third useEffect - Handle defender's luck evade after attacker's luck hit
  useEffect(() => {
    if (!combat) return;
    if (
      combat.response?.hitWithLuck_attacker?.success &&
      combat.response?.evadeWithLuck_defender?.done
    ) {
      // After defender responds to our luck hit, always move to confirmation
      console.log("Defender responded to luck hit - moving to confirmation");
      setAwaitingDefender(false);
      setAwaitingAttacker(false);
      setCurrentStep(3);
      setReadyToConfirm(true);
    }
  }, [
    combat.response?.hitWithLuck_attacker,
    combat.response?.evadeWithLuck_defender,
  ]);
  // fourth useEffect - Handle defender's luck evade after attacker's luck hit
  useEffect(() => {
    if (!combat) return;
    if (
      !combat.response?.hitWithLuck_attacker?.success &&
      combat.response?.hitWithLuck_attacker?.done
    ) {
      // If the luck hits fails, there is nothing else to do on the attacker part,  move to confirmation
      console.log("Luck hit failed - moving to confirmation");
      setAwaitingDefender(false);
      setAwaitingAttacker(false);
      setCurrentStep(3);
      setReadyToConfirm(true);
    }
  }, [combat.response?.hitWithLuck_attacker]);

  const performCheck = (type) => {
    const baseRoll = Math.floor(Math.random() * 20) + 1;
    let totalModifier = 0;

    if (type === "luck") {
      if (unit.baseLuck < combat.defender.baseLuck) totalModifier += 4;
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
      //if the luck hit succeeds but the luck evasion also succeeded we should go straight to the confirmation view
      if (updatedResponse.evadeWithLuck_defender.success) {
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
      //instead, if the luck hit succeeds but the luck evasion has not been done yet, then the defender should have a chance to try it
      if (!updatedResponse.evadeWithLuck_defender.done) {
        setAwaitingDefender(true);
        setAwaitingAttacker(false);
        setCurrentStep(2);
        updateCombatResponse(updatedResponse);
      }
    } else {
      // if the lucky hit failed it goes straight into step 3, as there is nothing else the attacker may do (hit with CS in the future, maybe?) nor anything else the defender must
      setCurrentStep(3);
      setReadyToConfirm(true);
      setAwaitingDefender(false);
      setAwaitingAttacker(false);
      const updatedResponse2 = {
        ...updatedResponse,
        currentStep: 3,
        awaitingDefender: false,
        awaitingAttacker: false,
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

  // handleDoNothing may be replaced by
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

  const handleConfirmCombatResults = () => {
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

    // Determine if hit or evade based on combat response
    const outcome = determineOutcome(combatInstance.combatResults.response);

    const willTriggerDoubleCounter =
      currentAttacker.counteringAgainstWho === currentDefender.id;

    let updatedDefender = {
      ...currentDefender,
    };

    //if the attack hits then it evaluates if a counter attack coming from the defending unit would be possible, if not it stops the possibility of the enemy unit countering
    if (outcome === "hit") {
      if (!willTriggerDoubleCounter) {
        updatedDefender = {
          ...currentDefender,
          canCounter: true,
          counteringAgainstWho: combat.attacker.id,
          hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
          effects: [...effects, newEffect],
        };
      } else {
        updatedDefender = {
          ...currentDefender,
          canCounter: false,
          counteringAgainstWho: null,
          hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
          effects: [...effects, newEffect],
        };
      }
    }
    // // should change canCounter to depend on willTriggerDoubleCounter, so basically, if this variable is true, then canCounter should false, and if canCounter is false, counteringAgainstWho should be null, changes must be on the server side of things for this menu and for the defender menu regarding the de-activation of canCounter after countering and this issue with preventing infinite counters
    // const updatedDefender = {
    //   ...currentDefender,
    //   canCounter: true,
    //   counteringAgainstWho: combat.attacker.id,
    //   hp: Math.max(0, currentDefender.hp - finalResults.finalDamage.total),
    //   effects: [
    //     ...(currentDefender.effects || []),
    //     currentDefender.effectsReceived,
    //   ],
    // };

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "PROCESS_COMBAT_COMPLETE",
      attackerId: combat.attacker.id,
      defenderId: combat.defender.id,
      updatedDefender,
      combatResults: finalResults,
      outcome,
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
                onClick={handleConfirmCombatResults}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm Results of Combat
              </button>
            </div>
          )}

          {/*
          Step 3: Confirmation
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
          */}

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
