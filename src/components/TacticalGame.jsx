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
  Save,
  FolderOpen,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
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
import { VehicleUtils } from "../game/utils/VehicleUtils.js";
import {
  VehiclePassengerManager,
  VehicleInspector,
} from "./VehicleUIComponents.jsx";

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
  const isCellVisible = (x, y, z = currentViewHeight) => {
    return gameState.visibleCells?.includes(`${x},${y},${z}`);
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
  const [showSaveLoadMenu, setShowSaveLoadMenu] = useState(false);
  const [saveLoadMessage, setSaveLoadMessage] = useState(null);
  const [autosaves, setAutosaves] = useState([]);
  const [showAutosaveMenu, setShowAutosaveMenu] = useState(false);
  const [triggerNotifications, setTriggerNotifications] = useState([]);

  // NEW: Height system states
  const [currentViewHeight, setCurrentViewHeight] = useState(1);
  const [showElevatorConfirm, setShowElevatorConfirm] = useState(false);
  const [elevatorSelection, setElevatorSelection] = useState(null);
  const [maxHeight, setMaxHeight] = useState(3); // Maximum height levels

  const [showVehiclePassengerManager, setShowVehiclePassengerManager] =
    useState(false);
  const [showVehicleInspector, setShowVehicleInspector] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [movementPreviewMode, setMovementPreviewMode] = useState(false);
  const [showBaseManagement, setShowBaseManagement] = useState(false);
  const [baseManagementMessage, setBaseManagementMessage] = useState(null);

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
              z: 1,
              team: "player1",
              hp: 20,
              atk: 8,
              def: 5,
              baseMovementRange: 5,
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
              aboardVehicle: null, // ID of vehicle this unit is aboard, null if not aboard
              vehicleRelativePosition: null, // {x, y} relative position within vehicle
              isVehicle: false, // Mark regular units as not vehicles
            },
            // Add other initial units here

            {
              id: 2,
              x: 3,
              y: 1,
              z: 1,
              team: "player2",
              hp: 18,
              atk: 6,
              def: 7,
              baseMovementRange: 3,
              movementRange: 3, // Heavy armored unit with low movement
              movementLeft: 3,
              hasAttacked: false,
              visionRange: 1,
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
              aboardVehicle: null, // ID of vehicle this unit is aboard, null if not aboard
              vehicleRelativePosition: null, // {x, y} relative position within vehicle
              isVehicle: false, // Mark regular units as not vehicles
            },
          ],
          // NEW: Initialize terrain data
          initialTerrain: null,
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
      if (lastJsonMessage.gameState.terrain) {
        const heights = Object.keys(lastJsonMessage.gameState.terrain).map(
          Number
        );
        setMaxHeight(Math.max(...heights));
      }
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
    // save/autosaves messages
    else if (lastJsonMessage?.type === "SAVE_COMPLETE") {
      handleSaveComplete(lastJsonMessage.saveData);
    } else if (lastJsonMessage?.type === "SAVE_ERROR") {
      setSaveLoadMessage({ type: "error", text: lastJsonMessage.message });
      setTimeout(() => setSaveLoadMessage(null), 3000);
    } else if (lastJsonMessage?.type === "LOAD_COMPLETE") {
      setSaveLoadMessage({ type: "success", text: lastJsonMessage.message });
      setTimeout(() => setSaveLoadMessage(null), 3000);
      setShowSaveLoadMenu(false);
      setShowAutosaveMenu(false);
    } else if (lastJsonMessage?.type === "LOAD_ERROR") {
      setSaveLoadMessage({ type: "error", text: lastJsonMessage.message });
      setTimeout(() => setSaveLoadMessage(null), 3000);
    } else if (lastJsonMessage?.type === "AUTOSAVES_LIST") {
      setAutosaves(lastJsonMessage.autosaves);
    } else if (lastJsonMessage?.type === "AUTOSAVES_ERROR") {
      setSaveLoadMessage({ type: "error", text: lastJsonMessage.message });
      setTimeout(() => setSaveLoadMessage(null), 3000);
    } else if (lastJsonMessage?.type === "TRIGGER_EFFECT_NOTIFICATION") {
      // Add new trigger notification
      const newNotification = {
        id: Date.now(),
        unitName: lastJsonMessage.unitName,
        triggerName: lastJsonMessage.triggerName,
        description: lastJsonMessage.description,
      };

      setTriggerNotifications((prev) => [...prev, newNotification]);
    }
    //base assignment
    else if (lastJsonMessage?.type === "BASE_ASSIGNMENT_COMPLETE") {
      setBaseManagementMessage({
        type: "success",
        text: lastJsonMessage.message,
      });
      setTimeout(() => setBaseManagementMessage(null), 3000);
    } else if (lastJsonMessage?.type === "BASE_ASSIGNMENT_ERROR") {
      setBaseManagementMessage({
        type: "error",
        text: lastJsonMessage.message,
      });
      setTimeout(() => setBaseManagementMessage(null), 3000);
    }
    //changing color
    else if (lastJsonMessage?.type === "COLOR_CHANGE_COMPLETE") {
      setBaseManagementMessage({
        type: "success",
        text: lastJsonMessage.message,
      });
      setTimeout(() => setBaseManagementMessage(null), 3000);
    } else if (lastJsonMessage?.type === "COLOR_CHANGE_ERROR") {
      setBaseManagementMessage({
        type: "error",
        text: lastJsonMessage.message,
      });
      setTimeout(() => setBaseManagementMessage(null), 3000);
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

  // 2. Add helper function to calculate vehicle/big unit preview cells
  const getMovementPreviewCells = (unit, targetX, targetY) => {
    if (!unit.isBiggerThanOneCell && !unit.isVehicle) {
      return new Set([`${targetX},${targetY}`]);
    }

    const cells = new Set();
    const dimensions = unit.dimensions || { width: 1, height: 1 };

    // For vehicles/big units, show all cells they would occupy
    for (let dx = 0; dx < dimensions.width; dx++) {
      for (let dy = 0; dy < dimensions.height; dy++) {
        const cellX = targetX + dx;
        const cellY = targetY + dy;
        if (
          cellX >= 0 &&
          cellX < GRID_SIZE &&
          cellY >= 0 &&
          cellY < GRID_SIZE
        ) {
          cells.add(`${cellX},${cellY}`);
        }
      }
    }

    return cells;
  };
  // NEW: Generate initial terrain data
  const generateInitialTerrain = () => {
    const terrain = {};
    const GRID_SIZE = 11;

    for (let z = 1; z <= maxHeight; z++) {
      terrain[z] = {};
      for (let x = 0; x < GRID_SIZE; x++) {
        terrain[z][x] = {};
        for (let y = 0; y < GRID_SIZE; y++) {
          terrain[z][x][y] = {
            x,
            y,
            z,
            isFloor: z === 1, // Only height 1 has floor by default
            terrainType: getRandomTerrainType(x, y, z),
            terrainEffects: getTerrainEffects(getRandomTerrainType(x, y, z)),
          };
        }
      }
    }

    // Add some elevators at random positions
    addElevators(terrain);

    return terrain;
  };

  const getRandomTerrainType = (x, y, z) => {
    // Add some variety to terrain
    const random = Math.random();
    if (random < 0.05) return "elevator";
    if (random < 0.1) return "fire";
    if (random < 0.15) return "ice";
    if (random < 0.2) return "healing";
    return "normal";
  };

  const getTerrainEffects = (terrainType) => {
    switch (terrainType) {
      case "fire":
        return [
          {
            name: "Burn",
            type: "DamageOverTime",
            value: 2,
            duration: 3,
            description: "Takes 2 damage per turn for 3 turns",
          },
        ];
      case "ice":
        return [
          {
            name: "Slow",
            type: "MovementReduction",
            value: 1,
            duration: 2,
            description: "Movement reduced by 1 for 2 turns",
          },
        ];
      case "healing":
        return [
          {
            name: "Regeneration",
            type: "HealOverTime",
            value: 3,
            duration: 2,
            description: "Heals 3 HP per turn for 2 turns",
          },
        ];
      default:
        return [];
    }
  };

  // NEW: Add elevators to terrain
  const addElevators = (terrain) => {
    const GRID_SIZE = 11;
    const elevatorPositions = [
      { x: 2, y: 2 },
      { x: 8, y: 8 },
      { x: 5, y: 1 },
      { x: 1, y: 9 },
    ];

    elevatorPositions.forEach((pos) => {
      for (let z = 1; z <= maxHeight; z++) {
        if (terrain[z] && terrain[z][pos.x] && terrain[z][pos.x][pos.y]) {
          terrain[z][pos.x][pos.y].terrainType = "elevator";
          terrain[z][pos.x][pos.y].terrainEffects = [];
          if (z > 1) {
            terrain[z][pos.x][pos.y].isFloor = true; // Elevators are floors
          }
        }
      }
    });
  };

  // NEW: Check if unit can move to height
  const canMoveToHeight = (unit, targetZ) => {
    if (targetZ === unit.z) return true;

    const currentCell = getCellAt(unit.x, unit.y, unit.z);
    if (!currentCell || currentCell.terrainType !== "elevator") {
      return false;
    }

    if (targetZ > unit.z) {
      // Going up - check for valid floor space within 1 cell distance
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const checkX = unit.x + dx;
          const checkY = unit.y + dy;
          const targetCell = getCellAt(checkX, checkY, targetZ);
          if (targetCell && targetCell.isFloor) {
            return true;
          }
        }
      }
      return false;
    } else {
      // Going down - check if target level exists and has floor
      const targetCell = getCellAt(unit.x, unit.y, targetZ);
      return targetCell && targetCell.isFloor;
    }
  };

  const getCellAt = (x, y, z) => {
    return gameState?.terrain?.[z]?.[x]?.[y] || null;
  };

  // NEW: Height Control Component
  const HeightControls = () => {
    return (
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg rounded-lg p-2 border">
        <div className="text-center text-sm font-bold mb-2">Height</div>

        <button
          onClick={() =>
            setCurrentViewHeight(Math.min(maxHeight, currentViewHeight + 1))
          }
          className={`w-8 h-8 flex items-center justify-center rounded mb-1 ${
            currentViewHeight < maxHeight
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500"
          }`}
          disabled={currentViewHeight >= maxHeight}
        >
          <ChevronUp size={16} />
        </button>

        <div className="text-center text-lg font-bold my-2 px-2 py-1 bg-gray-100 rounded">
          {currentViewHeight}
        </div>

        <button
          onClick={() =>
            setCurrentViewHeight(Math.max(1, currentViewHeight - 1))
          }
          className={`w-8 h-8 flex items-center justify-center rounded mt-1 ${
            currentViewHeight > 1
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500"
          }`}
          disabled={currentViewHeight <= 1}
        >
          <ChevronDown size={16} />
        </button>
      </div>
    );
  };

  // NEW: Elevator Confirmation Dialog
  const ElevatorConfirmDialog = () => {
    if (!showElevatorConfirm || !elevatorSelection) return null;

    const { unit, targetZ } = elevatorSelection;
    const canMove = canMoveToHeight(unit, targetZ);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[400px]">
          <h3 className="text-xl font-bold mb-4">Height Transition</h3>

          <div className="mb-4">
            <p className="text-gray-700">
              Do you want to move <strong>{unit.name}</strong> from height{" "}
              <strong>{unit.z}</strong> to height <strong>{targetZ}</strong>?
            </p>

            {!canMove && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                <p className="text-red-700 text-sm">
                  Cannot move to height {targetZ}: No valid floor space
                  available.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowElevatorConfirm(false);
                setElevatorSelection(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>

            <button
              onClick={() => {
                if (canMove) {
                  handleHeightTransition(unit, targetZ);
                }
                setShowElevatorConfirm(false);
                setElevatorSelection(null);
              }}
              className={`px-4 py-2 rounded ${
                canMove
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
              disabled={!canMove}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Handle height transition
  const handleHeightTransition = (unit, targetZ) => {
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "CHANGE_HEIGHT",
      unitId: unit.id,
      newZ: targetZ,
    });
  };

  const getHeightBaseColor = (height) => {
    switch (height) {
      case 1:
        return "green"; // Z:1 = green tones
      case 2:
        return "blue"; // Z:2 = blue tones
      case 3:
        return "purple"; // Z:3 = purple tones
      default:
        return "gray";
    }
  };

  const getTerrainColorForHeight = (terrainType, height, teamColor = null) => {
    const baseColor = getHeightBaseColor(height);
    // Handle base territories first
    if (terrainType === "base" && teamColor) {
      // Create base colors that blend with the height-based colors
      const baseColorMap = {
        white:
          height === 1
            ? "bg-gray-100"
            : height === 2
            ? "bg-gray-200"
            : "bg-gray-300",
        black:
          height === 1
            ? "bg-amber-700"
            : height === 2
            ? "bg-amber-800"
            : "bg-amber-900",
        red:
          height === 1
            ? "bg-red-200"
            : height === 2
            ? "bg-red-300"
            : "bg-red-400",
        blue:
          height === 1
            ? "bg-blue-200"
            : height === 2
            ? "bg-blue-300"
            : "bg-blue-400",
        green:
          height === 1
            ? "bg-green-200"
            : height === 2
            ? "bg-green-300"
            : "bg-green-400",
        yellow:
          height === 1
            ? "bg-yellow-200"
            : height === 2
            ? "bg-yellow-300"
            : "bg-yellow-400",
        purple:
          height === 1
            ? "bg-purple-200"
            : height === 2
            ? "bg-purple-300"
            : "bg-purple-400",
        orange:
          height === 1
            ? "bg-orange-200"
            : height === 2
            ? "bg-orange-300"
            : "bg-orange-400",
      };
      return baseColorMap[teamColor] || "bg-gray-200";
    }

    switch (terrainType) {
      // case "fire":
      //   if (baseColor === "green") return "bg-red-200"; // Light red with green tint
      //   if (baseColor === "blue") return "bg-red-300"; // Medium red with blue tint
      //   if (baseColor === "purple") return "bg-red-400"; // Darker red with purple tint
      //   return "bg-red-200";

      // case "ice":
      //   if (baseColor === "green") return "bg-cyan-200"; // Light cyan with green tint
      //   if (baseColor === "blue") return "bg-blue-200"; // Pure blue
      //   if (baseColor === "purple") return "bg-indigo-300"; // Blue-purple
      //   return "bg-blue-200";

      // case "healing":
      //   if (baseColor === "green") return "bg-green-200"; // Pure green
      //   if (baseColor === "blue") return "bg-teal-200"; // Green-blue
      //   if (baseColor === "purple") return "bg-emerald-300"; // Green with purple tint
      //   return "bg-green-200";

      // case "elevator":
      //   if (baseColor === "green") return "bg-yellow-200"; // Light yellow
      //   if (baseColor === "blue") return "bg-amber-200"; // Amber
      //   if (baseColor === "purple") return "bg-orange-200"; // Orange
      //   return "bg-yellow-200";

      default: // normal terrain
        if (baseColor === "green") return "bg-green-100"; // Light green
        if (baseColor === "blue") return "bg-blue-100"; // Light blue
        if (baseColor === "purple") return "bg-purple-100"; // Light purple
        return "bg-green-100";
    }
  };

  // 2. TACTICALGAME.JSX - Helper function to find the effective cell (looks down through heights)
  const getEffectiveCell = (x, y, startHeight) => {
    // Look down from startHeight to find the first floor
    for (let z = startHeight; z >= 1; z--) {
      const cell = getCellAt(x, y, z);
      if (cell && cell.isFloor) {
        return { cell, actualHeight: z };
      }
    }
    // If no floor found, return null
    return { cell: null, actualHeight: null };
  };

  // 3. TACTICALGAME.JSX - Helper function to get all units at a position across heights
  const getAllUnitsAtPosition = (x, y, maxHeight = 3) => {
    const units = [];
    for (let z = 1; z <= maxHeight; z++) {
      const unit = getUnitAt(x, y, z);
      if (unit) {
        units.push({ unit, height: z });
      }
    }
    return units.sort((a, b) => b.height - a.height); // Highest first
  };

  // 5. TACTICALGAME.JSX - Add height legend component
  const HeightLegend = () => {
    return (
      <div className="fixed top-4 left-4 bg-white shadow-lg rounded-lg p-3 border">
        <div className="text-sm font-bold mb-2">Height Colors</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border rounded"></div>
            <span>Height 1 (Ground)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border rounded"></div>
            <span>Height 2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border rounded"></div>
            <span>Height 3</span>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-2 border-t pt-2">
          Viewing: Height {currentViewHeight}
        </div>
      </div>
    );
  };

  const handleSaveGame = () => {
    sendJsonMessage({
      type: "SAVE_GAME",
    });
  };

  const handleSaveComplete = (saveData) => {
    const dataStr = JSON.stringify(saveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tactical_rpg_save_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSaveLoadMessage({ type: "success", text: "Game saved successfully!" });
    setTimeout(() => setSaveLoadMessage(null), 3000);
  };

  const handleLoadGame = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target.result);
        sendJsonMessage({
          type: "LOAD_GAME",
          saveData: saveData,
        });
      } catch (error) {
        setSaveLoadMessage({ type: "error", text: "Invalid save file format" });
        setTimeout(() => setSaveLoadMessage(null), 3000);
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = "";
  };

  const handleGetAutosaves = () => {
    sendJsonMessage({
      type: "GET_AUTOSAVES",
    });
    setShowAutosaveMenu(true);
  };

  const handleLoadAutosave = (autosaveIndex) => {
    sendJsonMessage({
      type: "LOAD_AUTOSAVE",
      autosaveIndex: autosaveIndex,
    });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // ADD this function to remove trigger notifications
  const removeTriggerNotification = (notificationId) => {
    setTriggerNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId)
    );
  };

  // ADD this component before your return statement
  const TriggerEffectNotification = ({ notification, onClose }) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Show for 4 seconds

      return () => clearTimeout(timer);
    }, [onClose]);

    if (!notification) return null;

    return (
      <div className="p-4 bg-purple-600 text-white rounded shadow-lg max-w-md">
        <div className="text-sm font-bold mb-1">Trigger Effect Activated!</div>
        <div className="text-sm mb-2">
          <strong>{notification.unitName}</strong> - {notification.triggerName}
        </div>
        <div className="text-xs opacity-90">{notification.description}</div>
        <button
          onClick={onClose}
          className="absolute top-1 right-2 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    );
  };

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

  const handleBoardUnit = (vehicleId, unitId, relativeX, relativeY) => {
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "BOARD_VEHICLE",
      vehicleId: vehicleId,
      unitId: unitId,
      relativeX: relativeX,
      relativeY: relativeY,
    });
  };

  const handleDisembarkUnit = (
    vehicleId,
    unitId,
    targetX,
    targetY,
    targetZ
  ) => {
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "DISEMBARK_VEHICLE",
      vehicleId: vehicleId,
      unitId: unitId,
      targetX: targetX,
      targetY: targetY,
      targetZ: targetZ,
    });
  };

  const handleVehicleInspect = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleInspector(true);
  };

  const handleVehicleManagePassengers = () => {
    setShowVehicleInspector(false);
    setShowVehiclePassengerManager(true);
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

      console.log("newCooldown is now:", newCooldownUntil);
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
          Math.floor(skillImpl.cooldown * gameState.turnsPerRound);

        // Create deep copy with preserved cooldowns
        const updatedGameState = {
          ...result.updatedGameState,
          units: result.updatedGameState.units.map((updatedUnit) => {
            if (updatedUnit.id === unit.id) {
              return {
                ...updatedUnit,
                skills: updatedUnit.skills.map((skill) => {
                  if (skill.id === skillRef.id) {
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

        console.log("Skill execution (deep copy on Targeting Self):", {
          success: result.success,
          updatedState: result.updatedGameState,
          onCooldownUntil: newCooldownUntil,
        });

        sendJsonMessage({
          type: "GAME_ACTION",
          action: "USE_SKILL",
          skillName: skillRef.name,
          casterId: unit.id,
          targetX: unit.x,
          targetY: unit.y,
          updatedGameState: updatedGameState,
          newCooldownUntil: newCooldownUntil,
        });
        console.log("newCooldown is now:", newCooldownUntil);
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

  const moveUnit = (unit, newX, newY, newZ = unit.z) => {
    if (!unit || unit.movementLeft <= 0) return;

    const distance = calculateDistance(unit.x, unit.y, newX, newY);
    if (distance > unit.movementLeft) return;

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "MOVE_UNIT",
      unitId: unit.id,
      newX,
      newY,
      newZ,
      newMovementLeft: unit.movementLeft - distance,
    });

    setSelectedUnit(null);
    setHighlightedCells([]);
  };
  const moveVehicle = (vehicle, newX, newY, newZ) => {
    if (!vehicle || !vehicle.isVehicle || vehicle.movementLeft <= 0) {
      console.log("Cannot move vehicle: invalid vehicle or no movement left");
      return;
    }

    const distance = calculateDistance(vehicle.x, vehicle.y, newX, newY);
    if (distance > vehicle.movementLeft) {
      console.log("Cannot move vehicle: distance exceeds movement range");
      return;
    }

    // Final validation
    if (
      !VehicleUtils.canVehicleMoveTo(
        vehicle,
        newX,
        newY,
        newZ,
        gameState,
        GRID_SIZE
      )
    ) {
      console.log("Cannot move vehicle: position validation failed");
      return;
    }

    console.log(
      `Moving vehicle ${vehicle.name} from (${vehicle.x},${vehicle.y}) to (${newX},${newY})`
    );

    sendJsonMessage({
      type: "GAME_ACTION",
      action: "MOVE_VEHICLE",
      vehicleId: vehicle.id,
      newX,
      newY,
      newZ,
      newMovementLeft: vehicle.movementLeft - distance,
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

  const debugVehicleBoarding = (unit) => {
    console.log("=== VEHICLE BOARDING DEBUG ===");
    console.log("Unit:", unit.name, "at position", unit.x, unit.y, unit.z);
    console.log("Unit team:", unit.team);
    console.log("Unit isVehicle:", unit.isVehicle);
    console.log("Unit aboardVehicle:", unit.aboardVehicle);

    // Find all vehicles
    const allVehicles = gameState.units.filter((u) => u.isVehicle);
    console.log(
      "All vehicles:",
      allVehicles.map((v) => ({ name: v.name, x: v.x, y: v.y, team: v.team }))
    );

    // Find allied vehicles
    const alliedVehicles = allVehicles.filter((v) => v.team === unit.team);
    console.log(
      "Allied vehicles:",
      alliedVehicles.map((v) => ({ name: v.name, x: v.x, y: v.y }))
    );

    // Check distances to each allied vehicle
    alliedVehicles.forEach((vehicle) => {
      const isOnVehicle = VehicleUtils.isPositionInVehicle(
        vehicle,
        unit.x,
        unit.y,
        unit.z
      );
      const distance = Math.max(
        Math.abs(unit.x - vehicle.x),
        Math.abs(unit.y - vehicle.y)
      );
      const maxDistance = Math.max(
        vehicle.dimensions.width,
        vehicle.dimensions.height
      );

      console.log(`Vehicle ${vehicle.name}:`);
      console.log(`  - isOnVehicle: ${isOnVehicle}`);
      console.log(`  - distance: ${distance}, maxDistance: ${maxDistance}`);
      console.log(`  - isNearby: ${distance <= maxDistance}`);
      console.log(
        `  - capacity: ${vehicle.containedUnits?.length || 0}/${
          vehicle.maxPassengers || 10
        }`
      );
    });

    console.log("=== END DEBUG ===");
  };

  const ContextMenu = ({ position, unit }) => {
    const isPlayerTurn = gameState.turn === unit.team;
    const hasCounterPending = hasCounterPendingOnBoard(gameState);
    const counterUnit = hasCounterPending ? getCounterUnit(gameState) : null;
    const isBlockedByCounter = hasCounterPending && counterUnit?.id !== unit.id;

    console.log("ContextMenu for unit:", unit.name, "Position:", position);

    if (!position) return null;

    // Find nearby vehicles for boarding
    const nearbyVehicles = gameState.units.filter((vehicle) => {
      if (!vehicle.isVehicle || vehicle.team !== unit.team) return false;
      if (unit.isVehicle || unit.aboardVehicle) return false;

      // Check if unit is adjacent to or on the vehicle
      const isOnVehicle = VehicleUtils.isPositionInVehicle(
        vehicle,
        unit.x,
        unit.y,
        unit.z
      );
      if (isOnVehicle) return true;

      // Check if unit is adjacent to vehicle
      const distance = Math.max(
        Math.abs(unit.x - vehicle.x),
        Math.abs(unit.y - vehicle.y)
      );

      // Consider adjacent if within 1 cell of vehicle edge
      const maxDistance = Math.max(
        vehicle.dimensions.width,
        vehicle.dimensions.height
      );
      return distance <= maxDistance;
    });

    console.log(
      "Nearby vehicles for",
      unit.name,
      ":",
      nearbyVehicles.map((v) => v.name)
    );

    debugVehicleBoarding(unit);

    return (
      <div
        className="fixed bg-white shadow-lg rounded-lg border border-gray-200 z-50 w-48 context-menu"
        style={{ left: position.x, top: position.y }}
      >
        <button
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                      ${
                        unit.hasAttacked || !isPlayerTurn || isBlockedByCounter
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

        {/* Vehicle-specific options */}
        {unit.isVehicle && (
          <>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                handleVehicleInspect(unit);
                setContextMenu(null);
              }}
            >
              <User size={16} /> Inspect Vehicle
            </button>
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                setSelectedVehicle(unit);
                setShowVehiclePassengerManager(true);
                setContextMenu(null);
              }}
            >
              <Move size={16} /> Manage Passengers
            </button>
          </>
        )}

        {/* Board nearby vehicles - FIXED */}
        {!unit.isVehicle &&
          !unit.aboardVehicle &&
          nearbyVehicles.length > 0 && (
            <>
              {nearbyVehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-green-600"
                  onClick={() => {
                    console.log(
                      `Attempting to board ${unit.name} onto ${vehicle.name}`
                    );
                    // Auto-board to first available position
                    const result = VehicleUtils.boardUnitAuto(
                      vehicle,
                      unit,
                      gameState
                    );
                    if (result) {
                      handleBoardUnit(
                        vehicle.id,
                        unit.id,
                        result.updatedUnit.vehicleRelativePosition.x,
                        result.updatedUnit.vehicleRelativePosition.y
                      );
                    } else {
                      console.error("Failed to auto-board unit");
                    }
                    setContextMenu(null);
                  }}
                  disabled={
                    !vehicle.containedUnits ||
                    vehicle.containedUnits.length >=
                      (vehicle.maxPassengers || 10)
                  }
                >
                  <ArrowRight size={16} /> Board {vehicle.name}
                  {vehicle.containedUnits &&
                    vehicle.containedUnits.length >=
                      (vehicle.maxPassengers || 10) && (
                      <span className="text-xs text-red-500 ml-auto">
                        (Full)
                      </span>
                    )}
                </button>
              ))}
            </>
          )}

        {/* Disembark option for units aboard vehicles */}
        {unit.aboardVehicle && (
          <button
            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-orange-600"
            onClick={() => {
              const vehicle = gameState.units.find(
                (v) => v.id === unit.aboardVehicle
              );
              if (vehicle) {
                const disembarkPositions = VehicleUtils.getDisembarkPositions(
                  vehicle,
                  gameState
                );
                if (disembarkPositions.length > 0) {
                  const pos = disembarkPositions[0];
                  handleDisembarkUnit(vehicle.id, unit.id, pos.x, pos.y, pos.z);
                }
              }
              setContextMenu(null);
            }}
          >
            <ArrowLeft size={16} /> Disembark
          </button>
        )}

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

  const SkillsMenu = ({ unitId, gameState }) => {
    const isPlayerTurn = gameState.turn === playerTeam;
    const unit = gameState.units.find((u) => u.id === unitId);
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

  const NoblePhantasmMenu = ({ unitId, gameState }) => {
    const isPlayerTurn = gameState.turn === playerTeam;
    const unit = gameState.units.find((u) => u.id === unitId);
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
            {[
              "stats",
              "skills",
              "noble phantasms",
              "reactions",
              "triggers",
            ].map((tab) => (
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

            {activeTab === "triggers" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-3">
                  Active Trigger Effects
                </h3>
                {unit.triggerEffects && unit.triggerEffects.length > 0 ? (
                  unit.triggerEffects.map((trigger, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded bg-purple-50"
                    >
                      <h4 className="font-bold text-lg text-purple-800">
                        {trigger.name}
                      </h4>
                      <div className="text-sm text-gray-600 mt-2">
                        {trigger.description}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-bold">Event:</span>{" "}
                        {trigger.eventType}
                      </div>
                      <div className="text-sm">
                        <span className="font-bold">Source:</span>{" "}
                        {trigger.source}
                      </div>
                      <div className="text-sm">
                        <span className="font-bold">Priority:</span>{" "}
                        {trigger.priority}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">
                    No active trigger effects
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const GRID_SIZE = 11;

  const getUnitAt = (
    x,
    y,
    z = currentViewHeight,
    prioritizeRegularUnits = false
  ) => {
    if (!gameState?.units) return null;

    const unitsAtPosition = [];

    // Collect all units at this position
    for (const unit of gameState.units) {
      // For regular units (single cell)
      if (!unit.isBiggerThanOneCell) {
        if (unit.x === x && unit.y === y && unit.z === z) {
          unitsAtPosition.push(unit);
        }
      } else {
        // For multi-cell units (vehicles, large creatures, etc.)
        if (unit.boardCells && Array.isArray(unit.boardCells)) {
          const occupiesPosition = unit.boardCells.some(
            (cell) => cell.x === x && cell.y === y && cell.z === z
          );
          if (occupiesPosition) {
            unitsAtPosition.push(unit);
          }
        } else {
          // Fallback: use VehicleUtils for vehicles without boardCells
          if (
            unit.isVehicle &&
            VehicleUtils.isPositionInVehicle(unit, x, y, z)
          ) {
            unitsAtPosition.push(unit);
          }
        }
      }
    }

    if (unitsAtPosition.length === 0) return null;
    if (unitsAtPosition.length === 1) return unitsAtPosition[0];

    // Multiple units at position - apply priority logic
    if (prioritizeRegularUnits) {
      // For interactions: prioritize regular units over vehicles
      const regularUnits = unitsAtPosition.filter((unit) => !unit.isVehicle);
      if (regularUnits.length > 0) {
        return regularUnits[0]; // Return first regular unit
      }
      return unitsAtPosition[0]; // Fall back to first unit if no regular units
    } else {
      // For rendering: return first unit found
      return unitsAtPosition[0];
    }
  };

  const getAllUnitsAt = (x, y, z = currentViewHeight) => {
    if (!gameState?.units) return [];

    const unitsAtPosition = [];

    for (const unit of gameState.units) {
      if (!unit.isBiggerThanOneCell) {
        if (unit.x === x && unit.y === y && unit.z === z) {
          unitsAtPosition.push(unit);
        }
      } else {
        if (unit.boardCells && Array.isArray(unit.boardCells)) {
          const occupiesPosition = unit.boardCells.some(
            (cell) => cell.x === x && cell.y === y && cell.z === z
          );
          if (occupiesPosition) {
            unitsAtPosition.push(unit);
          }
        } else if (
          unit.isVehicle &&
          VehicleUtils.isPositionInVehicle(unit, x, y, z)
        ) {
          unitsAtPosition.push(unit);
        }
      }
    }

    return unitsAtPosition;
  };
  const calculateDistance = (x1, y1, x2, y2) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };

  const getPossibleMoves = (unit) => {
    if (unit.isVehicle) {
      return VehicleUtils.getPossibleVehicleMoves(unit, gameState, GRID_SIZE);
    } else {
      // Enhanced movement logic for units that may be aboard vehicles
      const moves = [];
      const range = unit.movementLeft;

      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const distance = calculateDistance(unit.x, unit.y, x, y);
          if (distance <= range && distance > 0) {
            const targetCell = getCellAt(x, y, unit.z);

            // Check if the target cell has valid terrain (floor)
            if (!targetCell || !targetCell.isFloor) {
              continue; // Skip cells without valid floor
            }

            // Enhanced occupancy check that considers vehicle boarding context
            const canMoveToPosition = canUnitMoveToPosition(unit, x, y, unit.z);

            if (canMoveToPosition) {
              moves.push({ x, y, z: unit.z, distance });
            }
          }
        }
      }
      return moves;
    }
  };

  const canUnitMoveToPosition = (unit, targetX, targetY, targetZ) => {
    // First, check if there's a regular unit blocking this position
    // This handles the standard case of units blocking each other
    const blockingUnit = getUnitAt(targetX, targetY, targetZ);

    if (
      blockingUnit &&
      !blockingUnit.isVehicle &&
      !blockingUnit.isBiggerThanOneCell
    ) {
      // There's a regular unit at this position, so it's blocked
      return false;
    }

    // Now we need to handle the vehicle context
    const vehicleAtPosition = gameState.units.find(
      (vehicle) =>
        vehicle.isVehicle &&
        VehicleUtils.isPositionInVehicle(vehicle, targetX, targetY, targetZ)
    );

    if (vehicleAtPosition) {
      // There's a vehicle at this position
      if (unit.aboardVehicle === vehicleAtPosition.id) {
        // The unit is trying to move within their own vehicle - this should always be allowed
        // This is like walking from one room to another on the same ship
        return true;
      } else if (
        unit.aboardVehicle &&
        unit.aboardVehicle !== vehicleAtPosition.id
      ) {
        // The unit is aboard a different vehicle trying to move to another vehicle
        // This would require disembarking first, which we don't allow in a single move
        return false;
      } else if (!unit.aboardVehicle && vehicleAtPosition.team === unit.team) {
        // The unit is not aboard any vehicle but trying to move to an allied vehicle
        // This represents boarding the vehicle, which should be allowed
        return true;
      } else if (!unit.aboardVehicle && vehicleAtPosition.team !== unit.team) {
        // The unit is trying to move to an enemy vehicle - this should be blocked
        return false;
      }
    }

    // If we get here, there's no vehicle at the position, so we just need to check
    // if there are any other blocking units (like multi-cell non-vehicle units)
    const otherBlockingUnit = gameState.units.find(
      (otherUnit) =>
        otherUnit.id !== unit.id &&
        VehicleUtils.doesUnitOccupyPosition(
          otherUnit,
          targetX,
          targetY,
          targetZ
        )
    );

    return !otherBlockingUnit;
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

      // NEW: Enable movement preview mode for big units/vehicles
      if (unit.isBiggerThanOneCell || unit.isVehicle) {
        setMovementPreviewMode(true);
      }
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
    // First, clean up any existing context menus and active units
    // This ensures we start each click interaction with a clean slate
    setContextMenu(null);
    setActiveUnit(null);

    // Reset movement preview mode if we're clicking while in that state
    // This prevents visual artifacts when switching between different interaction types
    if (movementPreviewMode) {
      setMovementPreviewMode(false);
      setPreviewCells(new Set());
    }

    // SKILL TARGETING MODE: Handle skill execution when player is targeting with a skill
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

        console.log("Skill execution result on TacticalGame:", {
          success: result.success,
          updatedState: result.updatedGameState,
          nowCooldownIs: newCooldownUntil,
        });

        // Create deep copy with preserved cooldowns to maintain game state integrity
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

        // Send the skill execution to the server
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

      // Reset all targeting-related states after skill execution
      setSkillTargetingMode(false);
      setActiveSkill(null);
      setPreviewCells(new Set());
      setSelectedUnit(null);
      setMovementPreviewMode(false);
      return;
    }

    // ACTION TARGETING MODE: Handle action execution when player is targeting with an action
    if (actionTargetingMode && activeAction) {
      const caster = selectedUnit;
      if (!caster) return;

      const { ref, impl } = activeAction;
      const result = executeAction(ref, impl.type, gameState, caster, x, y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);

        // Maintain action cooldown state consistency
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

      // Clean up action targeting states
      setActionTargetingMode(false);
      setActiveAction(null);
      setPreviewCells(new Set());
      setSelectedUnit(null);
      setMovementPreviewMode(false);
      return;
    }

    // NOBLE PHANTASM TARGETING MODE: Handle NP execution when player is targeting with a Noble Phantasm
    if (npTargetingMode && activeNP) {
      const caster = selectedUnit;
      if (!caster) return;

      const { ref, impl } = activeNP;
      const result = executeNP(ref, gameState, caster, x, y);
      if (result.success) {
        const newCooldownUntil =
          gameState.currentTurn +
          Math.floor(impl.cooldown * gameState.turnsPerRound);

        // Preserve Noble Phantasm state integrity
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

      // Reset Noble Phantasm targeting states
      setNPTargetingMode(false);
      setActiveNP(null);
      setPreviewCells(new Set());
      setSelectedUnit(null);
      setMovementPreviewMode(false);
      return;
    }

    // MOVEMENT AND SELECTION LOGIC: This is where the enhanced movement system comes into play

    // Get the player's team information for ownership validation
    const playerTeam =
      gameState.players[
        Object.keys(gameState.players).find(
          (id) => gameState.players[id].username === username
        )
      ]?.team;

    // MOVEMENT PROCESSING: Handle movement when a unit is already selected
    if (selectedUnit) {
      // VEHICLE AND MULTI-CELL UNIT MOVEMENT
      if (selectedUnit.isVehicle || selectedUnit.isBiggerThanOneCell) {
        // Handle vehicle/big unit movement using existing specialized logic
        const validMove = highlightedCells.some(
          (move) => move.x === x && move.y === y
        );

        if (validMove) {
          // Double-check move validation for vehicles
          if (
            selectedUnit.isVehicle &&
            VehicleUtils.canVehicleMoveTo(
              selectedUnit,
              x,
              y,
              selectedUnit.z,
              gameState,
              GRID_SIZE
            )
          ) {
            moveVehicle(selectedUnit, x, y, selectedUnit.z);
          } else if (
            selectedUnit.isBiggerThanOneCell &&
            !selectedUnit.isVehicle
          ) {
            // Handle other big units (non-vehicles)
            moveUnit(selectedUnit, x, y, selectedUnit.z);
          } else {
            console.log("Vehicle/Big unit move validation failed");
            // Reset selection states on failed validation
            setSelectedUnit(null);
            setHighlightedCells([]);
            setMovementPreviewMode(false);
            setPreviewCells(new Set());
          }
        } else {
          // Handle elevator interaction for multi-cell units if needed
          const targetCell = getCellAt(x, y, selectedUnit.z);
          if (
            targetCell &&
            targetCell.terrainType === "elevator" &&
            selectedUnit.x === x &&
            selectedUnit.y === y
          ) {
            console.log(
              "Multi-cell unit elevator interaction not implemented yet"
            );
          }

          // Deselect unit for invalid moves
          setSelectedUnit(null);
          setHighlightedCells([]);
          setMovementPreviewMode(false);
          setPreviewCells(new Set());
        }
      } else {
        // ENHANCED REGULAR UNIT MOVEMENT with vehicle boarding context awareness
        // This is where our new contextual movement system really shines

        // Use priority-based detection to get the most relevant unit for interaction
        const clickedUnit = getUnitAt(x, y, currentViewHeight, true);
        const validMove = highlightedCells.some(
          (move) => move.x === x && move.y === y
        );

        if (validMove) {
          // The move is valid according to our enhanced movement calculation
          // This could be movement to empty space, within a vehicle, or to/from vehicles
          console.log(
            `${selectedUnit.name} attempting enhanced movement to (${x}, ${y})`
          );
          moveUnitWithBoardingLogic(selectedUnit, x, y, selectedUnit.z);
        } else {
          // Handle special cases like elevator interactions
          const targetCell = getCellAt(x, y, selectedUnit.z);
          if (
            targetCell &&
            targetCell.terrainType === "elevator" &&
            selectedUnit.x === x &&
            selectedUnit.y === y
          ) {
            // Elevator interaction logic for regular units
            const availableHeights = [];
            for (let z = 1; z <= maxHeight; z++) {
              if (z !== selectedUnit.z && canMoveToHeight(selectedUnit, z)) {
                availableHeights.push(z);
              }
            }

            if (availableHeights.length > 0) {
              // For simplicity, go to the next available height
              const targetZ = availableHeights[0];
              setElevatorSelection({ unit: selectedUnit, targetZ });
              setShowElevatorConfirm(true);
            }
          }

          // Deselect unit for any invalid or special-case moves
          setSelectedUnit(null);
          setHighlightedCells([]);
          setMovementPreviewMode(false);
          setPreviewCells(new Set());
        }
      }
    } else {
      // UNIT SELECTION LOGIC: Handle selecting units when none are currently selected

      // Try to find a unit at the clicked position, prioritizing regular units for interaction
      const clickedUnit = getUnitAt(x, y, currentViewHeight, true);

      if (clickedUnit && clickedUnit.team === playerTeam) {
        // Player clicked on one of their own units
        const isPlayerTurn = clickedUnit.team === gameState.turn;
        const canCounter = clickedUnit.canCounter === true;

        // Allow selection if it's the player's turn OR the unit can counter
        if (isPlayerTurn || canCounter) {
          setSelectedUnit(clickedUnit);
          // Switch to unit's height when selected for better visibility
          setCurrentViewHeight(clickedUnit.z);

          // Clear any existing movement preview when selecting a new unit
          setMovementPreviewMode(false);
          setPreviewCells(new Set());

          // Provide visual feedback for different unit types
          if (clickedUnit.isVehicle) {
            console.log(`Selected vehicle: ${clickedUnit.name}`);
          } else if (clickedUnit.isBiggerThanOneCell) {
            console.log(`Selected large unit: ${clickedUnit.name}`);
          } else {
            console.log(`Selected regular unit: ${clickedUnit.name}`);
          }
        }
      } else {
        // No valid unit found at click position, or unit doesn't belong to player

        // Try to find a vehicle at this position using specialized vehicle detection
        const clickedVehicle = VehicleUtils.findVehicleAtPosition(
          gameState,
          x,
          y,
          currentViewHeight
        );

        if (clickedVehicle && clickedVehicle.team === playerTeam) {
          // Player clicked on one of their vehicles
          const isPlayerTurn = clickedVehicle.team === gameState.turn;
          const canCounter = clickedVehicle.canCounter === true;

          if (isPlayerTurn || canCounter) {
            setSelectedUnit(clickedVehicle);
            setCurrentViewHeight(clickedVehicle.z);
            console.log(`Selected vehicle: ${clickedVehicle.name}`);

            // Clear movement preview states when selecting new vehicle
            setMovementPreviewMode(false);
            setPreviewCells(new Set());
          }
        } else {
          // No valid unit or vehicle found - handle deselection
          // This occurs when clicking on empty space or enemy units
          if (selectedUnit) {
            console.log(
              "Deselecting unit - clicked on empty space or invalid target"
            );
            setSelectedUnit(null);
            setHighlightedCells([]);
            setMovementPreviewMode(false);
            setPreviewCells(new Set());
          }
        }
      }
    }
  };

  const moveUnitWithBoardingLogic = (unit, newX, newY, newZ) => {
    if (!unit || unit.movementLeft <= 0) return;

    const distance = calculateDistance(unit.x, unit.y, newX, newY);
    if (distance > unit.movementLeft) return;

    // Check if there's a vehicle at the target position
    const vehicleAtTarget = gameState.units.find(
      (vehicle) =>
        vehicle.isVehicle &&
        VehicleUtils.isPositionInVehicle(vehicle, newX, newY, newZ)
    );

    if (unit.aboardVehicle && !vehicleAtTarget) {
      // CASE 1: Unit is moving from vehicle to ground - requires disembarking
      console.log(
        `${unit.name} disembarking from vehicle to move to ground at (${newX}, ${newY})`
      );

      const currentVehicle = gameState.units.find(
        (v) => v.id === unit.aboardVehicle
      );
      if (currentVehicle) {
        // Send disembark message first, then move
        sendJsonMessage({
          type: "GAME_ACTION",
          action: "DISEMBARK_VEHICLE",
          vehicleId: currentVehicle.id,
          unitId: unit.id,
          targetX: newX,
          targetY: newY,
          targetZ: newZ,
        });

        // Movement will be handled by the disembark action
      }
    } else if (
      !unit.aboardVehicle &&
      vehicleAtTarget &&
      vehicleAtTarget.team === unit.team
    ) {
      // CASE 2: Unit is moving from ground to allied vehicle - requires boarding with precise positioning
      console.log(
        `${unit.name} boarding vehicle while moving to specific position (${newX}, ${newY})`
      );

      // Calculate the EXACT relative position based on where the user clicked
      const intendedRelativePosition = VehicleUtils.worldToRelative(
        vehicleAtTarget,
        newX,
        newY
      );

      if (!intendedRelativePosition) {
        console.error(
          `Cannot calculate relative position for (${newX}, ${newY}) in vehicle at (${vehicleAtTarget.x}, ${vehicleAtTarget.y})`
        );
        return;
      }

      // Check if the intended position is already occupied by another passenger
      const isPositionOccupied = vehicleAtTarget.containedUnits?.some(
        (passengerId) => {
          const passenger = gameState.units.find((u) => u.id === passengerId);
          return (
            passenger?.vehicleRelativePosition?.x ===
              intendedRelativePosition.x &&
            passenger?.vehicleRelativePosition?.y === intendedRelativePosition.y
          );
        }
      );

      if (isPositionOccupied) {
        console.log(
          `Intended boarding position (${intendedRelativePosition.x}, ${intendedRelativePosition.y}) is occupied, trying auto-placement`
        );
        // Fall back to automatic placement if the desired spot is taken
        const result = VehicleUtils.boardUnitAuto(
          vehicleAtTarget,
          unit,
          gameState
        );
        if (result) {
          // Move to the world position corresponding to the auto-assigned relative position
          const autoWorldPos = VehicleUtils.relativeToWorld(
            vehicleAtTarget,
            result.updatedUnit.vehicleRelativePosition.x,
            result.updatedUnit.vehicleRelativePosition.y
          );

          sendJsonMessage({
            type: "GAME_ACTION",
            action: "MOVE_UNIT",
            unitId: unit.id,
            newX: autoWorldPos.x,
            newY: autoWorldPos.y,
            newZ: autoWorldPos.z,
            newMovementLeft: unit.movementLeft - distance,
          });

          setTimeout(() => {
            sendJsonMessage({
              type: "GAME_ACTION",
              action: "BOARD_VEHICLE",
              vehicleId: vehicleAtTarget.id,
              unitId: unit.id,
              relativeX: result.updatedUnit.vehicleRelativePosition.x,
              relativeY: result.updatedUnit.vehicleRelativePosition.y,
            });
          }, 100);
        }
      } else {
        // The intended position is free, so we can board there exactly
        console.log(
          `Boarding at intended position: relative (${intendedRelativePosition.x}, ${intendedRelativePosition.y}), world (${newX}, ${newY})`
        );

        // Move to the exact clicked position first
        sendJsonMessage({
          type: "GAME_ACTION",
          action: "MOVE_UNIT",
          unitId: unit.id,
          newX: newX,
          newY: newY,
          newZ: newZ,
          newMovementLeft: unit.movementLeft - distance,
        });

        // Then board at the specific relative position
        setTimeout(() => {
          sendJsonMessage({
            type: "GAME_ACTION",
            action: "BOARD_VEHICLE",
            vehicleId: vehicleAtTarget.id,
            unitId: unit.id,
            relativeX: intendedRelativePosition.x,
            relativeY: intendedRelativePosition.y,
          });
        }, 100);
      }
    } else if (
      unit.aboardVehicle &&
      vehicleAtTarget &&
      vehicleAtTarget.id === unit.aboardVehicle
    ) {
      // CASE 3: Unit is moving within the same vehicle - update relative position
      console.log(
        `${unit.name} moving within vehicle from relative position to new position (${newX}, ${newY})`
      );

      // Calculate the new relative position within the vehicle
      const newRelativePosition = VehicleUtils.worldToRelative(
        vehicleAtTarget,
        newX,
        newY
      );

      if (!newRelativePosition) {
        console.error(
          `Cannot calculate new relative position for intra-vehicle movement`
        );
        return;
      }

      // Check if the new position within the vehicle is occupied
      const isNewPositionOccupied = vehicleAtTarget.containedUnits?.some(
        (passengerId) => {
          const passenger = gameState.units.find((u) => u.id === passengerId);
          return (
            passenger?.id !== unit.id && // Don't count the moving unit itself
            passenger?.vehicleRelativePosition?.x === newRelativePosition.x &&
            passenger?.vehicleRelativePosition?.y === newRelativePosition.y
          );
        }
      );

      if (isNewPositionOccupied) {
        console.log(
          `Cannot move within vehicle: position (${newRelativePosition.x}, ${newRelativePosition.y}) is occupied`
        );
        return;
      }

      // Perform the intra-vehicle movement by updating both world and relative positions
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "MOVE_UNIT",
        unitId: unit.id,
        newX: newX,
        newY: newY,
        newZ: newZ,
        newMovementLeft: unit.movementLeft - distance,
      });

      // Also send a specific message to update the relative position within the vehicle
      // This ensures the server updates the passenger's relative position data
      setTimeout(() => {
        sendJsonMessage({
          type: "GAME_ACTION",
          action: "UPDATE_VEHICLE_PASSENGER_POSITION",
          vehicleId: vehicleAtTarget.id,
          unitId: unit.id,
          newRelativeX: newRelativePosition.x,
          newRelativeY: newRelativePosition.y,
        });
      }, 100);
    } else {
      // CASE 4: Standard movement (not involving vehicles)
      console.log(
        `${unit.name} performing standard movement to (${newX}, ${newY})`
      );
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "MOVE_UNIT",
        unitId: unit.id,
        newX: newX,
        newY: newY,
        newZ: newZ,
        newMovementLeft: unit.movementLeft - distance,
      });
    }

    // Clean up selection states after any movement
    setSelectedUnit(null);
    setHighlightedCells([]);
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

    // NEW: For movement preview of big units/vehicles
    else if (
      movementPreviewMode &&
      selectedUnit &&
      (selectedUnit.isBiggerThanOneCell || selectedUnit.isVehicle)
    ) {
      // Check if this is a valid move position
      const isValidMovePosition = highlightedCells.some(
        (move) => move.x === x && move.y === y
      );

      if (isValidMovePosition) {
        const previewCells = getMovementPreviewCells(selectedUnit, x, y);
        setPreviewCells(previewCells);
      } else {
        setPreviewCells(new Set());
      }
    }
    // For regular units, clear preview
    else if (
      movementPreviewMode &&
      selectedUnit &&
      !selectedUnit.isBiggerThanOneCell &&
      !selectedUnit.isVehicle
    ) {
      setPreviewCells(new Set());
    }
  };

  const UnitStatsTooltip = ({ unit }) => (
    <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white p-2 rounded shadow-lg z-10">
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

      {/* Height and floor information - inline the function call */}
      <div className="text-xs border-t border-gray-400 pt-1 mt-1">
        <div>Height: {unit.z}</div>
        {(() => {
          const result = getEffectiveCell(unit.x, unit.y, currentViewHeight);
          return result.actualHeight && result.actualHeight !== unit.z ? (
            <div className="text-yellow-300">
              Standing on Height {result.actualHeight} floor
            </div>
          ) : null;
        })()}
      </div>

      {/* Show active trigger effects */}
      {unit.triggerEffects && unit.triggerEffects.length > 0 && (
        <div className="text-xs border-t border-gray-400 pt-1">
          <div className="text-purple-300 font-semibold">Active Triggers:</div>
          {unit.triggerEffects.slice(0, 2).map((trigger, index) => (
            <div key={index} className="text-purple-200 truncate">
              • {trigger.name}
            </div>
          ))}
          {unit.triggerEffects.length > 2 && (
            <div className="text-purple-200">
              +{unit.triggerEffects.length - 2} more...
            </div>
          )}
        </div>
      )}

      {unit.effects && unit.effects.some((e) => e.type === "SpecialBuff") && (
        <div className="text-xs border-t border-gray-400 pt-1">
          <div className="text-yellow-300 font-semibold">Special Effects:</div>
          {unit.effects
            .filter((e) => e.type === "SpecialBuff")
            .slice(0, 2)
            .map((effect, index) => (
              <div key={index} className="text-yellow-200 truncate">
                • {effect.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );

  // NEW: Get terrain color for cell visualization
  const getTerrainColor = (terrainType) => {
    switch (terrainType) {
      case "fire":
        return "bg-red-200";
      case "ice":
        return "bg-blue-200";
      case "healing":
        return "bg-green-200";
      case "elevator":
        return "bg-yellow-200";
      default:
        return "bg-green-100";
    }
  };

  const renderCell = (x, y) => {
    const currentZ = currentViewHeight;

    // Get the effective cell (looks down through heights to find floor)
    const { cell: effectiveCell, actualHeight: effectiveHeight } =
      getEffectiveCell(x, y, currentZ);

    // Get all units at this position for proper layered rendering
    const allUnitsAtPosition = getAllUnitsAt(x, y, currentZ);
    const hasMultipleUnits = allUnitsAtPosition.length > 1;

    // Separate different types of units for layered rendering
    const vehiclesAtPosition = allUnitsAtPosition.filter((u) => u.isVehicle);
    const multiCellNonVehiclesAtPosition = allUnitsAtPosition.filter(
      (u) => u.isBiggerThanOneCell && !u.isVehicle
    );
    const regularUnitsAtPosition = allUnitsAtPosition.filter(
      (u) => !u.isBiggerThanOneCell && !u.isVehicle
    );

    // For interaction purposes, prioritize regular units over multi-cell units
    const primaryUnit = getUnitAt(x, y, currentZ, true);

    // Check if any unit at this position is selected
    const isSelected =
      selectedUnit && allUnitsAtPosition.some((u) => u.id === selectedUnit.id);
    const isValidMove = highlightedCells.some(
      (move) => move.x === x && move.y === y
    );
    const isInPreview = previewCells.has(`${x},${y}`);

    // Check visibility - use effective height if no floor at current height
    const checkHeight = effectiveHeight || currentZ;
    const isVisible = isCellVisible(x, y, checkHeight);

    // Initialize background color based on terrain and visibility
    let bgColor = "bg-gray-800"; // Default for no floor anywhere
    let floorIndicator = null;

    // Determine base terrain colors and floor indicators
    if (isVisible && effectiveCell) {
      // Get team color for base territories
      const teamColor = effectiveCell.teamColor || null;

      // Use the terrain color for the effective height with team color support
      bgColor = getTerrainColorForHeight(
        effectiveCell.terrainType,
        effectiveHeight,
        teamColor
      );

      // Add height indicator if we're showing a floor from a different height
      if (effectiveHeight !== currentZ) {
        floorIndicator = effectiveHeight;
      }
    } else if (!isVisible) {
      // Fog of war
      bgColor = "bg-gray-900";
    }

    // Apply overlay colors for various game states
    // IMPORTANT: These background colors will be on the base layer (z-index 0)
    if (!isVisible) {
      if (isInPreview) {
        bgColor =
          "bg-gray-900 after:absolute after:inset-0 after:bg-red-500 after:opacity-30";
      } else {
        bgColor = "bg-gray-900";
      }
    }
    if (isVisible && isInPreview) {
      // Different preview colors based on targeting mode
      if (skillTargetingMode) {
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
        // Noble Phantasm targeting colors with special effects
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
      // Movement preview colors for big units/vehicles
      else if (
        movementPreviewMode &&
        (selectedUnit?.isBiggerThanOneCell || selectedUnit?.isVehicle)
      ) {
        bgColor = "bg-cyan-300 bg-opacity-70"; // Cyan for movement preview
      }
    } else if (isSelected) {
      bgColor = "bg-blue-300";
    } else if (
      isValidMove &&
      !selectedUnit?.isBiggerThanOneCell &&
      !selectedUnit?.isVehicle
    ) {
      // Only show individual move cells for regular units
      bgColor = "bg-blue-100";
    }

    // Handle hover effects
    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
    if (isHovered && primaryUnit && primaryUnit.team === playerTeam) {
      bgColor = "bg-yellow-200";
    }

    // Function to determine if non-visible cells can be targeted
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

    // Additional styling classes for special effects
    let additionalClasses = "";
    // Add special effects for NP targeting
    if (npTargetingMode && isInPreview) {
      additionalClasses = "ring-2 ring-amber-400 ring-opacity-50";
    }

    // Add elevation indicator for elevators
    if (effectiveCell?.terrainType === "elevator") {
      additionalClasses += " ring-2 ring-yellow-500";
    }

    // Add subtle border to indicate when showing lower floor
    if (floorIndicator && floorIndicator !== currentZ) {
      additionalClasses += " ring-1 ring-gray-400 ring-opacity-50";
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
        onMouseEnter={() => handleCellHover(x, y)}
        onMouseLeave={() => setHoveredCell(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (primaryUnit && isVisible) {
            handleContextMenu(e, primaryUnit);
          } else {
            // Close menu when right-clicking empty cell
            setContextMenu(null);
            setActiveUnit(null);
          }
        }}
      >
        {/* BACKGROUND LAYER: Floor indicators and terrain effects (z-index 1-2) */}
        {/* These elements appear above the base background but below all units */}

        {/* Floor height indicator - shows in corner if displaying lower floor */}
        {floorIndicator && floorIndicator !== currentZ && (
          <div className="absolute top-0 left-0 w-3 h-3 bg-gray-600 text-white text-xs rounded-br flex items-center justify-center z-[1]">
            {floorIndicator}
          </div>
        )}

        {/* Terrain effect indicators - show from effective cell */}
        {isVisible && effectiveCell?.terrainType === "elevator" && (
          <div className="absolute top-0 right-0 w-3 h-3 z-[1]">
            <div className="flex flex-col">
              <ArrowUp size={8} className="text-yellow-600" />
              <ArrowDown size={8} className="text-yellow-600" />
            </div>
          </div>
        )}

        {isVisible && effectiveCell?.terrainType === "fire" && (
          <div className="absolute top-0 left-0 text-red-600 text-xs ml-3 z-[1]">
            🔥
          </div>
        )}

        {isVisible && effectiveCell?.terrainType === "ice" && (
          <div className="absolute top-0 left-0 text-blue-600 text-xs ml-3 z-[1]">
            ❄️
          </div>
        )}

        {isVisible && effectiveCell?.terrainType === "healing" && (
          <div className="absolute top-0 left-0 text-green-600 text-xs ml-3 z-[1]">
            💚
          </div>
        )}

        {/* UNIT STRUCTURE LAYER: Vehicle and multi-cell unit outlines (z-index 10-15) */}
        {/* This layer sits ABOVE the background colors but below the main sprites */}

        {/* Vehicle outline cells - these now render ABOVE the blue movement squares */}
        {vehiclesAtPosition.length > 0 &&
          isVisible &&
          vehiclesAtPosition.map((vehicle, index) => {
            const isVehicleOrigin = vehicle.x === x && vehicle.y === y;

            if (!isVehicleOrigin) {
              // CRITICAL FIX: Non-origin vehicle cells now use z-[10] to appear above background
              return (
                <div
                  key={`vehicle-outline-${vehicle.id}`}
                  className="absolute inset-0 border-2 border-blue-400 border-dashed bg-blue-100 bg-opacity-20 flex items-center justify-center z-[10]"
                >
                  <div className="text-blue-600 text-xs font-bold opacity-60">
                    {vehicle.name}
                  </div>
                </div>
              );
            }

            // Origin vehicle cells render their main sprite at a higher z-index
            return (
              <div
                key={`vehicle-${vehicle.id}`}
                className="absolute inset-0 pointer-events-none z-[15]"
                style={{
                  // The sprite spans across multiple cells by setting appropriate dimensions
                  width: `${vehicle.dimensions.width * 64}px`,
                  height: `${vehicle.dimensions.height * 64}px`,
                }}
              >
                {/* Main vehicle sprite - this single image spans multiple grid cells */}
                <img
                  src={vehicle.sprite}
                  alt={vehicle.name}
                  className={`w-full h-full object-contain ${
                    npTargetingMode && isInPreview
                      ? "filter brightness-110"
                      : ""
                  } ${vehicle.canCounter ? "ring-2 ring-orange-400" : ""}`}
                  style={{ imageRendering: "pixelated" }}
                />

                {/* Vehicle UI elements positioned on the spanning sprite */}
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded">
                  {vehicle.dimensions.width}×{vehicle.dimensions.height}
                </div>

                {vehicle.isVehicle &&
                  vehicle.containedUnits &&
                  vehicle.containedUnits.length > 0 && (
                    <div className="absolute bottom-0 left-0 bg-green-500 text-white text-xs px-1 rounded">
                      👥{vehicle.containedUnits.length}/
                      {vehicle.maxPassengers || 10}
                    </div>
                  )}

                {/* Passenger position indicators within the vehicle */}
                {vehicle.isVehicle &&
                  vehicle.containedUnits &&
                  vehicle.containedUnits.map((passengerId) => {
                    const passenger = gameState.units.find(
                      (u) => u.id === passengerId
                    );
                    if (!passenger || !passenger.vehicleRelativePosition)
                      return null;

                    return (
                      <div
                        key={`passenger-indicator-${passengerId}`}
                        className="absolute w-4 h-4 bg-yellow-400 border border-yellow-600 rounded-full flex items-center justify-center text-xs"
                        style={{
                          left: `${
                            passenger.vehicleRelativePosition.x *
                              (64 / vehicle.dimensions.width) +
                            2
                          }px`,
                          top: `${
                            passenger.vehicleRelativePosition.y *
                              (64 / vehicle.dimensions.height) +
                            2
                          }px`,
                          fontSize: "8px",
                        }}
                        title={`${passenger.name} at (${passenger.vehicleRelativePosition.x}, ${passenger.vehicleRelativePosition.y})`}
                      >
                        {passenger.name?.charAt(0) || "U"}
                      </div>
                    );
                  })}

                {vehicle.canCounter && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <Target size={10} className="text-white" />
                  </div>
                )}

                <div
                  className={`absolute -bottom-1 -left-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center ${
                    getHeightBaseColor(vehicle.z) === "green"
                      ? "bg-green-700"
                      : getHeightBaseColor(vehicle.z) === "blue"
                      ? "bg-blue-700"
                      : "bg-purple-700"
                  }`}
                >
                  {vehicle.z}
                </div>

                {hoveredUnit?.id === vehicle.id && (
                  <UnitStatsTooltip unit={vehicle} />
                )}
              </div>
            );
          })}

        {/* Multi-cell non-vehicle unit outlines - also elevated above background */}
        {multiCellNonVehiclesAtPosition.length > 0 &&
          isVisible &&
          multiCellNonVehiclesAtPosition.map((unit, index) => {
            const isUnitOrigin = unit.x === x && unit.y === y;

            if (!isUnitOrigin) {
              // CRITICAL FIX: Non-origin multi-cell unit cells use z-[12] to appear above background
              return (
                <div
                  key={`multicell-outline-${unit.id}`}
                  className="absolute inset-0 border-2 border-green-400 border-dashed bg-green-100 bg-opacity-20 flex items-center justify-center z-[12]"
                >
                  <div className="text-green-600 text-xs font-bold opacity-60">
                    {unit.name}
                  </div>
                </div>
              );
            }

            // Origin cell renders the full multi-cell unit sprite
            return (
              <div
                key={`multicell-${unit.id}`}
                className="absolute inset-0 pointer-events-none z-[17]"
                style={{
                  // Multi-cell units also span across their dimensions
                  width: `${unit.dimensions.width * 64}px`,
                  height: `${unit.dimensions.height * 64}px`,
                }}
                onMouseEnter={() => setHoveredUnit(unit)}
                onMouseLeave={() => setHoveredUnit(null)}
              >
                <img
                  src={unit.sprite}
                  alt={unit.name}
                  className={`w-full h-full object-contain ${
                    npTargetingMode && isInPreview
                      ? "filter brightness-110"
                      : ""
                  } ${unit.canCounter ? "ring-2 ring-orange-400" : ""} ${
                    hasMultipleUnits ? "drop-shadow-lg" : ""
                  }`}
                  style={{ imageRendering: "pixelated" }}
                />

                {/* Multi-cell unit size indicator */}
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded">
                  {unit.dimensions.width}×{unit.dimensions.height}
                </div>

                {unit.canCounter && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <Target size={10} className="text-white" />
                  </div>
                )}

                <div
                  className={`absolute -bottom-1 -left-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center ${
                    getHeightBaseColor(unit.z) === "green"
                      ? "bg-green-700"
                      : getHeightBaseColor(unit.z) === "blue"
                      ? "bg-blue-700"
                      : "bg-purple-700"
                  }`}
                >
                  {unit.z}
                </div>

                {/* Stacking indicator for multi-cell units */}
                {hasMultipleUnits && (
                  <div className="absolute top-0 left-0 w-3 h-3 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                    {allUnitsAtPosition.length}
                  </div>
                )}

                {hoveredUnit?.id === unit.id && (
                  <UnitStatsTooltip unit={unit} />
                )}
              </div>
            );
          })}

        {/* REGULAR UNITS LAYER: Single-cell units (z-index 20) */}
        {/* These render on top of everything else except special effects */}
        {regularUnitsAtPosition.length > 0 &&
          isVisible &&
          regularUnitsAtPosition.map((unit, index) => (
            <div
              key={`regular-${unit.id}`}
              className={`absolute inset-0 flex items-center justify-center z-[20] ${
                hasMultipleUnits ? "transform scale-90" : "" // Scale down when stacked
              } ${
                unit.team === playerTeam ? "text-blue-600" : "text-red-600"
              } ${unit.movementLeft === 0 ? "opacity-50" : ""}`}
              onMouseEnter={() => setHoveredUnit(unit)}
              onMouseLeave={() => setHoveredUnit(null)}
            >
              <img
                src={unit.sprite}
                alt={unit.name}
                className={`w-16 h-16 object-contain ${
                  npTargetingMode && isInPreview ? "filter brightness-110" : ""
                } ${unit.canCounter ? "ring-2 ring-orange-400" : ""} ${
                  hasMultipleUnits ? "drop-shadow-lg" : ""
                }`}
              />

              {unit.canCounter && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <Target size={10} className="text-white" />
                </div>
              )}

              {unit.aboardVehicle && (
                <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="text-white text-xs">🚢</div>
                </div>
              )}

              <div
                className={`absolute -bottom-1 -left-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center ${
                  getHeightBaseColor(unit.z) === "green"
                    ? "bg-green-700"
                    : getHeightBaseColor(unit.z) === "blue"
                    ? "bg-blue-700"
                    : "bg-purple-700"
                }`}
              >
                {unit.z}
              </div>

              {hasMultipleUnits && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                  {allUnitsAtPosition.length}
                </div>
              )}

              {hoveredUnit?.id === unit.id && <UnitStatsTooltip unit={unit} />}
            </div>
          ))}

        {/* LOWER HEIGHT UNITS LAYER: Units from lower heights (z-index 5) */}
        {/* These appear below everything but above terrain */}
        {allUnitsAtPosition.length === 0 &&
          isVisible &&
          (() => {
            for (let checkZ = currentZ - 1; checkZ >= 1; checkZ--) {
              const lowerUnit = getUnitAt(x, y, checkZ);
              if (lowerUnit && isCellVisible(x, y, checkZ)) {
                return (
                  <div
                    key={`lower-${lowerUnit.id}`}
                    className="absolute inset-0 flex items-center justify-center opacity-40 z-[5]"
                    onMouseEnter={() => setHoveredUnit(lowerUnit)}
                    onMouseLeave={() => setHoveredUnit(null)}
                  >
                    <img
                      src={lowerUnit.sprite}
                      alt={lowerUnit.name}
                      className="w-14 h-14 object-contain filter brightness-75"
                    />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center">
                      {lowerUnit.z}
                    </div>
                  </div>
                );
              }
            }
            return null;
          })()}

        {/* TOP EFFECTS LAYER: Special effects layer (z-index 30) */}
        {/* Noble Phantasm targeting effects that appear above everything else */}
        {npTargetingMode && isInPreview && (
          <div className="absolute inset-0 bg-amber-500 opacity-20 animate-pulse z-[30]" />
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

  const SaveLoadMenu = () => {
    if (!showSaveLoadMenu) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Save / Load Game</h3>
            <button
              className="p-2 hover:bg-gray-100 rounded"
              onClick={() => setShowSaveLoadMenu(false)}
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-b pb-4">
              <h4 className="text-lg font-semibold mb-2">Manual Save/Load</h4>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveGame}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                >
                  <Save size={16} /> Save Game
                </button>
                <label className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer flex items-center gap-2">
                  <FolderOpen size={16} /> Load Game
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleLoadGame}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">Autosave System</h4>
              <p className="text-sm text-gray-600 mb-3">
                The game automatically saves before and after every action. View
                and restore from up to 100 recent autosaves.
              </p>
              <button
                onClick={handleGetAutosaves}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2"
              >
                🔄 View Autosaves ({autosaves.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AutosaveMenu = () => {
    if (!showAutosaveMenu) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[800px] max-h-[600px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">
              Autosaves ({autosaves.length}/100)
            </h3>
            <button
              className="p-2 hover:bg-gray-100 rounded"
              onClick={() => setShowAutosaveMenu(false)}
            >
              ✕
            </button>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            <p>
              Shows game states saved before (⏮️) and after (⏭️) each action.
            </p>
            <p>Click "Load" to restore the game to that exact state.</p>
          </div>

          <div className="overflow-y-auto max-h-[400px]">
            {autosaves.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No autosaves available
              </p>
            ) : (
              <div className="space-y-2">
                {[...autosaves].reverse().map((autosave, reverseIndex) => {
                  const actualIndex = autosaves.length - 1 - reverseIndex;
                  return (
                    <div
                      key={actualIndex}
                      className="border rounded p-3 hover:bg-gray-50 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {autosave.stage === "before" ? "⏮️" : "⏭️"}{" "}
                          {autosave.messageType}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatTimestamp(autosave.timestamp)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Turn {autosave.turn} • Round {autosave.round}
                        </div>
                      </div>
                      <button
                        onClick={() => handleLoadAutosave(actualIndex)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        Load
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t flex gap-2">
            <button
              onClick={handleGetAutosaves}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowAutosaveMenu(false)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SaveLoadNotification = () => {
    if (!saveLoadMessage) return null;

    return (
      <div
        className={`fixed top-4 left-4 p-4 rounded shadow-lg z-50 ${
          saveLoadMessage.type === "success"
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        }`}
      >
        {saveLoadMessage.text}
      </div>
    );
  };

  const getCurrentPlayer = () => {
    const currentPlayerId = Object.keys(gameState.players || {}).find(
      (id) => gameState.players[id].username === username
    );
    return currentPlayerId ? gameState.players[currentPlayerId] : null;
  };

  // Get list of colors that are currently available for selection
  const getAvailableColors = () => {
    const allColors = [
      "white",
      "black",
      "red",
      "blue",
      "green",
      "yellow",
      "purple",
      "orange",
    ];
    const currentPlayer = getCurrentPlayer();
    const usedColors = Object.values(gameState.players || {})
      .filter((player) => player.id !== currentPlayer?.id) // Exclude current player's color
      .map((player) => player.teamColor)
      .filter(Boolean); // Remove any null/undefined colors

    return allColors.filter((color) => !usedColors.includes(color));
  };

  // Handle color change selection
  const handleColorChange = (newColor) => {
    const currentPlayer = getCurrentPlayer();

    if (!currentPlayer) {
      setBaseManagementMessage({
        type: "error",
        text: "Unable to identify current player",
      });
      return;
    }

    if (currentPlayer.teamColor === newColor) {
      setBaseManagementMessage({
        type: "error",
        text: "You already have this color selected",
      });
      return;
    }

    // Send color change request to server
    sendJsonMessage({
      type: "GAME_ACTION",
      action: "CHANGE_PLAYER_COLOR",
      newColor: newColor,
    });
  };

  const BaseManagementWindow = ({ onClose }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 300, y: 200 });
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Handle mouse down for dragging
    const handleMouseDown = (e) => {
      if (e.target.closest(".window-content")) return; // Don't drag if clicking on content
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    };

    // Handle mouse move for dragging
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    // Handle mouse up to stop dragging
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Add event listeners for dragging
    useEffect(() => {
      if (isDragging) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
      }
    }, [isDragging, dragOffset]);

    const handleAssignPlayerBases = () => {
      // Check if we're in Apocrypha mode
      if (gameState.playMode !== "Apocrypha") {
        setBaseManagementMessage({
          type: "error",
          text: "The only mode with Base Logic right now is Apocrypha, please change game modes",
        });
        return;
      }

      // Send message to server to assign bases
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "ASSIGN_PLAYER_BASES",
      });
    };

    return (
      <div
        className="fixed bg-white shadow-2xl rounded-lg border-2 border-gray-300 z-50 select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          minWidth: "400px",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Window Header */}
        <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
          <h3 className="text-lg font-bold">Base Management</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Window Content */}
        <div className="window-content p-6 space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            <p>Manage territorial bases for the current game mode.</p>
            <p className="font-semibold text-blue-600">
              Current Mode: {gameState.playMode || "Standard"}
            </p>
          </div>

          {/* Base Assignment Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-3">Base Assignment</h4>
            <p className="text-sm text-gray-600 mb-3">
              Assign territorial bases to players. In Apocrypha mode, players
              get North or South base territories.
            </p>

            <button
              onClick={handleAssignPlayerBases}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
            >
              🏰 Assign Player Bases
            </button>
          </div>

          {/* Color Management Section */}
          <div className="border rounded-lg p-4 bg-indigo-50">
            <h4 className="font-semibold mb-3">Team Color Selection</h4>
            <p className="text-sm text-gray-600 mb-3">
              Choose your team color. This affects your base territory
              appearance and unit identification.
            </p>

            {/* Current Color Display */}
            {(() => {
              const currentPlayer = getCurrentPlayer();
              return currentPlayer?.teamColor ? (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm font-medium">Current Color:</span>
                  <div
                    className="w-6 h-6 rounded border-2 border-gray-300"
                    style={{ backgroundColor: currentPlayer.teamColor }}
                  />
                  <span className="text-sm capitalize text-gray-700">
                    {currentPlayer.teamColor}
                  </span>
                </div>
              ) : (
                <div className="mb-4 text-sm text-gray-500">
                  No color assigned yet
                </div>
              );
            })()}

            {/* Color Palette Selection */}
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700 block mb-2">
                Available Colors:
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  "white",
                  "black",
                  "red",
                  "blue",
                  "green",
                  "yellow",
                  "purple",
                  "orange",
                ].map((color) => {
                  const isAvailable = getAvailableColors().includes(color);
                  const isCurrent = getCurrentPlayer()?.teamColor === color;
                  const isUsed = !isAvailable && !isCurrent;

                  return (
                    <button
                      key={color}
                      onClick={() =>
                        isAvailable ? handleColorChange(color) : null
                      }
                      disabled={!isAvailable}
                      className={`
                        relative w-12 h-12 rounded border-2 transition-all duration-200
                        ${
                          isAvailable
                            ? "border-gray-400 hover:border-gray-600 hover:scale-105 cursor-pointer shadow-md hover:shadow-lg"
                            : "border-gray-200 cursor-not-allowed opacity-50"
                        }
                        ${
                          isCurrent
                            ? "ring-4 ring-blue-500 ring-opacity-50"
                            : ""
                        }
                      `}
                      style={{
                        backgroundColor: color,
                        // Add special handling for white color visibility
                        ...(color === "white"
                          ? { border: "2px solid #e5e5e5" }
                          : {}),
                      }}
                      title={
                        isCurrent
                          ? `Your current color: ${color}`
                          : isUsed
                          ? `${color} is taken by another player`
                          : `Select ${color} as your team color`
                      }
                    >
                      {/* Visual indicators for different states */}
                      {isCurrent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            ✓
                          </span>
                        </div>
                      )}
                      {isUsed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-red-500 font-bold text-lg">
                            ✗
                          </span>
                        </div>
                      )}

                      {/* Color name tooltip on hover */}
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {color}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Colors marked with ✓ are your current selection. Colors marked
              with ✗ are taken by other players.
            </p>
          </div>

          {/* Current Base Status */}
          {gameState.playMode === "Apocrypha" && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-semibold mb-3">Current Base Status</h4>
              <div className="space-y-2">
                {Object.entries(gameState.players || {}).map(
                  ([playerId, player]) => (
                    <div
                      key={playerId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="font-medium">{player.username}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          player.base
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {player.base ? `${player.base.type} Base` : "No Base"}
                      </span>
                      {player.teamColor && (
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: player.teamColor }}
                          title={`Team Color: ${player.teamColor}`}
                        />
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Message Display */}
          {baseManagementMessage && (
            <div
              className={`p-3 rounded border ${
                baseManagementMessage.type === "error"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-green-50 border-green-200 text-green-700"
              }`}
            >
              {baseManagementMessage.text}
            </div>
          )}
        </div>
      </div>
    );
  };

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
          Turn {gameState.currentTurn} | Round {gameState.currentRound} |
          Viewing Height: {currentViewHeight}
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
          {/* Add trigger effect notifications */}
          <div className="fixed top-4 right-4 space-y-2 z-50">
            {triggerNotifications.map((notification) => (
              <TriggerEffectNotification
                key={notification.id}
                notification={notification}
                onClose={() => removeTriggerNotification(notification.id)}
              />
            ))}
          </div>

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
          {/* ADD THE SAVE/LOAD BUTTON HERE */}
          <button
            onClick={() => setShowSaveLoadMenu(true)}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-2"
          >
            <Save size={16} /> Save/Load
          </button>

          <button
            onClick={() => setShowBaseManagement(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2"
          >
            🏰 Base Management
          </button>
        </div>
      </div>
      {/* NEW: Height Controls */}
      <HeightControls />

      {/* <div className="inline-block border-2 border-gray-400 relative">
        {Array.from({ length: GRID_SIZE }).map((_, y) => (
          <div key={y} className="flex">
            {Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))}
          </div>
        ))}
      </div> */}

      {/* NEW: Elevator Confirmation Dialog */}
      <ElevatorConfirmDialog />

      <div className="inline-block border-2 border-gray-400 relative">
        {Array.from({ length: GRID_SIZE }).map((_, y) => (
          <div key={y} className="flex">
            {Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))}
          </div>
        ))}
        {/* <VisionRangeOverlay /> */}
      </div>

      {contextMenu && activeUnit && (
        <ContextMenu position={contextMenu} unit={activeUnit} />
      )}
      {showSkillsMenu && activeUnit && (
        <SkillsMenu unitId={activeUnit.id} gameState={gameState} />
      )}
      {showNPMenu && activeUnit && (
        <NoblePhantasmMenu unitId={activeUnit.id} gameState={gameState} />
      )}
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
      <SaveLoadMenu />
      <AutosaveMenu />
      <SaveLoadNotification />
      {showVehicleInspector && selectedVehicle && (
        <VehicleInspector
          vehicle={selectedVehicle}
          gameState={gameState}
          onClose={() => {
            setShowVehicleInspector(false);
            setSelectedVehicle(null);
          }}
          onManagePassengers={handleVehicleManagePassengers}
        />
      )}

      {showVehiclePassengerManager && selectedVehicle && (
        <VehiclePassengerManager
          vehicle={selectedVehicle}
          gameState={gameState}
          playerTeam={playerTeam}
          onClose={() => {
            setShowVehiclePassengerManager(false);
            setSelectedVehicle(null);
          }}
          onBoardUnit={handleBoardUnit}
          onDisembarkUnit={handleDisembarkUnit}
        />
      )}
      {showBaseManagement && (
        <BaseManagementWindow
          onClose={() => {
            setShowBaseManagement(false);
            setBaseManagementMessage(null);
          }}
        />
      )}
    </div>
  );
};

export default TacticalGame;
