//TacticalGame.jsx
import React, { useState, useEffect } from 'react';
import { Sword, Shield, Heart, Move, ScrollText, Star, User } from 'lucide-react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { createMahalapraya } from '../game/skills/Mahalapraya';
import { Skill } from '../game/Skill';
import { getSkillImplementation, isSkillOnCooldown, executeSkill, getSkillAffectedCells  } from '../game/skills/registry';
import { TargetingType } from '../game/targeting/TargetingTypes';
import { TargetingLogic } from '../game/targeting/TargetingLogic';
import ServantSelector from './ServantSelector';
import { Combat } from '../game/Combat';

const TacticalGame = ({ username, roomId }) => {
    console.log('TacticalGame props:', { username, roomId });
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [hoveredUnit, setHoveredUnit] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [activeUnit, setActiveUnit] = useState(null);
    const [showSkillsMenu, setShowSkillsMenu] = useState(false);
    const [showNPMenu, setShowNPMenu] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [highlightedCells, setHighlightedCells] = useState([]);
    const [gameState, setGameState] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
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




    
    const WS_URL = `ws://127.0.0.1:8000?username=${username}`;
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(WS_URL, {
        share: false,
        onOpen: () => {
            console.log('WebSocket connected');

            // Initialize game state when connection is established
            sendJsonMessage({
                type: 'JOIN_ROOM',
                roomId,
                turnsPerRound: 3,
                initialUnits: [
                    { 
                        id: 1, 
                        x: 1, 
                        y: 1, 
                        team: 'player1', 
                        hp: 20, 
                        atk: 8, 
                        def: 5, 
                        movementRange: 5,
                        visionRange: 4,
                        movementLeft: 5,
                        hasAttacked: false,
                        name: 'Anastasia',
                        sprite: "dist/sprites/(Archer) Anastasia (Summer)_portrait.webp",
                        skills: [
                            {
                                id: "Mahalapraya",
                                onCooldownUntil: 0
                            }
                        ],
                        noblePhantasms: [
                            { id: 1, name: 'Snegleta・Snegurochka: Summer Snow', description: 'Unleashes the power of summer', cooldown: 5 }
                        ],
                        reactions: [
                            { id: 1, name: 'Instinct', description: 'May evade incoming attacks' }
                        ],
                        combatSent: {},
                        combatReceived: {}
                    },
                    // Add other initial units here

                    { 
                        id: 2, 
                        x: 3, 
                        y: 1, 
                        team: 'player2', 
                        hp: 18, 
                        atk: 6, 
                        def: 7, 
                        movementRange: 3,     // Heavy armored unit with low movement
                        movementLeft: 3,
                        hasAttacked: false,
                        name: 'Artoria',
                        sprite: "dist/sprites/(Saber) Artoria_portrait.png",
                        skills: [
                            {
                                id: "Mahalapraya",
                                onCooldownUntil: 0
                            }
                          ],
                          noblePhantasms: [
                            { id: 1, name: 'Excalibur', description: 'Unleash holy sword energy', cooldown: 5 }
                          ],
                          reactions: [
                            { id: 1, name: 'Instinct', description: 'May evade incoming attacks' }
                          ],
                          combatSent: {},
                          combatReceived: {}
                      }
                ]
            });
        },
        onError: (error) => {
            console.error('WebSocket error:', error);
            setIsConnecting(false);
        },
        onClose: () => {
            console.log('WebSocket disconnected');
            setIsConnecting(false);
        }
    });


    // Handle incoming WebSocket messages
    useEffect(() => {
        if (lastJsonMessage?.type === 'GAME_STATE_UPDATE') {
            console.log('Received game state:', lastJsonMessage.gameState);
            setGameState(lastJsonMessage.gameState);
            setIsConnecting(false);
        } else if (lastJsonMessage?.type === 'DETECTION_RESULTS') {
            setDetectionResults(lastJsonMessage.results);
            setTimeout(() => setDetectionResults(null), 3000);
        } else if (lastJsonMessage?.type === 'DETECTION_ERROR') {
            setDetectionError(lastJsonMessage.message);
            setTimeout(() => setDetectionError(null), 3000);
        }
    }, [lastJsonMessage]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Don't handle if no menus are open
            if (!contextMenu && !showProfile && !showSkillsMenu && !showNPMenu) {
                return;
            }
    
            const isContextMenuClick = event.target.closest('.context-menu');
            const isProfileMenuClick = event.target.closest('.profile-menu');
            const isSkillsMenuClick = event.target.closest('.skills-menu');
            const isNPMenuClick = event.target.closest('.np-menu');
    
            // If clicking outside all menus
            if (!isContextMenuClick && !isProfileMenuClick && !isSkillsMenuClick && !isNPMenuClick) {
                setContextMenu(null);
                setActiveUnit(null);
                setShowProfile(false);
                setShowSkillsMenu(false);
                setShowNPMenu(false);
            }
        };
    
        // Add handlers
        document.addEventListener('mousedown', handleClickOutside);
    
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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
        const currentPlayerId = Object.keys(gameState.players).find(id => 
            gameState.players[id].username === username
        );
        
        const hasUsedDetection = Array.isArray(gameState.detectionsThisTurn) && 
            gameState.detectionsThisTurn.includes(currentPlayerId);
    
        return (
            <button
                onClick={handleDetection}
                className={`px-4 py-2 rounded ${
                    hasUsedDetection 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-purple-500 hover:bg-purple-600'
                } text-white`}
                disabled={hasUsedDetection}
                title={hasUsedDetection ? "Detection already used this turn" : "Attempt to detect hidden units"}
            >
                Detect Hidden Units
                {hasUsedDetection && <span className="ml-2 text-xs">(Used)</span>}
            </button>
        );
    };

    
    // const ReceiveAttackButton = ({ unit }) => {
    //     if (!unit.combatReceived || Object.keys(unit.combatReceived).length === 0) {
    //         return null;
    //     }
    
    //     const handleReceiveAttack = () => {
    //         // Recreate combat from stored results
    //         const combat = new Combat({
    //             typeOfAttackCausingIt: unit.combatReceived.typeOfAttackCausingIt, //e.g: skill, np, basic attack
    //             proportionOfMagicUsed: unit.combatReceived.proportionOfMagicUsed,  // e.g: 30% of magic
    //             proportionOfStrengthUsed: unit.combatReceived.proportionOfStrengthUsed, //e.g: 120% of strength
    //             attacker: unit.combatReceived.attacker,
    //             defender: unit.combatReceived.defender,
    //             gameState: unit.combatReceived.gameState,
    //             integratedAttackMultiplier: unit.combatReceived.integratedAttackMultiplier, //e.g: multiplier bonus on np/skill description
    //             integratedAttackFlatBonus: unit.combatReceived.integratedAttackFlatBonus // e.g: flat bonus on np/skill description
    //         });
            
    //         combat.combatResults = unit.combatReceived.combatResults;
    //         // Recalculate with current defender state
    //         const finalResults = combat.receiveCombat();
            
    //         // Update the unit's stored combat results
    //         unit.combatReceived = finalResults;
            
    //         // Apply the damage
    //         const updatedUnit = combat.applyDamageToDefender();
            
    //         // Send update to server
    //         sendJsonMessage({
    //             type: 'GAME_ACTION',
    //             action: 'RECEIVE_ATTACK',
    //             unitId: unit.id,
    //             newHp: updatedUnit.hp,
    //             combatResults: finalResults
    //         });
    //     };
    
    //     return (
    //         <button 
    //             onClick={handleReceiveAttack}
    //             className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
    //         >
    //             Receive Attack
    //         </button>
    //     );
    // };

    const handleDetection = () => {
        sendJsonMessage({
            type: 'GAME_ACTION',
            action: 'ATTEMPT_DETECTION'
        });
    };

    const handleAddServant = (newUnit) => {
        sendJsonMessage({
            type: 'GAME_ACTION',
            action: 'ADD_UNIT',
            unit: newUnit
        });
    };

    // Add this function to handle skill selection
    const handleSkillSelect = (skillRef, skillImpl, unit) => {
        if (isSkillOnCooldown(skillRef, gameState.currentTurn)) {
            console.log('Skill is on cooldown');
            return;
        }
        
        setActiveSkill({
            ref: skillRef,
            impl: skillImpl
        });

 

        if (skillImpl.microActions[0]?.targetingType === TargetingType.SELF) {
            const result = executeSkill(skillRef, gameState, unit, unit.x, unit.y);
            if (result.success) {
                const newCooldownUntil = gameState.currentTurn + skillImpl.cooldown;
            

                sendJsonMessage({
                    type: 'GAME_ACTION',
                    action: 'USE_SKILL',
                    skillName: skillRef.name,
                    casterId: unit.id,
                    targetX: unit.x,
                    targetY: unit.y,
                    updatedGameState: result.updatedGameState,
                    newCooldownUntil: newCooldownUntil
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
        if (skillImpl.microActions?.[0]?.targetingType === TargetingType.AOE_AROUND_SELF) {
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
        
        const playerTeam = gameState.players[Object.keys(gameState.players).find(
            id => gameState.players[id].username === username
        )]?.team;
        
        // Close menu if unit is not owned by player or not their turn
        if (!unit || unit.team !== playerTeam || unit.team !== gameState.turn) {
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
            type: 'GAME_ACTION',
            action: 'MOVE_UNIT',
            unitId: unit.id,
            newX,
            newY,
            newMovementLeft: unit.movementLeft - distance
        });

        setSelectedUnit(null);
        setHighlightedCells([]);
    };

    const handleAttack = (attacker, target) => {
        // Calculate damage
        const damage = Math.max(1, attacker.atk - target.def);
        const newHp = Math.max(0, target.hp - damage);

        sendJsonMessage({
            type: 'GAME_ACTION',
            action: 'ATTACK',
            attackerId: attacker.id,
            targetId: target.id,
            newHp
        });
    };

    const endTurn = () => {
        const updatedUnits = gameState.units.map(unit => ({
            ...unit,
            movementLeft: unit.movementRange,
            hasAttacked: false
        }));
    
        const currentPlayerIndex = parseInt(gameState.turn.slice(-1));
        const nextPlayerIndex = currentPlayerIndex === Object.keys(gameState.players).length ? 1 : currentPlayerIndex + 1;
        
        sendJsonMessage({
            type: 'GAME_ACTION',
            action: 'END_TURN',
            updatedUnits,
            nextTurn: `player${nextPlayerIndex}`,
            // currentTurn will be incremented on the server
        });
    
        setSelectedUnit(null);
        setHighlightedCells([]);
    };


    const ContextMenu = ({ position, unit }) => {
        if (!position) return null;
    
        return (
            <div 
                className="fixed bg-white shadow-lg rounded-lg border border-gray-200 z-50 w-48 context-menu"
                style={{ left: position.x, top: position.y }}
            >
                <button 
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                        ${unit.hasAttacked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleAction('attack', unit)}
                    disabled={unit.hasAttacked}
                >
                    <Sword size={16} /> Basic Attack
                </button>
                <button 
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                        setShowSkillsMenu(true);
                        setContextMenu(null);
                    }}
                >
                    <ScrollText size={16} /> Skills
                </button>
                <button 
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => {
                        setShowNPMenu(true);
                        setContextMenu(null);
                    }}
                >
                    <Star size={16} /> Noble Phantasms
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
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => handleAction('move', unit)}
                >
                    <Move size={16} /> Move
                </button>
            </div>
        );
    };
    

    const debugSkillMethods = (skill) => {
        console.log('Skill debug:', {
            name: skill.name,
            isFunction: typeof skill.isOnCooldown === 'function',
            prototype: Object.getPrototypeOf(skill),
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(skill))
        });
    };
    


    const SkillsMenu = ({ unit }) => {
        if (!showSkillsMenu) return null;
    
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 w-96 skills-menu" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4">Skills</h3>
                    <div className="space-y-2">
                        {unit.skills?.map((skillRef, index) => {
                            const skillImpl = getSkillImplementation(skillRef.id);
                            if (!skillImpl) return null;
    
                            const isOnCd = isSkillOnCooldown(skillRef, gameState.currentTurn);
                            const turnsRemaining = isOnCd ? 
                                skillRef.onCooldownUntil - gameState.currentTurn : 0;
    
                            return (
                                <div 
                                    key={index}
                                    className={`p-2 border rounded hover:bg-gray-50 cursor-pointer 
                                        ${isOnCd ? 'opacity-50' : ''}`}
                                    onClick={() => !isOnCd && handleSkillSelect(skillRef, skillImpl, unit)}
                                >
                                    <div className="font-bold flex justify-between">
                                        {skillImpl.name}
                                        <span className={`text-sm ${isOnCd ? 'text-red-500' : 'text-green-500'}`}>
                                            {isOnCd 
                                                ? `CD: ${turnsRemaining} turn${turnsRemaining !== 1 ? 's' : ''}`
                                                : 'Ready'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">{skillImpl.description}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Cooldown: {skillImpl.cooldown} turns
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
    

    const NoblePhantasmMenu = ({ unit }) => {
        if (!showNPMenu) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 w-96 np-menu" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4">Noble Phantasms</h3>
                    <div className="space-y-2">
                        {unit.noblePhantasms.map(np => (
                            <div key={np.id} className="p-2 border rounded hover:bg-gray-50">
                                <div className="font-bold flex justify-between">
                                    {np.name}
                                    <span className="text-sm text-gray-500">CD: {np.cooldown}</span>
                                </div>
                                <div className="text-sm text-gray-600">{np.description}</div>
                            </div>
                        ))}
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

        const [activeTab, setActiveTab] = useState('stats');

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 w-[800px] h-[600px] profile-menu" onClick={e => e.stopPropagation()}>
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
                        {['stats', 'skills', 'noble phantasms', 'reactions'].map(tab => (
                            <button
                                key={tab}
                                className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-y-auto h-[450px] p-4">
                        {activeTab === 'stats' && (
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
                                        <span className="font-bold">Movement:</span> {unit.movementLeft}/{unit.movementRange}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'skills' && (
                            <div className="space-y-4">
                                {unit.skills.map(skill => (
                                    <div key={skill.id} className="p-4 border rounded">
                                        <h3 className="font-bold text-lg">{skill.name}</h3>
                                        <div className="text-sm text-gray-600 mt-2">{skill.description}</div>
                                        <div className="mt-2 text-sm">
                                            <span className="font-bold">Type:</span> {skill.type}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-bold">Cooldown:</span> {skill.cooldown} turns
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'noble phantasms' && (
                            <div className="space-y-4">
                                {unit.noblePhantasms.map(np => (
                                    <div key={np.id} className="p-4 border rounded">
                                        <h3 className="font-bold text-lg">{np.name}</h3>
                                        <div className="text-sm text-gray-600 mt-2">{np.description}</div>
                                        <div className="text-sm">
                                            <span className="font-bold">Cooldown:</span> {np.cooldown} turns
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'reactions' && (
                            <div className="space-y-4">
                                {unit.reactions?.map(reaction => (
                                    <div key={reaction.id} className="p-4 border rounded">
                                        <h3 className="font-bold text-lg">{reaction.name}</h3>
                                        <div className="text-sm text-gray-600 mt-2">{reaction.description}</div>
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
        return gameState?.units.find(unit => unit.x === x && unit.y === y);
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
        const playerTeam = gameState.players[Object.keys(gameState.players).find(
            id => gameState.players[id].username === username
        )].team;

        if (unit.team !== playerTeam || unit.team !== gameState.turn) return;

        if (action === 'move') {
            setHighlightedCells(getPossibleMoves(unit));
            setContextMenu(null);
        } else if (action === 'attack') {
            // Handle attack action
            setContextMenu(null);
            // You could set a state to indicate attack mode and highlight possible targets
            // Then handle the actual attack in handleCellClick when a target is selected
        }
    };

    const handleCellClick = (x, y) => {
        setContextMenu(null);
        setActiveUnit(null);
        if (skillTargetingMode && activeSkill) {
            const caster = selectedUnit;
            if (!caster) return;
    
            const { ref, impl } = activeSkill;
            
            console.log('Executing skill:', {
                skillName: impl.name,
                caster: caster.name,
                targetX: x,
                targetY: y
            });

            // Execute the skill using the implementation
            const result = executeSkill(ref, gameState, caster, x, y);
            if (result.success) {

                const newCooldownUntil = gameState.currentTurn + impl.cooldown;

                console.log('Skill execution result:', {
                    success: result.success,
                    updatedState: result.updatedGameState
                });

                // Create deep copy with preserved cooldowns
            const updatedGameState = {
                ...result.updatedGameState,
                units: result.updatedGameState.units.map(updatedUnit => {
                    if (updatedUnit.id === caster.id) {
                        return {
                            ...updatedUnit,
                            skills: updatedUnit.skills.map(skill => {
                                if (skill.id === ref.id) {
                                    return {
                                        ...skill,
                                        onCooldownUntil: newCooldownUntil
                                    };
                                }
                                return skill;
                            })
                        };
                    }
                    return updatedUnit;
                })
            };

            console.log('Skill execution (deep copy):', {
                success: result.success,
                updatedState: result.updatedGameState
            });
                
                sendJsonMessage({
                    type: 'GAME_ACTION',
                    action: 'USE_SKILL',
                    skillName: impl.name,
                    casterId: caster.id,
                    targetX: x,
                    targetY: y,
                    updatedGameState: result.updatedGameState,
                    newCooldownUntil: newCooldownUntil
                });
            }
    
            // Reset targeting mode
            setSkillTargetingMode(false);
            setActiveSkill(null);
            setPreviewCells(new Set());
            setSelectedUnit(null);
            return;
        }

        //logic for clicking when trying to move
        
        const clickedUnit = getUnitAt(x, y);
        const playerTeam = gameState.players[Object.keys(gameState.players).find(
            id => gameState.players[id].username === username
        )].team;
        
        if (selectedUnit) {
            if (!clickedUnit && highlightedCells.some(move => move.x === x && move.y === y)) {
                moveUnit(selectedUnit, x, y);
            } else {
                setSelectedUnit(null);
                setHighlightedCells([]);
            }
        } else if (clickedUnit && clickedUnit.team === playerTeam && clickedUnit.team === gameState.turn) {
            setSelectedUnit(clickedUnit);
        }
    };

    // Add this function to handle mouse movement during targeting
    const handleCellHover = (x, y) => {
        if (skillTargetingMode && activeSkill && selectedUnit) {
            const { impl } = activeSkill;

            // Don't show preview for SELF targeting
        if (impl.microActions[0]?.targetingType === TargetingType.SELF) {
            return;
        }
            
            // Use the TargetingLogic class through our utility function
            const affectedCells = getSkillAffectedCells(
                impl,
                selectedUnit,
                x,
                y,
                11 // gridSize
            );
            setPreviewCells(affectedCells);
        }
    };
    


    const UnitStatsTooltip = ({ unit }) => (
        <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white p-2 rounded shadow-lg z-10">
            <div className="text-sm font-bold mb-1">{unit.name}</div>
            <div className="flex gap-2 text-xs">
                <span className="flex items-center"><Heart size={12} className="mr-1" />{unit.hp}</span>
                <span className="flex items-center"><Sword size={12} className="mr-1" />{unit.atk}</span>
                <span className="flex items-center"><Shield size={12} className="mr-1" />{unit.def}</span>
                <span className="flex items-center"><Move size={12} className="mr-1" />{unit.movementLeft}/{unit.movementRange}</span>
            </div>
        </div>
    );

    const renderCell = (x, y) => {
        const unit = getUnitAt(x, y);
        const isSelected = selectedUnit && selectedUnit.id === unit?.id;
        const isValidMove = highlightedCells.some(move => move.x === x && move.y === y);
        //addition for skill use logic
        const isInSkillPreview = previewCells.has(`${x},${y}`);
        //addition for visibility
        const isVisible = isCellVisible(x, y);
        
        let bgColor = 'bg-green-100';

        if (!isVisible) {
            if (isInSkillPreview) {
                bgColor = 'bg-gray-900 after:absolute after:inset-0 after:bg-red-500 after:opacity-30';
            } else {
                bgColor = 'bg-gray-900'; // Regular fog
            }
        }
        else if (isInSkillPreview) {
        // Different colors for different targeting types
        if (activeSkill?.impl.microActions[0]?.targetingType === TargetingType.SELF) {
            bgColor = 'bg-blue-200'; // Self-targeting preview
        } else if (activeSkill?.impl.microActions[0]?.targetingType === TargetingType.AOE_FROM_POINT_WITHIN_RANGE) {
            bgColor = 'bg-purple-200'; // Constrained AOE preview
        } else {
            bgColor = 'bg-red-200'; // Standard AOE preview
        }
        } else if (isSelected) {
        bgColor = 'bg-blue-300';
        } else if (isValidMove) {
        bgColor = 'bg-blue-100';
        }

        const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
        if (isHovered && unit && unit.team === playerTeam) {
            bgColor = 'bg-yellow-200';
        }

        const canTargetNonVisibleCells = () => {
            if (!skillTargetingMode || !activeSkill) return false;
            const targetingType = activeSkill.impl.microActions[0]?.targetingType;
            return targetingType === TargetingType.AOE_AROUND_SELF ||
                   targetingType === TargetingType.AOE_CARDINAL_DIRECTION ||
                   targetingType === TargetingType.AOE_FROM_POINT;
        };

        return (
            <div
            key={`${x}-${y}`}
            className={`w-16 h-16 border border-gray-300 ${bgColor} flex items-center justify-center relative cursor-pointer`}
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
                {unit && isVisible && (
                    <div 
                        className={`absolute inset-0 flex items-center justify-center 
                            ${unit.team === playerTeam ? 'text-blue-600' : 'text-red-600'}
                            ${unit.movementLeft === 0 ? 'opacity-50' : ''}`}
                        onMouseEnter={() => setHoveredUnit(unit)}
                        onMouseLeave={() => setHoveredUnit(null)}
                    >
                        <img 
                            src={unit.sprite} 
                            alt={unit.name}
                            className="w-16 h-16 object-contain"
                        />
                        {hoveredUnit?.id === unit.id && <UnitStatsTooltip unit={unit} />}
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
                {Array.from(visibleCells).map(cellCoord => {
                    const [x, y] = cellCoord.split(',').map(Number);
                    return (
                        <div
                            key={cellCoord}
                            className="absolute bg-yellow-100 opacity-30"
                            style={{
                                left: `${x * 64}px`,
                                top: `${y * 64}px`,
                                width: '64px',
                                height: '64px'
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
    const playerTeam = gameState?.players[Object.keys(gameState.players).find(
        id => gameState.players[id].username === username
    )]?.team;

    // In TacticalGame.jsx, replace the return statement with:

return (
    <div className="p-4">
        <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">
                {gameState.turn === playerTeam ? "Your Turn" : `${gameState.turn}'s Turn`}
            </h2>
            <div className="text-sm text-gray-600">
                Turn {gameState.currentTurn} | Round {gameState.currentRound}
            </div>
            <div className="text-right">
                <div className="text-sm text-gray-600">
                    Turns per Round: {gameState.turnsPerRound}
                </div>
                <div className="text-sm text-gray-600">
                    Turns until next round: {gameState.turnsPerRound - (gameState.currentTurn % gameState.turnsPerRound)}
                </div>
            </div>

            <div className="flex gap-2 mt-2">
                {gameState.turn === playerTeam && (
                    <button
                        onClick={endTurn}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        End Turn
                    </button>
                )}
                <DetectionButton/>
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
        {showSkillsMenu && activeUnit && (
            <SkillsMenu unit={activeUnit} />
        )}
        {showNPMenu && activeUnit && (
            <NoblePhantasmMenu unit={activeUnit} />
        )}
        {showProfile && activeUnit && (
            <ProfileSheet unit={activeUnit} />
        )}
        {showServantSelector && (
            <ServantSelector
                onClose={() => setShowServantSelector(false)}
                onSelectServant={handleAddServant}
                teams={Object.values(gameState.players).map(player => player.team)}
                gameState={gameState}
            />
        )}
        {detectionResults && <DetectionResults results={detectionResults} />}
        {detectionError && <DetectionError message={detectionError} />}
    </div>
);
};

export default TacticalGame;