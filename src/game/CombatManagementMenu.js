const CombatManagementMenu = ({ unit, onClose }) => {
  useEffect(() => {
    console.log("Current step changed:", currentStep);
    console.log("Awaiting attacker:", awaitingAttacker);
    console.log("Combat response:", unit.combatReceived?.response);
  }, [currentStep, awaitingAttacker, unit.combatReceived?.response]);
  const s_unit = gameState.units.find(
    (u) => u.id === unit.combatReceived?.defender.id
  );
  unit = s_unit;
  const d_unit = gameState.units.find(
    (u) => u.id === unit.combatReceived?.attacker.id
  );
  const d_unit_id = d_unit.id;

  const combat = unit.combatReceived;

  setCurrentStep(combat.response.currentStep);
  setAwaitingAttacker(combat.response.awaitingAttacker);
  setReadyToConfirm(combat.response.readyToConfirm);
  setAwaitingDefender(combat.response.awaitingDefender || true);

  // Add effect to watch for attacker's response
  useEffect(() => {
    if (unit.combatReceived?.response?.hitWithLuck_attacker?.done) {
      setAwaitingAttacker(false);
      setCurrentStep(3);
    }
  }, [unit.combatReceived?.response?.hitWithLuck_attacker?.done]);

  useEffect(() => {
    // If we have a successful agility evasion and attacker tries a luck hit
    if (
      unit.combatReceived?.response?.AgiEvasion_defender?.success &&
      unit.combatReceived?.response?.hitWithLuck_attacker?.done
    ) {
      setAwaitingAttacker(false);
      // If attacker succeeded with luck hit, show luck evade option
      if (
        unit.combatReceived.response.hitWithLuck_attacker.success &&
        !unit.combatReceived.response.evadeWithLuck_defender?.done
      ) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
        setReadyToConfirm(true);
      }
    }
  }, [unit.combatReceived?.response]);

  useEffect(() => {
    // When combat state changes, preserve our current step
    if (unit.combatReceived?.response) {
      // Don't reset to step 1 if we're already in a later step
      if (currentStep === 1) {
        if (unit.combatReceived.response.AgiEvasion_defender?.done) {
          if (!unit.combatReceived.response.AgiEvasion_defender.success) {
            setCurrentStep(2);
          } else {
            setAwaitingAttacker(true);
            setCurrentStep(2);
          }
        }
      }
    }
  }, [unit.combatReceived?.response]);

  // And add a state to track if we've processed the initial response
  const [hasProcessedResponse, setHasProcessedResponse] = useState(false);

  // Add safety checks for required properties
  const hasCombatSent = Object.keys(unit.combatSent).length > 0;

  const hasCombatReceived = Object.keys(unit.combatReceived).length > 0;

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

  const updateCombatResponse = (updatedResponse) => {
    const attackerId = unit.combatReceived.attacker.id;
    const defenderId = unit.id;

    console.log("Sending combat response update:", {
      attackerId,
      defenderId,
      response: updatedResponse,
    });

    // Update both attacker and defender combat information
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "UPDATE_COMBAT_RESPONSE",
      attackerId,
      defenderId,
      response: updatedResponse,
    });
    setAwaitingAttacker(updatedResponse.awaitingAttacker);
    setCurrentStep(updatedResponse.currentStep);
    setReadyToConfirm(updatedResponse.readyToConfirm);
    setAwaitingDefender(updatedResponse.awaitingDefender);
  };

  const handleDoNothing = async () => {
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

    // STEP 1: Find the attacker's player ID (WebSocket UUID) from the game state
    const attackerPlayerId = Object.keys(gameState.players).find(
      (playerId) => gameState.players[playerId].team === currentAttacker.team
    );

    if (!attackerPlayerId) {
      console.error("Could not find attacker's player ID");
      return;
    }

    // STEP 1: Send message to close attacker's menu
    console.log("Requesting to close attacker's menu...");
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "CLOSE_COMBAT_MENU",
      targetPlayerId: attackerPlayerId,
      reason: "Combat completed without counter",
    });

    // STEP 2: Wait a brief moment for the close message to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

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
      integratedAttackMultiplier:
        unit.combatReceived.integratedAttackMultiplier,
      integratedAttackFlatBonus: unit.combatReceived.integratedAttackFlatBonus,
      isAoE: unit.combatReceived.isAoE || false,
    });
    // Instead of setting finalResults, copy over the stored combat results
    combat.combatResults = JSON.parse(JSON.stringify(unit.combatReceived));

    // Now call receiveCombat to apply any defender modifications
    const finalResults = combat.receiveCombat();

    // unit.statusIfHit.hp =
    //   unit.statusIfHit.hp - finalResults.finalDamage.total;
    // unit = JSON.parse(JSON.stringify(unit.statusIfHit));
    const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
    const newEffect = unit.effectsReceived;

    //if existing, remove the blockdefense effect
    if (currentDefender.effects) {
      currentDefender.effects = currentDefender.effects.filter(
        (e) => e.name !== "BlockDefense"
      );
    }

    // Determine if hit or evade based on combat response
    const outcome = determineOutcome(combat.combatResults.response);

    let updatedAttacker = {
      ...currentAttackerDeepCopy,
    };
    const currentDefenderDeepCopy2 = JSON.parse(
      JSON.stringify(currentDefender)
    );
    let updatedUnit = {
      ...currentDefenderDeepCopy2,
      canCounter: false,
      counteringAgainstWho: null,
    };

    const willTriggerDoubleCounter = d_unit.counteringAgainstWho === unit.id;
    // can counter is set to false because this method is for when you skip counter
    if (outcome === "hit") {
      updatedUnit = {
        ...unit,
        canCounter: false,
        counteringAgainstWho: null,
        hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
        effects: [...currentEffects, newEffect],
      };
    }
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "RECEIVE_ATTACK",
      updatedUnit,
      updatedAttacker,
      combatResults: finalResults,
    });

    onClose();
  };

  const handleConfirmCombatResultsAndInitiateCounter = async () => {
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

    // STEP 1: Find the attacker's player ID (WebSocket UUID) from the game state
    const attackerPlayerId = Object.keys(gameState.players).find(
      (playerId) => gameState.players[playerId].team === currentAttacker.team
    );

    if (!attackerPlayerId) {
      console.error("Could not find attacker's player ID");
      return;
    }

    // STEP 1: Send message to close attacker's menu
    console.log("Requesting to close attacker's menu...");
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "CLOSE_COMBAT_MENU",
      targetPlayerId: attackerPlayerId,
      reason: "Combat being processed by defender",
    });

    // STEP 2: Wait a brief moment for the close message to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

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
      integratedAttackMultiplier:
        unit.combatReceived.integratedAttackMultiplier,
      integratedAttackFlatBonus: unit.combatReceived.integratedAttackFlatBonus,
      isAoE: unit.combatReceived.isAoE || false,
    });
    // Instead of setting finalResults, copy over the stored combat results
    combat.combatResults = JSON.parse(JSON.stringify(unit.combatReceived));

    // Now call receiveCombat to apply any defender modifications
    const finalResults = combat.receiveCombat();

    // unit.statusIfHit.hp =
    //   unit.statusIfHit.hp - finalResults.finalDamage.total;
    // unit = JSON.parse(JSON.stringify(unit.statusIfHit));
    const currentEffects = Array.isArray(unit.effects) ? unit.effects : [];
    const newEffect = unit.effectsReceived;

    //if existing, remove the blockdefense effect
    if (currentDefender.effects) {
      currentDefender.effects = currentDefender.effects.filter(
        (e) => e.name !== "BlockDefense"
      );
    }

    // Determine if hit or evade based on combat response
    const outcome = determineOutcome(combat.combatResults.response);

    // Create updatedAttacker - this was missing!
    let updatedAttacker = {
      ...currentAttacker,
      hasAttacked: true, // Mark as having completed their attack
    };

    let updatedDefender = currentDefender;

    //if the attack doesn't hit, then still counter would be available
    updatedDefender.canCounter = true;
    updatedDefender.counteringAgainstWho = combat.attacker.id;

    if (outcome === "hit") {
      updatedDefender = {
        ...currentDefender,
        canCounter: true,
        counteringAgainstWho: combat.attacker.id,
        hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
        effects: [...currentEffects, newEffect],
      };
    }

    // outcome doesnt seem necessary, even if it doesn't hit it will still have to send a msg to server
    // if (outcome === "hit") {
    //   updatedDefender = {
    //     ...currentDefender,
    //     hp: Math.max(0, currentDefender.hp - finalResults.finalDamage.total),
    //     canCounter: true,
    //     counteringAgainstWho: combat.attacker.id,
    //     effects: [
    //       ...(currentDefender.effects || []),
    //       ...(currentDefender.effectsReceived
    //         ? [currentDefender.effectsReceived]
    //         : []),
    //     ].filter(Boolean),
    //   };
    // }

    //currently may be out of use for updatedDefender
    const updatedUnit = {
      ...unit,
      hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
      canCounter: true,
      counteringAgainstWho: combat.attacker.id,
      effects: [...currentEffects, newEffect],
    };

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "PROCESS_COMBAT_AND_INITIATE_COUNTER",
      attackerId: combat.attacker.id,
      defenderId: combat.defender.id,
      updatedAttacker,
      updatedDefender,
      combatResults: finalResults,
      outcome,
    });

    setCurrentStep(1);
    setAwaitingAttacker(false);
    setReadyToConfirm(false);
    setAwaitingDefender(true);
    setHasProcessedResponse(false);
    onClose();
  };

  const handleBlock = () => {
    const currentDefender = gameState.units.find(
      (u) => u.id === unit.combatReceived.defender.id
    );

    if (!currentDefender) return;

    // Initialize effects array if it doesn't exist
    if (!currentDefender.effects) {
      console.log("Defender had no effects");
      currentDefender.effects = [];
    }

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

    // Proceed with combat resolution - commented out after combat steps implementation
    // handleDoNothing();

    // Safely remove block effect - commented out and moved to removeBlockDefenseEffect after combat steps implementation
    // if (currentDefender.effects) {
    //   currentDefender.effects = currentDefender.effects.filter(
    //     (e) => e.name !== "BlockDefense"
    //   );
    // }

    setCurrentStep(3);
    setReadyToConfirm(true);
  };

  const removeBlockDefenseEffect = () => {
    const currentDefender = gameState.units.find(
      (u) => u.id === unit.combatReceived.defender.id
    );

    if (!currentDefender) return;

    if (currentDefender.effects) {
      currentDefender.effects = currentDefender.effects.filter(
        (e) => e.name !== "BlockDefense"
      );
    }
  };

  const performCheck = (type) => {
    const baseRoll = Math.floor(Math.random() * 20) + 1;
    let totalModifier = 0;
    const combat = unit.combatReceived;

    // Calculate modifiers
    if (type === "agility") {
      if (unit.baseAgility < combat.attacker.baseAgility) totalModifier += 4;
      if (combat.typeOfAttackCausingIt === "NP") totalModifier += 3;
      if (combat.isAoE) totalModifier += 2;
    } else if (type === "luck") {
      if (unit.baseLuck < combat.attacker.baseLuck) totalModifier += 4;
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
    setHasProcessedResponse(true); // Add this line
    console.log("Starting handleEvade");
    setActiveCheck("agility");
    const agilityCheck = performCheck("agility");
    console.log("Agility check result:", agilityCheck);

    const updatedResponse = {
      ...(unit.combatReceived.response || {}),
      hitWithLuck_attacker: {
        done: false,
        success: false,
      },
      evadeWithLuck_defender: {
        done: false,
        success: false,
      },
      AgiEvasion_defender: {
        done: true,
        success: agilityCheck.success,
      },
      currentStep: 2,
      readyToConfirm: false,
      awaitingAttacker: false,
      awaitingDefender: true,
    };

    console.log("Updating combat response:", updatedResponse);

    if (!agilityCheck.success) {
      console.log("Failed agility check, moving to step 2");
      setCurrentStep(2);
      setReadyToConfirm(false);
      setAwaitingAttacker(false);
      setAwaitingDefender(true);
      updateCombatResponse(updatedResponse);
    } else {
      console.log("Successful agility check, awaiting attacker");
      setAwaitingAttacker(true);
      setCurrentStep(2);
      setReadyToConfirm(false);
      setAwaitingDefender(false);
      const updatedResponse2 = {
        ...updatedResponse,
        awaitingAttacker: true,
        awaitingDefender: false,
      };
      updateCombatResponse(updatedResponse2);
    }
  };

  const handleLuckEvade = () => {
    setActiveCheck("luck");
    const luckCheck = performCheck("luck");

    console.log(
      "Current combat response before updateResponseCreation (handleLuck):",
      unit.combatReceived.response
    );

    const currentDefender = gameState.units.find(
      (u) => u.id === unit.combatReceived.defender.id
    );

    const updatedResponse = {
      ...currentDefender.combatReceived.response,
      evadeWithLuck_defender: {
        done: true,
        success: luckCheck.success,
      },
      currentStep: 3,
      awaitingAttacker: false,
      readyToConfirm: true,
      awaitingDefender: true,
    };

    console.log(
      "Current combat response after updateResponseCreation (handleLuck):",
      unit.combatReceived.response
    );

    if (!luckCheck.success) {
      console.log("Failed luck check, moving to step 3");
      setCurrentStep(3);
      setReadyToConfirm(true);
      setAwaitingAttacker(false);
      setAwaitingDefender(true);
      updateCombatResponse(updatedResponse);
    }
    // else if (
    //   !luckCheck.success &&
    //   !updatedResponse.evadeWithCS_defender.done
    // ) {
    //   console.log(
    //     "Failed luck check, but you can still use Command Seal moving to step 3"
    //   );
    //   setAwaitingAttacker(true);
    //   setCurrentStep(2);
    //   setReadyToConfirm(false);
    //   setAwaitingDefender(false);
    //   const updatedResponse2 = {
    //     ...updatedResponse,
    //     currentStep: 2,
    //     awaitingAttacker: true,
    //     awaitingDefender: false,
    //     readyToConfirm: false,
    //   };
    //   updateCombatResponse(updatedResponse2);
    // }
    else {
      console.log("Successful luck check, awaiting attacker");
      setAwaitingAttacker(true);
      setCurrentStep(2);
      setReadyToConfirm(false);
      setAwaitingDefender(false);
      const updatedResponse2 = {
        ...updatedResponse,
        currentStep: 2,
        awaitingAttacker: true,
        awaitingDefender: false,
        readyToConfirm: false,
      };
      updateCombatResponse(updatedResponse2);
    }
  };

  const handleCommandSeal = () => {
    const updatedResponse = {
      ...(unit.combatReceived.response || {}),
      evadeWithCS_defender: {
        done: true,
        success: true,
      },
    };

    updateCombatResponse(updatedResponse);
    setCurrentStep(3);
    setReadyToConfirm(true);
  };

  const willTriggerDoubleCounter = d_unit.counteringAgainstWho === unit.id;
  const hasUsedCommandSeal =
    unit.combatReceived.response.evadeWithCS_defender.done;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[500px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Combat Management</h3>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
            ✕
          </button>
        </div>

        {!hasCombatReceived ? (
          <p className="text-gray-600">No active combat to manage.</p>
        ) : (
          <div className="space-y-4">
            {/* Combat info - Always shown */}
            {unit.combatReceived && (
              <div className="p-3 border rounded">
                <h4 className="font-bold mb-2">Incoming Combat</h4>
                <p>From: {unit.combatReceived.attacker.name}</p>
                <p>Type: {unit.combatReceived.typeOfAttackCausingIt}</p>
                <p>Potential Damage: {unit.combatReceived.finalDamage.total}</p>

                {unit.combatReceived.response && (
                  <CombatResponse
                    response={unit.combatReceived.response}
                    combat={unit.combatReceived}
                  />
                )}
              </div>
            )}

            {/* Step 1: Initial Choice */}
            {currentStep === 1 &&
              !hasProcessedResponse &&
              !awaitingAttacker && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentStep(3);
                      setReadyToConfirm(true);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Do Nothing
                  </button>
                  <button
                    onClick={() => {
                      handleBlock();
                      setCurrentStep(3);
                      setReadyToConfirm(true);
                    }}
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

            {/* Step 2: After Agility Check */}
            {currentStep === 2 && !awaitingAttacker && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleLuckEvade}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Try Luck Evasion
                </button>
                {/* <button
                  onClick={handleCommandSeal}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Use Command Seal
                </button> */}
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

            {/* Floating command seal button */}
            {!hasUsedCommandSeal && !awaitingAttacker && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCommandSeal}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Use Command Seal
                </button>
              </div>
            )}

            {/* Awaiting Attacker Response */}
            {awaitingAttacker && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-center">
                <p className="text-yellow-700 font-semibold">
                  Awaiting response from Attacker...
                </p>
                {unit.combatReceived.response?.hitWithLuck_attacker?.done && (
                  <button
                    onClick={() => {
                      setCurrentStep(3);
                      setReadyToConfirm(true);
                      setAwaitingAttacker(false);
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
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleDoNothing}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Confirm Results of Combat - Skip counter
                </button>
                <button
                  onClick={handleConfirmCombatResultsAndInitiateCounter}
                  className={`w-full px-4 py-2 rounded text-white ${
                    willTriggerDoubleCounter
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600"
                  }`}
                  disabled={willTriggerDoubleCounter}
                  title={
                    willTriggerDoubleCounter
                      ? "You Cannot counter against a counterattack"
                      : "Confirm Results"
                  }
                >
                  Confirm Results of Combat - Initiate Counter
                  {willTriggerDoubleCounter && (
                    <span className="ml-2 text-xs">
                      (Can't counter against a counter)
                    </span>
                  )}
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
                  Roll: {checkResult.roll}{" "}
                  {checkResult.modifiers >= 0 ? "+" : ""}
                  {checkResult.modifiers}= {checkResult.finalRoll} vs{" "}
                  {checkResult.threshold}
                </div>
              </div>
            )}

            {/* History Displays */}
            <CheckHistoryDisplay checks={unit.agilityChecks} type="Agility" />
            <CheckHistoryDisplay checks={unit.luckChecks} type="Luck" />
          </div>
        )}
      </div>
    </div>
  );
};
