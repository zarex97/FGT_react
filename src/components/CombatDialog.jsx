// src/components/CombatDialog.jsx
import React from 'react';
import { Shield, Zap, X } from 'lucide-react';

export const CombatDialog = ({ 
    isOpen, 
    attacker, 
    defender, 
    onChoice, 
    combatState 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h2 className="text-xl font-bold mb-4">Combat Phase</h2>
                
                <div className="flex justify-between mb-6">
                    <div className="text-center">
                        <img 
                            src={attacker.sprite} 
                            alt={attacker.name} 
                            className="w-24 h-24 object-contain mb-2"
                        />
                        <div className="font-bold">{attacker.name}</div>
                        <div className="text-sm">ATK: {attacker.atk}</div>
                    </div>
                    <div className="flex items-center">
                        <span className="text-2xl">⚔️</span>
                    </div>
                    <div className="text-center">
                        <img 
                            src={defender.sprite} 
                            alt={defender.name} 
                            className="w-24 h-24 object-contain mb-2"
                        />
                        <div className="font-bold">{defender.name}</div>
                        <div className="text-sm">
                            DEF: {defender.def} | AGI: {defender.agility} | LUCK: {defender.luck}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold">Choose your response:</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={() => onChoice('defend')}
                            className="p-4 border rounded hover:bg-blue-50 flex flex-col items-center"
                        >
                            <Shield className="w-8 h-8 mb-2" />
                            <span>Defend</span>
                            <span className="text-xs text-gray-600">(-30% damage)</span>
                        </button>
                        
                        <button
                            onClick={() => onChoice('evade')}
                            className="p-4 border rounded hover:bg-blue-50 flex flex-col items-center"
                        >
                            <Zap className="w-8 h-8 mb-2" />
                            <span>Evade</span>
                            <span className="text-xs text-gray-600">
                                (AGI: {defender.agility} vs {attacker.agility})
                            </span>
                        </button>
                        
                        <button
                            onClick={() => onChoice('nothing')}
                            className="p-4 border rounded hover:bg-blue-50 flex flex-col items-center"
                        >
                            <X className="w-8 h-8 mb-2" />
                            <span>Do Nothing</span>
                            <span className="text-xs text-gray-600">(Full damage)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Combat Results Dialog
export const CombatResultsDialog = ({
    isOpen,
    result,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h2 className="text-xl font-bold mb-4">Combat Results</h2>
                
                {result.evaded ? (
                    <div className="text-center text-xl mb-4">
                        Attack Evaded! ⚡
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-center text-xl mb-4">
                            Damage Dealt: {result.damage}
                            {result.critical && <span className="text-red-500 ml-2">Critical Hit! 🎯</span>}
                        </div>
                        
                        {result.agilityReduction && (
                            <div className="text-center text-red-500">
                                Agility reduced by {result.agilityReduction}!
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-center mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};