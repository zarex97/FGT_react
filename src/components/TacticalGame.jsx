import React, { useState, useEffect } from 'react';
import { Sword, Shield, Heart, Move, ScrollText, Star, User } from 'lucide-react';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

const client = new WebSocket('ws://localhost:80');

const TacticalGame = () => {
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [hoveredUnit, setHoveredUnit] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [activeUnit, setActiveUnit] = useState(null);
    const [showSkillsMenu, setShowSkillsMenu] = useState(false);
    const [showNPMenu, setShowNPMenu] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [highlightedCells, setHighlightedCells] = useState([]);
    const [gameState, setGameState] = useState({
        units: [
            { 
                id: 1, 
                x: 1, 
                y: 1, 
                team: 'player', 
                hp: 20, 
                atk: 8, 
                def: 5, 
                movementRange: 5,
                movementLeft: 5,
                hasAttacked: false,
                name: 'Anastasia',
                sprite: "/sprites/(Archer) Anastasia (Summer)_portrait.webp",
                skills: [
                    { id: 1, name: 'Shvibzik', type: 'Skill', description: 'Restores Luck', cooldown: 3 },
                    { id: 2, name: 'Ice Bucket Challenge for You', type: 'Attack Skill', description: 'rains ice', cooldown: 2 }
                ],
                noblePhantasms: [
                    { id: 1, name: 'Snegleta・Snegurochka: Summer Snow', description: 'Unleashes the power of summer', cooldown: 5 }
                ],
                reactions: [
                    { id: 1, name: 'Instinct', description: 'May evade incoming attacks' }
                ]
            },
            { 
                id: 2, 
                x: 3, 
                y: 1, 
                team: 'player', 
                hp: 18, 
                atk: 6, 
                def: 7, 
                movementRange: 3,     // Heavy armored unit with low movement
                movementLeft: 3,
                hasAttacked: false,
                name: 'Artoria',
                sprite: "/sprites/(Saber) Artoria_portrait.png",
                skills: [
                    { id: 1, name: 'Charisma', type: 'Skill', description: 'Boost allies ATK', cooldown: 3 },
                    { id: 2, name: 'Mana Burst', type: 'Attack Skill', description: 'Powerful magic attack', cooldown: 2 }
                ],
                noblePhantasms: [
                    { id: 1, name: 'Excalibur', description: 'Unleash holy sword energy', cooldown: 5 }
                ],
                reactions: [
                    { id: 1, name: 'Instinct', description: 'May evade incoming attacks' }
                ]
            },
            { 
                id: 3, 
                x: 6, 
                y: 6, 
                team: 'enemy', 
                hp: 15, 
                atk: 7, 
                def: 4, 
                movementRange: 4,     // Standard infantry unit
                movementLeft: 4,
                hasAttacked: false,
                name: 'Bandit',
                sprite: "/sprites/(Archer) Arash_portrait.webp",
                skills: [
                    { id: 1, name: 'Clairvoyance', type: 'Skill', description: 'makes his attacks harder to dodge', cooldown: 3 },
                    { id: 2, name: 'Bow and Arrow Creation ', type: 'Attack Skill', description: 'Powerful magic attack', cooldown: 2 }
                ],
                noblePhantasms: [
                    { id: 1, name: 'Stella: Lone Meteor ', description: 'Unleash the power of his last arrow', cooldown: 5 }
                ],
                reactions: [
                ]
            }
        ],
        turn: 'player'
    });

    const [visibilityGrid, setVisibilityGrid] = useState(
        Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false))
    );

    // useEffect(() => {
    //     client.onopen = () => {
    //         console.log('WebSocket Client Connected');
    //     };

    //     client.onmessage = (message) => {
    //         const data = JSON.parse(message.data);
    //         setGameState(data);
    //     };

    //     return () => {
    //         client.close();
    //     };
    // }, []);

    const sendGameState = (state) => {
        client.send(JSON.stringify(state));
    };

    // Close all menus when clicking outside
    useEffect(() => {
        client.onopen = () => {
            console.log('WebSocket Client Connected');
        };

        client.onmessage = (message) => {
            const data = JSON.parse(message.data);
            setGameState(data);
        };

        return () => {
            client.close();
        };


        const handleClickOutside = (event) => {
            if (contextMenu && !event.target.closest('.fixed')) { // Check if clicking outside the context menu
                setContextMenu(null);
            }
            if (showSkillsMenu && !event.target.closest('.fixed')) {
                setShowSkillsMenu(false);
            }
            if (showNPMenu && !event.target.closest('.fixed')) {
                setShowNPMenu(false);
            }
            if (showProfile && !event.target.closest('.fixed')) {
                setShowProfile(false);
            }
            setActiveUnit(null); // Reset active unit when clicking outside
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu, showSkillsMenu, showNPMenu, showProfile, activeUnit]);

    const handleContextMenu = (e, unit) => {
        e.preventDefault();
        if (unit.team === gameState.turn) {
            setContextMenu({ x: e.pageX, y: e.pageY });
            setActiveUnit(unit);
        }
    };

    const handleAction = (action, unit) => {
        if (action === 'move') {
            setHighlightedCells(getPossibleMoves(unit));
            setContextMenu(null);
        } else if (action === 'attack') {
            // Handle attack action
        }
    };

    const ContextMenu = ({ position, unit, playerId }) => {
        if (!position || playerId !== unit.playerId) return null;

        return (
            <div 
                className="fixed bg-white shadow-lg rounded-lg border border-gray-200 z-50 w-48"
                style={{ left: position.x, top: position.y }}
                onClick={e => e.stopPropagation()}
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
                    onClick={() => setShowSkillsMenu(true)}
                >
                    <ScrollText size={16} /> Skills
                </button>
                <button 
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => setShowNPMenu(true)}
                >
                    <Star size={16} /> Noble Phantasms
                </button>
                <button 
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => setShowProfile(true)}
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

    const SkillsMenu = ({ unit }) => {
        if (!showSkillsMenu) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 w-96">
                    <h3 className="text-xl font-bold mb-4">Skills</h3>
                    <div className="space-y-2">
                        {unit.skills.map(skill => (
                            <div key={skill.id} className="p-2 border rounded hover:bg-gray-50">
                                <div className="font-bold flex justify-between">
                                    {skill.name}
                                    <span className="text-sm text-gray-500">CD: {skill.cooldown}</span>
                                </div>
                                <div className="text-sm text-gray-600">{skill.description}</div>
                                <div className="text-xs text-gray-500">Type: {skill.type}</div>
                            </div>
                        ))}
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
                <div className="bg-white rounded-lg p-4 w-96">
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
                <div className="bg-white rounded-lg p-4 w-[800px] h-[600px]">
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
                                        <span className="font-bold">Movement:</span> {unit.movementRange}
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
                                {unit.reactions.map(reaction => (
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
        return gameState.units.find(unit => unit.x === x && unit.y === y);
    };

    // Calculate Manhattan distance between two points
    const calculateDistance = (x1, y1, x2, y2) => {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    };

    // Get all possible moves within remaining movement points
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

    const moveUnit = (unit, newX, newY) => {
        if (!unit || unit.movementLeft <= 0) return;
        
        const distance = calculateDistance(unit.x, unit.y, newX, newY);
        if (distance > unit.movementLeft) return;

        const updatedUnits = gameState.units.map(u => {
            if (u.id === unit.id) {
                return {
                    ...u,
                    x: newX,
                    y: newY,
                    movementLeft: u.movementLeft - distance
                };
            }
            return u;
        });
        
        setGameState(prev => ({ ...prev, units: updatedUnits }));
        setSelectedUnit(null);
        setHighlightedCells([]);
        updateVisibility(unit);
        sendGameState({ ...gameState, units: updatedUnits });
    };

    const updateVisibility = (unit) => {
        const newVisibilityGrid = visibilityGrid.map((row, y) => 
            row.map((isVisible, x) => 
                isVisible || calculateDistance(unit.x, unit.y, x, y) <= unit.visionRange
            )
        );
        setVisibilityGrid(newVisibilityGrid);
    };

    const handleCellClick = (x, y) => {
        const clickedUnit = getUnitAt(x, y);
        
        if (selectedUnit) {
            if (!clickedUnit && highlightedCells.some(move => move.x === x && move.y === y)) {
                moveUnit(selectedUnit, x, y);
            } else {
                setSelectedUnit(null);
                setHighlightedCells([]);
            }
        } else if (clickedUnit && clickedUnit.team === gameState.turn && clickedUnit.movementLeft > 0) {
            setSelectedUnit(clickedUnit);
        }
    };

    const endTurn = () => {
        const updatedUnits = gameState.units.map(unit => ({
            ...unit,
            movementLeft: unit.movementRange // Reset movement points to full
        }));
        setGameState(prev => ({
            ...prev,
            units: updatedUnits,
            turn: prev.turn === 'player' ? 'enemy' : 'player'
        }));
        setSelectedUnit(null);
        setHighlightedCells([]);
        sendGameState({ ...gameState, units: updatedUnits, turn: gameState.turn === 'player' ? 'enemy' : 'player' });
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
        const isVisible = visibilityGrid[y][x];
        const isSelected = selectedUnit && selectedUnit.id === unit?.id;
        const isValidMove = highlightedCells.some(move => move.x === x && move.y === y);
        
        let bgColor = 'bg-green-100';
        if (isSelected) bgColor = 'bg-blue-300';
        else if (isValidMove) bgColor = 'bg-blue-100';

        return (
            <div
                key={`${x}-${y}`}
                className={`w-16 h-16 border border-gray-300 ${bgColor} flex items-center justify-center relative cursor-pointer`}
                onClick={() => handleCellClick(x, y)}
                onContextMenu={(e) => handleContextMenu(e, unit)}
            >
                {unit && (
                    <div 
                        className={`absolute inset-0 flex items-center justify-center 
                            ${unit.team === 'player' ? 'text-blue-600' : 'text-red-600'}
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
                {!isVisible && <div className="absolute inset-0 bg-black opacity-50"></div>}
            </div>
        );
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">
                    Turn: {gameState.turn === 'player' ? 'Player Phase' : 'Enemy Phase'}
                </h2>
                <button
                    onClick={endTurn}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    End Turn
                </button>
            </div>
            
            <div className="inline-block border-2 border-gray-400">
                {Array.from({ length: GRID_SIZE }).map((_, y) => (
                    <div key={y} className="flex">
                        {Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))}
                    </div>
                ))}
            </div>

            {contextMenu && activeUnit && (
                <ContextMenu position={contextMenu} unit={activeUnit} playerId={activeUnit.playerId} />
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
        </div>
    );
};

export default TacticalGame;