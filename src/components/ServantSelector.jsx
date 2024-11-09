// src/components/ServantSelector.jsx
import React, { useState } from 'react';
import { ServantRegistry } from '../game/servants/registry_character';

const ServantSelector = ({ onClose, onSelectServant, teams }) => {
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedServant, setSelectedServant] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const servantClasses = Object.keys(ServantRegistry);

    const handleSubmit = () => {
        if (selectedServant && selectedTeam && position) {
            const servantTemplate = ServantRegistry[selectedClass][selectedServant].template;
            const newUnit = {
                id: Date.now(), // Simple way to generate unique IDs
                x: parseInt(position.x),
                y: parseInt(position.y),
                team: selectedTeam,
                movementLeft: servantTemplate.baseMovementRange,
                hasAttacked: false,
                hp: servantTemplate.baseHp,
                atk: servantTemplate.baseAtk,
                def: servantTemplate.baseDef,
                movementRange: servantTemplate.baseMovementRange,
                ...servantTemplate
            };
            onSelectServant(newUnit);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[500px]">
                <h2 className="text-2xl font-bold mb-4">Add New Servant</h2>
                
                {/* Class Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Class
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {servantClasses.map(servantClass => (
                            <button
                                key={servantClass}
                                className={`p-2 border rounded ${
                                    selectedClass === servantClass 
                                        ? 'bg-blue-500 text-white' 
                                        : 'hover:bg-gray-100'
                                }`}
                                onClick={() => {
                                    setSelectedClass(servantClass);
                                    setSelectedServant(null);
                                }}
                            >
                                {servantClass}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Servant Selection */}
                {selectedClass && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Servant
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(ServantRegistry[selectedClass]).map(servant => (
                                <button
                                    key={servant}
                                    className={`p-2 border rounded ${
                                        selectedServant === servant 
                                            ? 'bg-blue-500 text-white' 
                                            : 'hover:bg-gray-100'
                                    }`}
                                    onClick={() => setSelectedServant(servant)}
                                >
                                    {servant}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Team Selection */}
                {selectedServant && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Team
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {teams.map(team => (
                                <button
                                    key={team}
                                    className={`p-2 border rounded ${
                                        selectedTeam === team 
                                            ? 'bg-blue-500 text-white' 
                                            : 'hover:bg-gray-100'
                                    }`}
                                    onClick={() => setSelectedTeam(team)}
                                >
                                    {team}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Position Selection */}
                {selectedTeam && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Position
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-600">X:</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={position.x}
                                    onChange={(e) => setPosition({ ...position, x: e.target.value })}
                                    className="mt-1 block w-full border rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600">Y:</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={position.y}
                                    onChange={(e) => setPosition({ ...position, y: e.target.value })}
                                    className="mt-1 block w-full border rounded-md shadow-sm p-2"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 rounded ${
                            selectedServant && selectedTeam && position.x && position.y
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 cursor-not-allowed'
                        }`}
                        onClick={handleSubmit}
                        disabled={!selectedServant || !selectedTeam || !position.x || !position.y}
                    >
                        Add Servant
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServantSelector;