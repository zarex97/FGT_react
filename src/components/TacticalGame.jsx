//TacticalGame.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  Sword,
  Shield,
  Heart,
  Move,
  ScrollText,
  Star,
  User,
  MoreHorizontal,
  Swords,
  Send,
  Target,
} from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { createMahalapraya } from "../game/skills/Mahalapraya";
import { Skill } from "../game/Skill";
import {
  getSkillImplementation,
  isSkillOnCooldown,
  executeSkill,
  getSkillAffectedCells,
} from "../game/skills/registry_skills";
import {
  getActionImplementation,
  isActionOnCooldown,
  executeAction,
  getActionAffectedCells,
} from "../game/actions/registry_actions";
import {
  getNPImplementation,
  isNPOnCooldown,
  executeNP,
  getNPAffectedCells,
  canUseNPOnThisRound,
} from "../game/noblePhantasms/registry_np";
import { TargetingType } from "../game/targeting/TargetingTypes";
import { TargetingLogic } from "../game/targeting/TargetingLogic";
import ServantSelector from "./ServantSelector";
import { Combat } from "../game/Combat";

const TacticalGame = ({ username, roomId }) => {
  console.log("TacticalGame props:", { username, roomId });
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [hoveredUnit, setHoveredUnit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);
  const [showSkillsMenu, setShowSkillsMenu] = useState(false);
  const [showNPMenu, setShowNPMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [isConnecting, setIsConnecting] = useState(true);
  const [activeSkill, setActiveSkill] = useState(null);
  const [skillTargetingMode, setSkillTargetingMode] = useState(false);
  const [previewCells, setPreviewCells] = useState(new Set());
  const [showServantSelector, setShowServantSelector] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const isCellVisible = (x, y) => {
    return gameState.visibleCells?.includes(`${x},${y}`);
  };
  const [detectionResults, setDetectionResults] = useState(null);
  const [detectionError, setDetectionError] = useState(null);
  const [showOtherActions, setShowOtherActions] = useState(false);
  const [showUniqueActions, setShowUniqueActions] = useState(false);
  const [showCommonActions, setShowCommonActions] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [actionTargetingMode, setActionTargetingMode] = useState(false);
  const [activeNP, setActiveNP] = useState(null);
  const [npTargetingMode, setNPTargetingMode] = useState(false);
  const [showCombatManagement, setShowCombatManagement] = useState(false);
  const [showLuckCheckOption, setShowLuckCheckOption] = useState(false);
  const [checkHistory, setCheckHistory] = useState(null);
  const [currentCombatResponse, setCurrentCombatResponse] = useState(null);
  const [activeCheck, setActiveCheck] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [showLuckOption, setShowLuckOption] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [awaitingAttacker, setAwaitingAttacker] = useState(false);
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [showCombatSelection, setShowCombatSelection] = useState(false);
  const [showSentCombatManagement, setShowSentCombatManagement] =
    useState(false);
  const [showCombatTargets, setShowCombatTargets] = useState(false);
  const [selectedCombatTarget, setSelectedCombatTarget] = useState(null);
  const [awaitingDefender, setAwaitingDefender] = useState(true);
  const [combatCompletionMessage, setCombatCompletionMessage] = useState(null);

  const WS_URL = `ws://127.0.0.1:8000?username=${username}`;
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    WS_URL,
    {
      share: false,
      onOpen: () => {
        console.log("WebSocket connected");

        // Initialize game state when connection is established
        sendJsonMessage({
          type: "JOIN_ROOM",
          roomId,
          turnsPerRound: 3,
          initialUnits: [
            {
              id: 1,
              x: 1,
              y: 1,
              team: "player1",
              hp: 20,
              atk: 8,
              def: 5,
              movementRange: 5,
              visionRange: 4,
              movementLeft: 5,
              hasAttacked: false,
              name: "Anastasia",
              sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp",
              skills: [
                {
                  id: "Mahalapraya",
                  onCooldownUntil: 0,
                },
              ],
              noblePhantasms: [
                {
                  id: 1,
                  name: "Snegleta・Snegurochka: Summer Snow",
                  description: "Unleashes the power of summer",
                  cooldown: 5,
                },
              ],
              reactions: [
                {
                  id: 1,
                  name: "Instinct",
                  description: "May evade incoming attacks",
                },
              ],
              combatSent: {},
              combatReceived: {},
              processedCombatSent: [],
              processedCombatReceived: [],
              canCounter: false,
              counteringAgainstWho: null,
            },
            // Add other initial units here

            {
              id: 2,
              x: 3,
              y: 1,
              team: "player2",
              hp: 18,
              atk: 6,
              def: 7,
              movementRange: 3, // Heavy armored unit with low movement
              movementLeft: 3,
              hasAttacked: false,
              name: "Artoria",
              sprite: "dist/sprites/(Saber) Artoria_portrait.png",
              skills: [
                {
                  id: "Mahalapraya",
                  onCooldownUntil: 0,
                },
              ],
              noblePhantasms: [
                {
                  id: 1,
                  name: "Excalibur",
                  description: "Unleash holy sword energy",
                  cooldown: 5,
                },
              ],
              reactions: [
                {
                  id: 1,
                  name: "Instinct",
                  description: "May evade incoming attacks",
                },
              ],
              combatSent: [],
              combatReceived: {},
              processedCombatSent: [],
              processedCombatReceived: [],
              canCounter: false,
              counteringAgainstWho: null,
              effects: [],
              effectsReceived: [],
              statusIfHit: null,
              agilityChecks: null,
              luckChecks: null,
              baseAgility: 3,
              baseLuck: 18,
            },
          ],
        });
      },
      onError: (error) => {
        console.error("WebSocket error:", error);
        setIsConnecting(false);
      },
      onClose: () => {
        console.log("WebSocket disconnected");
        setIsConnecting(false);
      },
    }
  );

  const resetCombatStates = () => {
    console.log("Resetting all combat states to initial values");
    setCurrentStep(1);
    setAwaitingAttacker(false);
    setReadyToConfirm(false);
    setAwaitingDefender(true);
    setCheckResult(null);
    setActiveCheck(null);
    setCurrentCombatResponse(null);
  };

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastJsonMessage?.type === "GAME_STATE_UPDATE") {
      console.log("Received game state:", lastJsonMessage.gameState);
      setGameState(lastJsonMessage.gameState);
      setIsConnecting(false);
    } else if (lastJsonMessage?.type === "DETECTION_RESULTS") {
      setDetectionResults(lastJsonMessage.results);
      setTimeout(() => setDetectionResults(null), 3000);
    } else if (lastJsonMessage?.type === "DETECTION_ERROR") {
      setDetectionError(lastJsonMessage.message);
      setTimeout(() => setDetectionError(null), 3000);
    } else if (lastJsonMessage?.type === "COMBAT_COMPLETION_NOTIFICATION") {
      setCombatCompletionMessage(lastJsonMessage.message);
      resetCombatStates();
    } else if (lastJsonMessage?.type === "CLOSE_COMBAT_MENU") {
      // Close all combat-related menus
      setShowSentCombatManagement(false);
      setShowCombatTargets(false);
      setShowCombatManagement(false);
      setShowCombatSelection(false);
      setSelectedCombatTarget(null);
      resetCombatStates();
      console.log("resetting combat states for fresh counter");
      console.log("Combat menu closed by server:", lastJsonMessage.reason);
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't handle if no menus are open
      if (!contextMenu && !showProfile && !showSkillsMenu && !showNPMenu) {
        return;
      }

      const isContextMenuClick = event.target.closest(".context-menu");
      const isProfileMenuClick = event.target.closest(".profile-menu");
      const isSkillsMenuClick = event.target.closest(".skills-menu");
      const isNPMenuClick = event.target.closest(".np-menu");

      // If clicking outside all menus
      if (
        !isContextMenuClick &&
        !isProfileMenuClick &&
        !isSkillsMenuClick &&
        !isNPMenuClick
      ) {
        setContextMenu(null);
        setActiveUnit(null);
        setShowProfile(false);
        setShowSkillsMenu(false);
        setShowNPMenu(false);
      }
    };

    // Add handlers
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu, showProfile, showSkillsMenu, showNPMenu]);

  // Loading state
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Connecting to game...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (!gameState && !isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Unable to connect to game</h2>
          <p>Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const DetectionError = ({ message }) => {
    if (!message) return null;

    return (
      <div className="fixed top-4 right-4 p-4 bg-red-500 text-white rounded shadow-lg">
        <p>{message}</p>
      </div>
    );
  };

  // Update the detection button to show availability
  const DetectionButton = () => {
    const currentPlayerId = Object.keys(gameState.players).find(
      (id) => gameState.players[id].username === username
    );

    const hasUsedDetection =
      Array.isArray(gameState.detectionsThisTurn) &&
      gameState.detectionsThisTurn.includes(currentPlayerId);

    return (
      <button
        onClick={handleDetection}
        className={`px-4 py-2 rounded ${
          hasUsedDetection
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-purple-500 hover:bg-purple-600"
        } text-white`}
        disabled={hasUsedDetection}
        title={
          hasUsedDetection
            ? "Detection already used this turn"
            : "Attempt to detect hidden units"
        }
      >
        Detect Hidden Units
        {hasUsedDetection && <span className="ml-2 text-xs">(Used)</span>}
      </button>
    );
  };

  // Checks that no unit is in the middle of countering
  const hasCounterPendingOnBoard = (gameState) => {
    return gameState?.units?.some((unit) => unit.canCounter === true) || false;
  };
  // If an unit is countering it grabs its id
  const getCounterUnit = (gameState) => {
    return gameState?.units?.find((unit) => unit.canCounter === true);
  };

  // Components for displaying check history and results
  const CheckHistoryDisplay = ({ checks, type }) => {
    if (!checks || checks.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded">
        <h5 className="font-semibold">{type} Check History</h5>
        <div className="max-h-32 overflow-y-auto">
          {checks.map((check, index) => (
            <div
              key={index}
              className={`text-sm ${
                check.success ? "text-green-600" : "text-red-600"
              }`}
            >
              Roll: {check.roll} + {check.modifiers} = {check.finalRoll}(
              {check.finalRoll <= check.threshold ? "Success" : "Fail"})
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CombatResponse = ({ response }) => {
    if (!response) return null;

    return (
      <div className="mt-2 space-y-1 text-sm">
        {response.AgiEvasion_defender.done && (
          <div
            className={
              response.AgiEvasion_defender.success
                ? "text-green-600"
                : "text-red-600"
            }
          >
            Agility Evasion:{" "}
            {response.AgiEvasion_defender.success ? "Success" : "Failed"}
          </div>
        )}
        {response.hitWithLuck_attacker.done && (
          <div
            className={
              response.hitWithLuck_attacker.success
                ? "text-green-600"
                : "text-red-600"
            }
          >
            Luck Hit:{" "}
            {response.hitWithLuck_attacker.success ? "Success" : "Failed"}
          </div>
        )}
        {response.evadeWithLuck_defender.done && (
          <div
            className={
              response.evadeWithLuck_defender.success
                ? "text-green-600"
                : "text-red-600"
            }
          >
            Luck Evasion:{" "}
            {response.evadeWithLuck_defender.success ? "Success" : "Failed"}
          </div>
        )}
      </div>
    );
  };

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

      const currentAttackerDeepCopy = JSON.parse(
        JSON.stringify(currentAttacker)
      );

      const currentDefenderDeepCopy = JSON.parse(
        JSON.stringify(currentDefender)
      );

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
        integratedAttackFlatBonus:
          unit.combatReceived.integratedAttackFlatBonus,
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
      let updatedUnit = {
        ...unit,
      };

      const willTriggerDoubleCounter = d_unit.counteringAgainstWho === unit.id;
      if (outcome === "hit") {
        updatedUnit = {
          ...unit,
          canCounter: willTriggerDoubleCounter,
          hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
          effects: [...currentEffects, newEffect],
        };
      }
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "RECEIVE_ATTACK",
        updatedUnit,
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

      const currentAttackerDeepCopy = JSON.parse(
        JSON.stringify(currentAttacker)
      );

      const currentDefenderDeepCopy = JSON.parse(
        JSON.stringify(currentDefender)
      );

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
        integratedAttackFlatBonus:
          unit.combatReceived.integratedAttackFlatBonus,
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

      currentDefender.effects = [
        ...(currentDefender.effects || []),
        blockEffect,
      ];

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
      } else {
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
                  <p>
                    Potential Damage: {unit.combatReceived.finalDamage.total}
                  </p>

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
                  <button
                    onClick={handleCommandSeal}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Use Command Seal
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

  const CombatTargetsMenu = ({ unit, onClose, onSelectTarget }) => {
    // Now we can directly map over the array
    const sentCombats = unit.combatSent || [];

    // If there are no combat targets, close the menu
    useEffect(() => {
      if (sentCombats.length === 0) {
        console.log("No combat targets available, closing menu");
        setTimeout(() => onClose(), 100); // Small delay to prevent immediate close issues
      }
    }, [sentCombats.length, onClose]);

    // Function to find the actual defender unit from gameState
    const getDefenderUnit = (defenderId) => {
      return gameState.units.find((u) => u.id === defenderId);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[800px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Select Combat Target</h3>
            <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {sentCombats.map((combat, index) => {
              const defender = getDefenderUnit(combat.defender.id);

              return (
                <button
                  key={`${combat.defender.id}-${index}`}
                  onClick={() => onSelectTarget(combat)}
                  className="border-2 border-green-500 rounded-lg p-4 flex flex-col items-center justify-center gap-4 
                            hover:bg-green-50 transition-all h-48"
                >
                  <div className="relative">
                    <User size={48} className="text-green-500" />
                    <Target
                      size={24}
                      className="text-red-500 absolute -bottom-2 -right-2"
                    />
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-semibold mb-2">
                      To: {defender?.name || `Target ${combat.defender.id}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Type: {combat.typeOfAttackCausingIt}
                    </p>
                    <p className="text-sm text-gray-600">
                      Potential Damage:{" "}
                      {combat.finalDamage?.total || "Calculating..."}
                    </p>
                  </div>
                </button>
              );
            })}

            {sentCombats.length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-8">
                No outgoing combat actions
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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

      const currentAttackerDeepCopy = JSON.parse(
        JSON.stringify(currentAttacker)
      );
      const currentDefenderDeepCopy = JSON.parse(
        JSON.stringify(currentDefender)
      );
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

      const currentAttackerDeepCopy = JSON.parse(
        JSON.stringify(currentAttacker)
      );
      const currentDefenderDeepCopy = JSON.parse(
        JSON.stringify(currentDefender)
      );
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

      // should change canCounter to depend on willTriggerDoubleCounter, so basically, if this variable is true, then canCounter should false, and if canCounter is false, counteringAgainstWho should be null, changes must be on the server side of things for this menu and for the defender menu regarding the de-activation of canCounter after countering and this issue with preventing infinite counters
      const updatedDefender = {
        ...currentDefender,
        canCounter: true,
        counteringAgainstWho: combat.attacker.id,
        hp: Math.max(0, currentDefender.hp - finalResults.finalDamage.total),
        effects: [
          ...(currentDefender.effects || []),
          currentDefender.effectsReceived,
        ],
      };

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
                  Roll: {checkResult.roll}{" "}
                  {checkResult.modifiers >= 0 ? "+" : ""}
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
  const CombatSelectionMenu = ({
    unit,
    onClose,
    onSelectReceived,
    onSelectSent,
  }) => {
    const hasCombatSent = Object.keys(unit.combatSent || {}).length > 0;
    const hasCombatReceived = Object.keys(unit.combatReceived || {}).length > 0;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[800px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Combat Management</h3>
            <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="flex gap-6 h-64">
            {/* Received Combat Square */}
            <button
              onClick={hasCombatReceived ? onSelectReceived : undefined}
              className={`flex-1 border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-4 transition-all
                ${
                  hasCombatReceived
                    ? "border-blue-500 hover:bg-blue-50 cursor-pointer"
                    : "border-gray-200 opacity-50 cursor-not-allowed"
                }`}
            >
              <Shield
                size={48}
                className={
                  hasCombatReceived ? "text-blue-500" : "text-gray-400"
                }
              />
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-2">Received Combat</h4>
                <p className="text-sm text-gray-600">
                  {hasCombatReceived
                    ? "Click to manage incoming combat"
                    : "No incoming combat to manage"}
                </p>
              </div>
            </button>

            {/* Sent Combat Square */}
            <button
              onClick={hasCombatSent ? onSelectSent : undefined}
              className={`flex-1 border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-4 transition-all
                ${
                  hasCombatSent
                    ? "border-green-500 hover:bg-green-50 cursor-pointer"
                    : "border-gray-200 opacity-50 cursor-not-allowed"
                }`}
            >
              <Send
                size={48}
                className={hasCombatSent ? "text-green-500" : "text-gray-400"}
              />
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-2">Sent Combat</h4>
                <p className="text-sm text-gray-600">
                  {hasCombatSent
                    ? "Click to manage outgoing combat"
                    : "No outgoing combat to manage"}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ReceiveAttackButton = ({ unit }) => {
    const handleReceiveAttack = () => {
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
      // Recreate combat from stored results
      const combat = new Combat({
        typeOfAttackCausingIt: unit.combatReceived.typeOfAttackCausingIt, //e.g: skill, np, basic attack
        proportionOfMagicUsed: unit.combatReceived.proportionOfMagicUsed, // e.g: 30% of magic
        proportionOfStrengthUsed: unit.combatReceived.proportionOfStrengthUsed, //e.g: 120% of strength
        attacker: currentAttacker,
        defender: currentDefender,
        gameState: gameState,
        integratedAttackMultiplier:
          unit.combatReceived.integratedAttackMultiplier, //e.g: multiplier bonus on np/skill description
        integratedAttackFlatBonus:
          unit.combatReceived.integratedAttackFlatBonus, // e.g: flat bonus on np/skill description
      });

      combat.combatResults = unit.combatReceived;
      // Recalculate with current defender state
      const finalResults = combat.receiveCombat();

      // Update the unit's stored combat results
      unit.combatReceived = finalResults;
      unit.combatReceived = finalResults;

      // Apply the damage to the copy of the defender (statusIfHit)
      unit.statusIfHit.hp =
        unit.statusIfHit.hp - finalResults.finalDamage.total;

      //update the unit with the values of the copy (statusIfHit)
      unit = JSON.parse(JSON.stringify(unit.statusIfHit));

      const updatedUnit = {
        ...unit,
        hp: Math.max(0, unit.hp - finalResults.finalDamage.total),
      };

      // Send update to server
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "RECEIVE_ATTACK",
        updatedUnit,
        combatResults: finalResults,
      });
    };

    return (
      <button
        onClick={handleReceiveAttack}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Receive Attack
      </button>
    );
  };

  const handleDetection = () => {
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "ATTEMPT_DETECTION",
    });
  };

  // Add a popup component for combat completion notification
  const CombatCompletionNotification = ({ message, onClose }) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds

      return () => clearTimeout(timer);
    }, [onClose]);

    if (!message) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-4">Combat Complete</h3>
            <p className="text-gray-700 mb-4">{message}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const UniqueActionsMenu = ({ unit, onClose }) => {
    const isPlayerTurn = gameState.turn === playerTeam;
    // Helper function to check counter restrictions
    const hasCounterPendingOnBoard = (gameState) => {
      return gameState.units.some((unit) => unit.canCounter === true);
    };

    const getCounterUnit = (gameState) => {
      return gameState.units.find((unit) => unit.canCounter === true);
    };

    const canUseAction = (actionImpl, unit, isPlayerTurn) => {
      const hasCounterPending = hasCounterPendingOnBoard(gameState);
      if (hasCounterPending) {
        const counterUnit = getCounterUnit(gameState);
        // Only allow actions if this unit is the one that can counter, or if it's a reactionary action
        if (counterUnit.id !== unit.id && !actionImpl.isReactionary) {
          return false;
        }
      }
      return actionImpl.isReactionary || unit.canCounter || isPlayerTurn;
    };

    if (!showUniqueActions) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-4 w-96"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold mb-4">Unique Actions</h3>
          <div className="space-y-2">
            {unit.actions?.unique?.map((actionRef, index) => {
              const actionImpl = getActionImplementation(
                actionRef.id,
                "unique"
              );
              if (!actionImpl) return null;

              const isOnCd = isActionOnCooldown(
                actionRef,
                gameState.currentTurn
              );
              const canUse = canUseAction(actionImpl, unit, isPlayerTurn);
              const hasCounterPending = hasCounterPendingOnBoard(gameState);
              const counterUnit = hasCounterPending
                ? getCounterUnit(gameState)
                : null;
              const isBlockedByCounter =
                hasCounterPending &&
                counterUnit.id !== unit.id &&
                !actionImpl.isReactionary;

              const turnsRemaining = isOnCd
                ? actionRef.onCooldownUntil - gameState.currentTurn
                : 0;

              return (
                <div
                  key={index}
                  className={`p-2 border rounded hover:bg-gray-50 cursor-pointer 
                                      ${isOnCd || !canUse ? "opacity-50" : ""}`}
                  onClick={() =>
                    !isOnCd &&
                    canUse &&
                    handleActionSelect(actionRef, actionImpl, unit)
                  }
                >
                  <div className="font-bold flex justify-between">
                    {actionImpl.name}
                    <span
                      className={`text-sm ${
                        isOnCd
                          ? "text-red-500"
                          : isBlockedByCounter
                          ? "text-orange-500"
                          : "text-green-500"
                      }`}
                    >
                      {isOnCd
                        ? `CD: ${turnsRemaining} turn${
                            turnsRemaining !== 1 ? "s" : ""
                          }`
                        : isBlockedByCounter
                        ? "Counter Pending"
                        : canUse
                        ? "Ready"
                        : "Not Available"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {actionImpl.description}
                  </div>
                  {actionImpl.isReactionary && (
                    <span className="text-xs text-blue-500 ml-2">
                      (Reactionary)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const CommonActionsMenu = ({ unit, onClose }) => {
    const isPlayerTurn = gameState.turn === playerTeam;
    // Helper function to check counter restrictions
    const hasCounterPendingOnBoard = (gameState) => {
      return gameState.units.some((unit) => unit.canCounter === true);
    };

    const getCounterUnit = (gameState) => {
      return gameState.units.find((unit) => unit.canCounter === true);
    };

    const canUseAction = (actionImpl, unit, isPlayerTurn) => {
      const hasCounterPending = hasCounterPendingOnBoard(gameState);
      if (hasCounterPending) {
        const counterUnit = getCounterUnit(gameState);
        // Only allow actions if this unit is the one that can counter, or if it's a reactionary action
        if (counterUnit.id !== unit.id && !actionImpl.isReactionary) {
          return false;
        }
      }
      return actionImpl.isReactionary || unit.canCounter || isPlayerTurn;
    };
    if (!showCommonActions) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-4 w-96"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold mb-4">Common Actions</h3>
          <div className="space-y-2">
            {unit.actions?.common?.map((actionRef, index) => {
              const actionImpl = getActionImplementation(
                actionRef.id,
                "common"
              );
              if (!actionImpl) return null;

              const isOnCd = isActionOnCooldown(
                actionRef,
                gameState.currentTurn
              );
              const canUse = canUseAction(actionImpl, unit, isPlayerTurn);
              const hasCounterPending = hasCounterPendingOnBoard(gameState);
              const counterUnit = hasCounterPending
                ? getCounterUnit(gameState)
                : null;
              const isBlockedByCounter =
                hasCounterPending &&
                counterUnit.id !== unit.id &&
                !actionImpl.isReactionary;

              const turnsRemaining = isOnCd
                ? actionRef.onCooldownUntil - gameState.currentTurn
                : 0;

              return (
                <div
                  key={index}
                  className={`p-2 border rounded hover:bg-gray-50 cursor-pointer 
                                      ${isOnCd || !canUse ? "opacity-50" : ""}`}
                  onClick={() =>
                    !isOnCd &&
                    canUse &&
                    handleActionSelect(actionRef, actionImpl, unit)
                  }
                >
                  <div className="font-bold flex justify-between">
                    {actionImpl.name}
                    <span
                      className={`text-sm ${
                        isOnCd
                          ? "text-red-500"
                          : isBlockedByCounter
                          ? "text-orange-500"
                          : "text-green-500"
                      }`}
                    >
                      {isOnCd
                        ? `CD: ${turnsRemaining} turn${
                            turnsRemaining !== 1 ? "s" : ""
                          }`
                        : isBlockedByCounter
                        ? "Counter Pending"
                        : canUse
                        ? "Ready"
                        : "Not Available"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {actionImpl.description}
                  </div>
                  {actionImpl.isReactionary && (
                    <span className="text-xs text-blue-500 ml-2">
                      (Reactionary)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const handleNPSelect = (npRef, npImpl, unit) => {
    // First check round restriction
    const roundCheck = canUseNPOnThisRound(
      npRef,
      npImpl,
      gameState.currentRound
    );
    if (!roundCheck.canUse) {
      console.log("NP round restriction:", roundCheck);
      return;
    }

    if (isNPOnCooldown(npRef, gameState.currentTurn)) {
      console.log("NP is on cooldown");
      return;
    }

    setSelectedUnit(unit);

    setActiveNP({
      ref: npRef,
      impl: npImpl,
    });

    if (npImpl.microActions[0]?.targetingType === TargetingType.SELF) {
      const result = executeNP(npRef, gameState, unit, unit.x, unit.y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_NP",
          npName: npRef.name,
          casterId: unit.id,
          targetX: unit.x,
          targetY: unit.y,
          updatedGameState: result.updatedGameState,
          newCooldownUntil: newCooldownUntil,
          roundUsed: gameState.currentRound,
        });
      }
      setActiveNP(null);
      setNPTargetingMode(false);
      setShowNPMenu(false);
      return;
    }

    setNPTargetingMode(true);
    setContextMenu(false);
    setShowNPMenu(false);
  };

  const handleAddServant = (newUnit) => {
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "ADD_UNIT",
      unit: newUnit,
    });
  };

  // Add this function to handle skill selection
  const handleSkillSelect = (skillRef, skillImpl, unit) => {
    if (isSkillOnCooldown(skillRef, gameState.currentTurn)) {
      console.log("Skill is on cooldown");
      return;
    }
    setSelectedUnit(unit);

    setActiveSkill({
      ref: skillRef,
      impl: skillImpl,
    });

    if (skillImpl.microActions[0]?.targetingType === TargetingType.SELF) {
      const result = executeSkill(skillRef, gameState, unit, unit.x, unit.y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_SKILL",
          skillName: skillRef.name,
          casterId: unit.id,
          targetX: unit.x,
          targetY: unit.y,
          updatedGameState: result.updatedGameState,
          newCooldownUntil: newCooldownUntil,
        });
      }
      setActiveSkill(null);
      setSkillTargetingMode(false);

      return;
    }
    setSkillTargetingMode(true);
    setContextMenu(false);
    setShowSkillsMenu(false);

    // For AOE_AROUND_SELF targeting type
    if (
      skillImpl.microActions?.[0]?.targetingType ===
      TargetingType.AOE_AROUND_SELF
    ) {
      const affectedCells = getSkillAffectedCells(
        skillImpl,
        unit,
        null,
        null,
        11
      );
      setPreviewCells(affectedCells);
    }
  };

  // Your existing menu handling useEffect...

  const handleContextMenu = (e, unit) => {
    e.preventDefault();
    e.stopPropagation();

    const playerTeam =
      gameState.players[
        Object.keys(gameState.players).find(
          (id) => gameState.players[id].username === username
        )
      ]?.team;

    // Close menu if unit is not owned by player or not their turn
    if (!unit || unit.team !== playerTeam) {
      setContextMenu(null);
      setActiveUnit(null);
      return;
    }
    setShowProfile(false);
    setShowSkillsMenu(false);
    setShowNPMenu(false);
    setContextMenu({ x: e.pageX, y: e.pageY });
    setActiveUnit(unit);
  };

  const moveUnit = (unit, newX, newY) => {
    if (!unit || unit.movementLeft <= 0) return;

    const distance = calculateDistance(unit.x, unit.y, newX, newY);
    if (distance > unit.movementLeft) return;

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "MOVE_UNIT",
      unitId: unit.id,
      newX,
      newY,
      newMovementLeft: unit.movementLeft - distance,
    });

    setSelectedUnit(null);
    setHighlightedCells([]);
  };

  const handleAttack = (attacker, target) => {
    // Calculate damage
    const damage = Math.max(1, attacker.atk - target.def);
    const newHp = Math.max(0, target.hp - damage);

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "ATTACK",
      attackerId: attacker.id,
      targetId: target.id,
      newHp,
    });
  };

  const endTurn = () => {
    if (hasCounterPendingOnBoard(gameState)) {
      console.log("Cannot end turn: Counter is pending");
      return;
    }
    const updatedUnits = gameState.units.map((unit) => ({
      ...unit,
      movementLeft: unit.movementRange,
      hasAttacked: false,
    }));

    const currentPlayerIndex = parseInt(gameState.turn.slice(-1));
    const nextPlayerIndex =
      currentPlayerIndex === Object.keys(gameState.players).length
        ? 1
        : currentPlayerIndex + 1;

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "END_TURN",
      updatedUnits,
      nextTurn: `player${nextPlayerIndex}`,
      // currentTurn will be incremented on the server
    });

    setSelectedUnit(null);
    setHighlightedCells([]);
  };

  const ContextMenu = ({ position, unit }) => {
    const isPlayerTurn = gameState.turn === unit.team;
    const hasCounterPending = hasCounterPendingOnBoard(gameState);
    const counterUnit = hasCounterPending ? getCounterUnit(gameState) : null;
    const isBlockedByCounter = hasCounterPending && counterUnit?.id !== unit.id;

    console.log("isPlayerTurn:", isPlayerTurn);
    console.log("unit.hasAttacked:", unit.hasAttacked);
    console.log("current gameState:", gameState);
    console.log("hasCounterPending:", hasCounterPending);
    console.log("isBlockedByCounter:", isBlockedByCounter);
    if (!position) return null;

    return (
      <div
        className="fixed bg-white shadow-lg rounded-lg border border-gray-200 z-50 w-48 context-menu"
        style={{ left: position.x, top: position.y }}
      >
        <button
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                        ${
                          unit.hasAttacked ||
                          !isPlayerTurn ||
                          isBlockedByCounter
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
          onClick={() => handleAction("basic-attack", unit)}
          disabled={unit.hasAttacked || !isPlayerTurn || isBlockedByCounter}
          title={isBlockedByCounter ? "Another unit has counter pending" : ""}
        >
          <Sword size={16} /> Basic Attack
          {isBlockedByCounter && (
            <span className="text-xs text-orange-500 ml-auto">(Blocked)</span>
          )}
        </button>
        <button
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                        ${isBlockedByCounter ? "opacity-50" : ""}`}
          onClick={() => {
            setShowSkillsMenu(true);
            setContextMenu(null);
          }}
          title={
            isBlockedByCounter ? "Some skills may be blocked by counter" : ""
          }
        >
          <ScrollText size={16} /> Skills
          {isBlockedByCounter && (
            <span className="text-xs text-orange-500 ml-auto">(Limited)</span>
          )}
        </button>
        <button
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                        ${isBlockedByCounter ? "opacity-50" : ""}`}
          onClick={() => {
            setShowNPMenu(true);
            setContextMenu(null);
          }}
          title={
            isBlockedByCounter
              ? "Some Noble Phantasms may be blocked by counter"
              : ""
          }
        >
          <Star size={16} /> Noble Phantasms
          {isBlockedByCounter && (
            <span className="text-xs text-orange-500 ml-auto">(Limited)</span>
          )}
        </button>
        <button
          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
          onClick={() => {
            setShowProfile(true);
            setContextMenu(null);
          }}
        >
          <User size={16} /> Show Profile
        </button>
        <button
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                        ${isBlockedByCounter ? "opacity-50" : ""}`}
          onClick={() => {
            setShowOtherActions(true);
            setContextMenu(null);
          }}
          title={
            isBlockedByCounter ? "Some actions may be blocked by counter" : ""
          }
        >
          <MoreHorizontal size={16} /> Other Actions
          {isBlockedByCounter && (
            <span className="text-xs text-orange-500 ml-auto">(Limited)</span>
          )}
        </button>
        <button
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                    ${!isPlayerTurn ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => handleAction("move", unit)}
          disabled={!isPlayerTurn || hasCounterPending}
          title={
            hasCounterPending
              ? "Movement blocked while counter is pending"
              : !isPlayerTurn
              ? "Not your turn"
              : "Move unit"
          }
        >
          <Move size={16} /> Move
          {hasCounterPending && (
            <span className="text-xs text-orange-500 ml-auto">(Blocked)</span>
          )}
        </button>
        <button
          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
          onClick={() => {
            setShowCombatSelection(true);
            setContextMenu(null);
          }}
        >
          <Swords size={16} /> Manage Combat
        </button>
        {unit.canCounter && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-yellow-100 flex items-center gap-2 text-orange-600 font-semibold"
            onClick={() => {
              resetCounterStatus(unit.id);
              setContextMenu(null);
            }}
          >
            <Target size={16} /> End Counter
          </button>
        )}
      </div>
    );
  };

  const debugSkillMethods = (skill) => {
    console.log("Skill debug:", {
      name: skill.name,
      isFunction: typeof skill.isOnCooldown === "function",
      prototype: Object.getPrototypeOf(skill),
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(skill)),
    });
  };

  const SkillsMenu = ({ unit }) => {
    const isPlayerTurn = gameState.turn === playerTeam;
    if (!showSkillsMenu) return null;
    const hasCounterPending = hasCounterPendingOnBoard(gameState);

    const canUseSkill = (skillImpl, unit, isPlayerTurn) => {
      const hasCounterPending = hasCounterPendingOnBoard(gameState);
      if (hasCounterPending) {
        const counterUnit = getCounterUnit(gameState);
        // Only allow skills if this unit is the one that can counter, or if it's a reactionary skill
        if (counterUnit.id !== unit.id && !skillImpl.isReactionary) {
          return false;
        }
      }
      return skillImpl.isReactionary || unit.canCounter || isPlayerTurn;
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-4 w-96 skills-menu"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold mb-4">Skills</h3>
          <div className="space-y-2">
            {unit.skills?.map((skillRef, index) => {
              const skillImpl = getSkillImplementation(skillRef.id);
              if (!skillImpl) return null;

              const isOnCd = isSkillOnCooldown(skillRef, gameState.currentTurn);
              const canUse = canUseSkill(skillImpl, unit, isPlayerTurn);
              const hasCounterPending = hasCounterPendingOnBoard(gameState);
              const counterUnit = hasCounterPending
                ? getCounterUnit(gameState)
                : null;
              const isBlockedByCounter =
                hasCounterPending &&
                counterUnit.id !== unit.id &&
                !skillImpl.isReactionary;
              const turnsRemaining = isOnCd
                ? skillRef.onCooldownUntil - gameState.currentTurn
                : 0;

              return (
                <div
                  key={index}
                  className={`p-2 border rounded hover:bg-gray-50 cursor-pointer 
                                        ${isOnCd ? "opacity-50" : ""}`}
                  onClick={() =>
                    !isOnCd &&
                    canUse &&
                    handleSkillSelect(skillRef, skillImpl, unit)
                  }
                >
                  <div className="font-bold flex justify-between">
                    {skillImpl.name}
                    <span
                      className={`text-sm ${
                        isOnCd
                          ? "text-red-500"
                          : isBlockedByCounter
                          ? "text-orange-500"
                          : "text-green-500"
                      }`}
                    >
                      {isOnCd
                        ? `CD: ${turnsRemaining} turn${
                            turnsRemaining !== 1 ? "s" : ""
                          }`
                        : isBlockedByCounter
                        ? "Counter Pending"
                        : canUse
                        ? "Ready"
                        : "Not Available"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {skillImpl.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Cooldown: {skillImpl.cooldown} turns
                    {skillImpl.isReactionary && (
                      <span className="ml-2 text-blue-500">(Reactionary)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded"
            onClick={() => setShowSkillsMenu(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const handleActionSelect = (actionRef, actionImpl, unit) => {
    if (isActionOnCooldown(actionRef, gameState.currentTurn)) {
      return;
    }

    setSelectedUnit(unit);

    setActiveAction({
      ref: actionRef,
      impl: actionImpl,
    });

    if (actionImpl.microActions[0]?.targetingType === TargetingType.SELF) {
      const result = executeAction(
        actionRef,
        actionImpl.type,
        gameState,
        unit,
        unit.x,
        unit.y
      );
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(actionImpl.cooldown * gameState.turnsPerRound);

        // Create deep copy of game state with updated cooldowns
        const updatedGameState = {
          ...result.updatedGameState,
          units: result.updatedGameState.units.map((updatedUnit) => {
            if (updatedUnit.id === unit.id) {
              return {
                ...updatedUnit,
                actions: {
                  ...updatedUnit.actions,
                  [actionImpl.type]: updatedUnit.actions[actionImpl.type].map(
                    (action) => {
                      if (action.id === actionRef.id) {
                        console.log("Updating action cooldown:", {
                          actionId: action.id,
                          newCooldownUntil,
                          currentTurn: gameState.currentTurn,
                        });
                        return {
                          ...action,
                          onCooldownUntil: newCooldownUntil,
                        };
                      }
                      return action;
                    }
                  ),
                },
              };
            }
            return updatedUnit;
          }),
        };

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_ACTION",
          actionId: actionRef.id,
          actionType: actionImpl.type,
          casterId: unit.id,
          targetX: unit.x,
          targetY: unit.y,
          updatedGameState: updatedGameState,
          newCooldownUntil: newCooldownUntil,
        });
      }
      setActiveAction(null);
      setActionTargetingMode(false);
      return;
    }

    setActionTargetingMode(true);
    setShowCommonActions(false);
    setShowUniqueActions(false);
    setShowOtherActions(false);
  };

  const OtherActionsMenu = ({ unit }) => {
    if (!showOtherActions) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-4 w-96"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold mb-4">Other Actions</h3>
          <div className="space-y-2">
            <button
              className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded"
              onClick={() => {
                setShowUniqueActions(true);
                setShowOtherActions(false);
              }}
            >
              Unique Actions
            </button>
            <button
              className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded"
              onClick={() => {
                setShowCommonActions(true);
                setShowOtherActions(false);
              }}
            >
              Common Actions
            </button>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded"
            onClick={() => setShowOtherActions(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const NoblePhantasmMenu = ({ unit }) => {
    const isPlayerTurn = gameState.turn === playerTeam;
    if (!showNPMenu) return null;

    // Helper function to check counter restrictions
    const hasCounterPendingOnBoard = (gameState) => {
      return gameState.units.some((unit) => unit.canCounter === true);
    };

    const getCounterUnit = (gameState) => {
      return gameState.units.find((unit) => unit.canCounter === true);
    };

    const canUseNP = (npImpl, unit, isPlayerTurn, roundCheck) => {
      const hasCounterPending = hasCounterPendingOnBoard(gameState);
      if (hasCounterPending) {
        const counterUnit = getCounterUnit(gameState);
        // Only allow NPs if this unit is the one that can counter, or if it's a reactionary NP
        if (counterUnit.id !== unit.id && !npImpl.isReactionary) {
          return false;
        }
      }
      return (
        roundCheck.canUse &&
        (npImpl.isReactionary || unit.canCounter || isPlayerTurn)
      );
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-4 w-96 np-menu"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold mb-4">Noble Phantasms</h3>
          <div className="space-y-2">
            {unit.noblePhantasms?.map((npRef, index) => {
              const npImpl = getNPImplementation(npRef.id);
              if (!npImpl) return null;

              const isOnCd = isNPOnCooldown(npRef, gameState.currentTurn);
              const roundCheck = canUseNPOnThisRound(
                npRef,
                npImpl,
                gameState.currentRound
              );
              const canUse = canUseNP(npImpl, unit, isPlayerTurn, roundCheck);
              const hasCounterPending = hasCounterPendingOnBoard(gameState);
              const counterUnit = hasCounterPending
                ? getCounterUnit(gameState)
                : null;
              const isBlockedByCounter =
                hasCounterPending &&
                counterUnit.id !== unit.id &&
                !npImpl.isReactionary;

              const turnsRemaining = isOnCd
                ? npRef.onCooldownUntil - gameState.currentTurn
                : 0;

              return (
                <div
                  key={index}
                  className={`p-2 border rounded hover:bg-gray-50 cursor-pointer 
                                  ${isOnCd || !canUse ? "opacity-50" : ""}`}
                  onClick={() =>
                    !isOnCd && canUse && handleNPSelect(npRef, npImpl, unit)
                  }
                >
                  <div className="font-bold flex justify-between">
                    {npImpl.name}
                    <span
                      className={`text-sm ${
                        isOnCd
                          ? "text-red-500"
                          : !roundCheck.canUse
                          ? "text-yellow-500"
                          : isBlockedByCounter
                          ? "text-orange-500"
                          : "text-green-500"
                      }`}
                    >
                      {isOnCd
                        ? `CD: ${turnsRemaining} turn${
                            turnsRemaining !== 1 ? "s" : ""
                          }`
                        : !roundCheck.canUse
                        ? `Available Round ${npImpl.usableFromRound}`
                        : isBlockedByCounter
                        ? "Counter Pending"
                        : canUse
                        ? "Ready"
                        : "Not Available"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {npImpl.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Cooldown: {npImpl.cooldown} turns
                    {npImpl.isReactionary && (
                      <span className="ml-2 text-blue-500">(Reactionary)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 rounded"
            onClick={() => setShowNPMenu(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const ProfileSheet = ({ unit }) => {
    if (!showProfile) return null;

    const [activeTab, setActiveTab] = useState("stats");

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-4 w-[800px] h-[600px] profile-menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{unit.name}</h2>
            <button
              className="p-2 hover:bg-gray-100 rounded"
              onClick={() => setShowProfile(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {["stats", "skills", "noble phantasms", "reactions"].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded ${
                  activeTab === tab ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto h-[450px] p-4">
            {activeTab === "stats" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 border rounded">
                    <span className="font-bold">HP:</span> {unit.hp}
                  </div>
                  <div className="p-2 border rounded">
                    <span className="font-bold">ATK:</span> {unit.atk}
                  </div>
                  <div className="p-2 border rounded">
                    <span className="font-bold">DEF:</span> {unit.def}
                  </div>
                  <div className="p-2 border rounded">
                    <span className="font-bold">Movement:</span>{" "}
                    {unit.movementLeft}/{unit.movementRange}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-4">
                {unit.skills.map((skill) => (
                  <div key={skill.id} className="p-4 border rounded">
                    <h3 className="font-bold text-lg">{skill.name}</h3>
                    <div className="text-sm text-gray-600 mt-2">
                      {skill.description}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-bold">Type:</span> {skill.type}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">Cooldown:</span>{" "}
                      {skill.cooldown} turns
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "noble phantasms" && (
              <div className="space-y-4">
                {unit.noblePhantasms.map((np) => (
                  <div key={np.id} className="p-4 border rounded">
                    <h3 className="font-bold text-lg">{np.name}</h3>
                    <div className="text-sm text-gray-600 mt-2">
                      {np.description}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">Cooldown:</span> {np.cooldown}{" "}
                      turns
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "reactions" && (
              <div className="space-y-4">
                {unit.reactions?.map((reaction) => (
                  <div key={reaction.id} className="p-4 border rounded">
                    <h3 className="font-bold text-lg">{reaction.name}</h3>
                    <div className="text-sm text-gray-600 mt-2">
                      {reaction.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const GRID_SIZE = 11;

  const getUnitAt = (x, y) => {
    return gameState?.units.find((unit) => unit.x === x && unit.y === y);
  };

  const calculateDistance = (x1, y1, x2, y2) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  const getPossibleMoves = (unit) => {
    const moves = [];
    const range = unit.movementLeft;

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const distance = calculateDistance(unit.x, unit.y, x, y);
        if (distance <= range && distance > 0 && !getUnitAt(x, y)) {
          moves.push({ x, y, distance });
        }
      }
    }

    return moves;
  };

  const handleAction = (action, unit) => {
    const playerTeam =
      gameState.players[
        Object.keys(gameState.players).find(
          (id) => gameState.players[id].username === username
        )
      ].team;

    if (unit.team !== playerTeam || unit.team !== gameState.turn) return;

    // Check for counter restrictions
    const hasCounterPending = hasCounterPendingOnBoard(gameState);
    if (hasCounterPending) {
      const counterUnit = getCounterUnit(gameState);

      // For movement, block ALL units when counter is pending (even the counter unit)
      if (action === "move") {
        console.log("Movement blocked: Counter is pending");
        return;
      }

      // For other actions, only block non-counter units
      if (counterUnit.id !== unit.id) {
        console.log("Action blocked: Another unit has counter pending");
        return;
      }
    }

    if (action === "move") {
      setHighlightedCells(getPossibleMoves(unit));
      setContextMenu(null);
    } else if (action === "basic-attack") {
      // Handle attack action
      setContextMenu(null);
      // You could set a state to indicate attack mode and highlight possible targets
      // Then handle the actual attack in handleCellClick when a target is selected
    }
  };

  // Add this function to reset counter status (call this when counter is completed)
  const resetCounterStatus = (unitId) => {
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "RESET_COUNTER_STATUS",
      unitId: unitId,
    });
  };

  const handleCellClick = (x, y) => {
    setContextMenu(null);
    setActiveUnit(null);

    if (skillTargetingMode && activeSkill) {
      const caster = selectedUnit;
      if (!caster) return;

      const { ref, impl } = activeSkill;

      console.log("Executing skill:", {
        skillName: impl.name,
        caster: caster.name,
        targetX: x,
        targetY: y,
      });

      // Execute the skill using the implementation
      const result = executeSkill(ref, gameState, caster, x, y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);

        console.log("Skill execution result:", {
          success: result.success,
          updatedState: result.updatedGameState,
        });

        // Create deep copy with preserved cooldowns
        const updatedGameState = {
          ...result.updatedGameState,
          units: result.updatedGameState.units.map((updatedUnit) => {
            if (updatedUnit.id === caster.id) {
              return {
                ...updatedUnit,
                skills: updatedUnit.skills.map((skill) => {
                  if (skill.id === ref.id) {
                    return {
                      ...skill,
                      onCooldownUntil: newCooldownUntil,
                    };
                  }
                  return skill;
                }),
              };
            }
            return updatedUnit;
          }),
        };

        console.log("Skill execution (deep copy):", {
          success: result.success,
          updatedState: result.updatedGameState,
        });

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_SKILL",
          skillName: impl.name,
          casterId: caster.id,
          targetX: x,
          targetY: y,
          updatedGameState: result.updatedGameState,
          newCooldownUntil: newCooldownUntil,
        });
      }

      // Reset targeting mode
      setSkillTargetingMode(false);
      setActiveSkill(null);
      setPreviewCells(new Set());
      setSelectedUnit(null);
      return;
    }

    // Handle action targeting
    if (actionTargetingMode && activeAction) {
      const caster = selectedUnit;
      if (!caster) return;

      const { ref, impl } = activeAction;
      const result = executeAction(ref, impl.type, gameState, caster, x, y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);
        const updatedGameState = {
          ...result.updatedGameState,
          units: result.updatedGameState.units.map((updatedUnit) => {
            if (updatedUnit.id === caster.id) {
              return {
                ...updatedUnit,
                actions: {
                  ...updatedUnit.actions,
                  [impl.type]: updatedUnit.actions[impl.type].map((action) => {
                    if (action.id === ref.id) {
                      return {
                        ...action,
                        onCooldownUntil: newCooldownUntil,
                      };
                    }
                    return action;
                  }),
                },
              };
            }
            return updatedUnit;
          }),
        };

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_ACTION",
          actionId: impl.name,
          actionType: impl.type,
          casterId: caster.id,
          targetX: x,
          targetY: y,
          updatedGameState: updatedGameState,
          newCooldownUntil: newCooldownUntil,
        });
      }

      setActionTargetingMode(false);
      setActiveAction(null);
      setPreviewCells(new Set());
      setSelectedUnit(null);
      return;
    }

    if (npTargetingMode && activeNP) {
      const caster = selectedUnit;
      if (!caster) return;

      const { ref, impl } = activeNP;
      const result = executeNP(ref, gameState, caster, x, y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);
        const updatedGameState = {
          ...result.updatedGameState,
          units: result.updatedGameState.units.map((updatedUnit) => {
            if (updatedUnit.id === caster.id) {
              return {
                ...updatedUnit,
                noblePhantasms: updatedUnit.noblePhantasms.map((np) => {
                  if (np.id === ref.id) {
                    return {
                      ...np,
                      onCooldownUntil: newCooldownUntil,
                    };
                  }
                  return np;
                }),
              };
            }
            return updatedUnit;
          }),
        };

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_NP",
          npName: impl.name,
          casterId: caster.id,
          targetX: x,
          targetY: y,
          updatedGameState: updatedGameState,
          newCooldownUntil: newCooldownUntil,
          roundUsed: gameState.currentRound,
        });
      }

      setNPTargetingMode(false);
      setActiveNP(null);
      setPreviewCells(new Set());
      setSelectedUnit(null);
      return;
    }

    //logic for clicking when trying to move

    const clickedUnit = getUnitAt(x, y);
    const playerTeam =
      gameState.players[
        Object.keys(gameState.players).find(
          (id) => gameState.players[id].username === username
        )
      ].team;

    if (selectedUnit) {
      if (
        !clickedUnit &&
        highlightedCells.some((move) => move.x === x && move.y === y)
      ) {
        moveUnit(selectedUnit, x, y);
      } else {
        setSelectedUnit(null);
        setHighlightedCells([]);
      }
    } else if (clickedUnit && clickedUnit.team === playerTeam) {
      // FIXED: Allow selection if it's player's unit AND either:
      // 1. It's their turn, OR
      // 2. The unit can counter (reactive abilities)
      const isPlayerTurn = clickedUnit.team === gameState.turn;
      const canCounter = clickedUnit.canCounter === true;

      if (isPlayerTurn || canCounter) {
        setSelectedUnit(clickedUnit);
      }
    }
  };

  // Add this function to handle mouse movement during targeting of Skills and Actions
  const handleCellHover = (x, y) => {
    // For skills
    if (skillTargetingMode && activeSkill && selectedUnit) {
      const { impl } = activeSkill;
      if (impl.microActions[0]?.targetingType !== TargetingType.SELF) {
        const affectedCells = getSkillAffectedCells(
          impl,
          selectedUnit,
          x,
          y,
          11
        );
        setPreviewCells(affectedCells);
      }
    }
    // For actions
    else if (actionTargetingMode && activeAction && selectedUnit) {
      const { impl } = activeAction;
      if (impl.microActions[0]?.targetingType !== TargetingType.SELF) {
        const affectedCells = getActionAffectedCells(
          impl,
          selectedUnit,
          x,
          y,
          11
        );
        setPreviewCells(affectedCells);
      }
    }

    // For Noble Phantasms
    else if (npTargetingMode && activeNP && selectedUnit) {
      const { impl } = activeNP;
      if (impl.microActions[0]?.targetingType !== TargetingType.SELF) {
        const affectedCells = getNPAffectedCells(impl, selectedUnit, x, y, 11);
        setPreviewCells(affectedCells);
      }
    }
  };

  const UnitStatsTooltip = ({ unit }) => (
    <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white p-2 rounded shadow-lg z-10">
      <div className="text-sm font-bold mb-1">{unit.name}</div>
      <div className="flex gap-2 text-xs">
        <span className="flex items-center">
          <Heart size={12} className="mr-1" />
          {unit.hp}
        </span>
        <span className="flex items-center">
          <Sword size={12} className="mr-1" />
          {unit.atk}
        </span>
        <span className="flex items-center">
          <Shield size={12} className="mr-1" />
          {unit.def}
        </span>
        <span className="flex items-center">
          <Move size={12} className="mr-1" />
          {unit.movementLeft}/{unit.movementRange}
        </span>
      </div>
    </div>
  );

  const renderCell = (x, y) => {
    const unit = getUnitAt(x, y);
    const isSelected = selectedUnit && selectedUnit.id === unit?.id;
    const isValidMove = highlightedCells.some(
      (move) => move.x === x && move.y === y
    );
    //addition for skill use logic
    const isInPreview = previewCells.has(`${x},${y}`);
    //addition for visibility
    const isVisible = isCellVisible(x, y);

    let bgColor = "bg-green-100";

    if (!isVisible) {
      if (isInPreview) {
        bgColor =
          "bg-gray-900 after:absolute after:inset-0 after:bg-red-500 after:opacity-30";
      } else {
        bgColor = "bg-gray-900";
      }
    } else if (isInPreview) {
      if (skillTargetingMode) {
        // Different colors for different targeting types
        if (
          activeSkill?.impl.microActions[0]?.targetingType ===
          TargetingType.SELF
        ) {
          bgColor = "bg-blue-200"; // Self-targeting preview
        } else if (
          activeSkill?.impl.microActions[0]?.targetingType ===
          TargetingType.AOE_FROM_POINT_WITHIN_RANGE
        ) {
          bgColor = "bg-purple-200"; // Constrained AOE preview
        } else {
          bgColor = "bg-blue-300"; // Standard AOE preview
        }
      } else if (actionTargetingMode) {
        // Action targeting colors (you can customize these)
        if (
          activeAction?.impl.microActions[0]?.targetingType ===
          TargetingType.SELF
        ) {
          bgColor = "bg-green-200";
        } else if (
          activeAction?.impl.microActions[0]?.targetingType ===
          TargetingType.AOE_FROM_POINT_WITHIN_RANGE
        ) {
          bgColor = "bg-yellow-200";
        } else {
          bgColor = "bg-green-300";
        }
      } else if (npTargetingMode) {
        // Noble Phantasm targeting colors (golds/reds)
        if (
          activeNP?.impl.microActions[0]?.targetingType === TargetingType.SELF
        ) {
          bgColor = "bg-amber-300 bg-opacity-70"; // Golden glow for self-targeting NPs
        } else if (
          activeNP?.impl.microActions[0]?.targetingType ===
          TargetingType.AOE_FROM_POINT_WITHIN_RANGE
        ) {
          bgColor = "bg-red-400 bg-opacity-60"; // Intense red for constrained AoE NPs
        } else {
          // For standard NP targeting, create a pulsing effect with multiple colors
          bgColor = `bg-gradient-to-br from-amber-300 to-red-500 bg-opacity-60
                      animate-pulse`;
        }
      }
    } else if (isSelected) {
      bgColor = "bg-blue-300";
    } else if (isValidMove) {
      bgColor = "bg-blue-100";
    }

    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
    if (isHovered && unit && unit.team === playerTeam) {
      bgColor = "bg-yellow-200";
    }

    const canTargetNonVisibleCells = () => {
      if (skillTargetingMode && activeSkill) {
        const targetingType = activeSkill.impl.microActions[0]?.targetingType;
        return (
          targetingType === TargetingType.AOE_AROUND_SELF ||
          targetingType === TargetingType.AOE_CARDINAL_DIRECTION ||
          targetingType === TargetingType.AOE_FROM_POINT
        );
      }
      if (actionTargetingMode && activeAction) {
        const targetingType = activeAction.impl.microActions[0]?.targetingType;
        return (
          targetingType === TargetingType.AOE_AROUND_SELF ||
          targetingType === TargetingType.AOE_CARDINAL_DIRECTION ||
          targetingType === TargetingType.AOE_FROM_POINT
        );
      }
      if (npTargetingMode && activeNP) {
        const targetingType = activeNP.impl.microActions[0]?.targetingType;
        return (
          targetingType === TargetingType.AOE_AROUND_SELF ||
          targetingType === TargetingType.AOE_CARDINAL_DIRECTION ||
          targetingType === TargetingType.AOE_FROM_POINT
        );
      }
      return false;
    };

    // Add special effects for NP targeting
    let additionalClasses = "";
    if (npTargetingMode && isInPreview) {
      additionalClasses = "ring-2 ring-amber-400 ring-opacity-50"; // Add a golden ring
    }

    return (
      <div
        key={`${x}-${y}`}
        className={`w-16 h-16 border border-gray-300 ${bgColor} ${additionalClasses} 
                       flex items-center justify-center relative cursor-pointer 
                       ${
                         npTargetingMode && isInPreview
                           ? "transform transition-transform hover:scale-105"
                           : ""
                       }`}
        onClick={() => {
          // Allow click if cell is visible OR if we're targeting with an AoE skill
          if (isVisible || canTargetNonVisibleCells()) {
            handleCellClick(x, y);
          }
        }}
        //onMouseEnter is the addition for skill logic
        onMouseEnter={() => handleCellHover(x, y)}
        onMouseLeave={() => setHoveredCell(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (unit && isVisible) {
            handleContextMenu(e, unit);
          } else {
            // Close menu when right-clicking empty cell
            setContextMenu(null);
            setActiveUnit(null);
          }
        }}
      >
        {/* Add special effects for NP targeting */}
        {npTargetingMode && isInPreview && (
          <div className="absolute inset-0 bg-amber-500 opacity-20 animate-pulse" />
        )}
        {unit && isVisible && (
          <div
            className={`absolute inset-0 flex items-center justify-center 
                            ${
                              unit.team === playerTeam
                                ? "text-blue-600"
                                : "text-red-600"
                            }
                            ${unit.movementLeft === 0 ? "opacity-50" : ""}`}
            onMouseEnter={() => setHoveredUnit(unit)}
            onMouseLeave={() => setHoveredUnit(null)}
          >
            <img
              src={unit.sprite}
              alt={unit.name}
              className={`w-16 h-16 object-contain ${
                npTargetingMode && isInPreview ? "filter brightness-110" : ""
              }`}
            />
            {hoveredUnit?.id === unit.id && <UnitStatsTooltip unit={unit} />}
            {unit && isVisible && (
              <div
                className={`absolute inset-0 flex items-center justify-center 
                          ${
                            unit.team === playerTeam
                              ? "text-blue-600"
                              : "text-red-600"
                          }
                          ${unit.movementLeft === 0 ? "opacity-50" : ""}`}
                onMouseEnter={() => setHoveredUnit(unit)}
                onMouseLeave={() => setHoveredUnit(null)}
              >
                <img
                  src={unit.sprite}
                  alt={unit.name}
                  className={`w-16 h-16 object-contain ${
                    npTargetingMode && isInPreview
                      ? "filter brightness-110"
                      : ""
                  } ${unit.canCounter ? "ring-2 ring-orange-400" : ""}`}
                />
                {/* Counter indicator */}
                {unit.canCounter && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <Target size={10} className="text-white" />
                  </div>
                )}
                {hoveredUnit?.id === unit.id && (
                  <UnitStatsTooltip unit={unit} />
                )}
              </div>
            )}

            {/* Add ReceiveAttackButton if unit has pending combat */}
            {/* <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                        <ReceiveAttackButton unit={unit} />
                    </div> */}
          </div>
        )}
      </div>
    );
  };

  const VisionRangeOverlay = () => {
    if (!hoveredCell) return null;

    const unit = getUnitAt(hoveredCell.x, hoveredCell.y);
    if (!unit || unit.team !== playerTeam) return null;

    const visionRange = unit.visionRange || 3;
    const visibleCells = calculateVisibleCells(unit);

    return (
      <div className="absolute inset-0 pointer-events-none">
        {Array.from(visibleCells).map((cellCoord) => {
          const [x, y] = cellCoord.split(",").map(Number);
          return (
            <div
              key={cellCoord}
              className="absolute bg-yellow-100 opacity-30"
              style={{
                left: `${x * 64}px`,
                top: `${y * 64}px`,
                width: "64px",
                height: "64px",
              }}
            />
          );
        })}
      </div>
    );
  };

  // Add this component definition in TacticalGame.jsx before the return statement:

  const DetectionResults = ({ results }) => {
    if (!results) return null;

    return (
      <div className="fixed top-4 right-4 p-4 bg-black bg-opacity-75 text-white rounded shadow-lg">
        <h3 className="text-lg font-bold mb-2">Detection Results</h3>
        {results.map((result, index) => (
          <div key={index} className="mb-2">
            <div className="text-sm">
              Unit {result.unitId}:
              {result.wasDetected ? (
                <span className="text-green-400 ml-2">Detected!</span>
              ) : (
                <span className="text-red-400 ml-2">Remained Hidden</span>
              )}
            </div>
            <div className="text-xs text-gray-400">
              Roll: {result.roll} / Threshold: {result.threshold}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Get current player's team for proper unit coloring
  const playerTeam =
    gameState?.players[
      Object.keys(gameState.players).find(
        (id) => gameState.players[id].username === username
      )
    ]?.team;

  // In TacticalGame.jsx, replace the return statement with:

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">
          {gameState.turn === playerTeam
            ? "Your Turn"
            : `${gameState.turn}'s Turn`}
        </h2>
        <div className="text-sm text-gray-600">
          Turn {gameState.currentTurn} | Round {gameState.currentRound}
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">
            Turns per Round: {gameState.turnsPerRound}
          </div>
          <div className="text-sm text-gray-600">
            Turns until next round:{" "}
            {gameState.turnsPerRound -
              (gameState.currentTurn % gameState.turnsPerRound)}
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {gameState.turn === playerTeam && (
            <button
              onClick={endTurn}
              className={`px-4 py-2 rounded text-white ${
                hasCounterPendingOnBoard(gameState)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
              disabled={hasCounterPendingOnBoard(gameState)}
              title={
                hasCounterPendingOnBoard(gameState)
                  ? "Cannot end turn while counter is pending"
                  : "End your turn"
              }
            >
              End Turn
              {hasCounterPendingOnBoard(gameState) && (
                <span className="ml-2 text-xs">(Counter Pending)</span>
              )}
            </button>
          )}
          <DetectionButton />
          <button
            onClick={() => setShowServantSelector(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Servant
          </button>
        </div>
      </div>

      <div className="inline-block border-2 border-gray-400 relative">
        {Array.from({ length: GRID_SIZE }).map((_, y) => (
          <div key={y} className="flex">
            {Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))}
          </div>
        ))}
        <VisionRangeOverlay />
      </div>

      {contextMenu && activeUnit && (
        <ContextMenu position={contextMenu} unit={activeUnit} />
      )}
      {showSkillsMenu && activeUnit && <SkillsMenu unit={activeUnit} />}
      {showNPMenu && activeUnit && <NoblePhantasmMenu unit={activeUnit} />}
      {showProfile && activeUnit && <ProfileSheet unit={activeUnit} />}

      {showCombatSelection && activeUnit && (
        <CombatSelectionMenu
          unit={activeUnit}
          onClose={() => setShowCombatSelection(false)}
          onSelectReceived={() => {
            setShowCombatSelection(false);
            setShowCombatManagement(true);
          }}
          onSelectSent={() => {
            setShowCombatSelection(false);
            setShowCombatTargets(true);
          }}
        />
      )}

      {showCombatTargets && activeUnit && (
        <CombatTargetsMenu
          unit={activeUnit}
          onClose={() => {
            setShowCombatTargets(false);
            setSelectedCombatTarget(null);
          }}
          onSelectTarget={(combat) => {
            setShowCombatTargets(false);
            setSelectedCombatTarget(combat);
            setShowSentCombatManagement(true);
          }}
        />
      )}

      {showCombatManagement && activeUnit && (
        <CombatManagementMenu
          unit={activeUnit}
          onClose={() => setShowCombatManagement(false)}
        />
      )}

      {showSentCombatManagement && activeUnit && selectedCombatTarget && (
        <CombatManagementMenuForSent
          unit={activeUnit}
          defenderId={selectedCombatTarget.defender.id}
          onClose={() => {
            setShowSentCombatManagement(false);
            setSelectedCombatTarget(null);
          }}
        />
      )}

      {showOtherActions && activeUnit && <OtherActionsMenu unit={activeUnit} />}
      {showUniqueActions && activeUnit && (
        <UniqueActionsMenu
          unit={activeUnit}
          onClose={() => setShowUniqueActions(false)}
        />
      )}
      {showCommonActions && activeUnit && (
        <CommonActionsMenu
          unit={activeUnit}
          onClose={() => setShowCommonActions(false)}
        />
      )}
      {showServantSelector && (
        <ServantSelector
          onClose={() => setShowServantSelector(false)}
          onSelectServant={handleAddServant}
          teams={Object.values(gameState.players).map((player) => player.team)}
          gameState={gameState}
        />
      )}
      {detectionResults && <DetectionResults results={detectionResults} />}
      {detectionError && <DetectionError message={detectionError} />}
      {combatCompletionMessage && (
        <CombatCompletionNotification
          message={combatCompletionMessage}
          onClose={() => setCombatCompletionMessage(null)}
        />
      )}
    </div>
  );
};

export default TacticalGame;
