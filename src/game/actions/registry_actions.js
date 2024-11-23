// src/game/actions/registry_actions.js
import { ServantRegistry } from '../servants/registry_character';
import { TargetingLogic } from '../targeting/TargetingLogic';

export const ActionImplementations = Object.values(ServantRegistry).reduce((acc, servantClass) => {
    Object.values(servantClass).forEach(servantInfo => {
        // Log what we're working with for debugging
        console.log('Processing servant:', {
            name: servantInfo.template?.name,
            hasActions: !!servantInfo.actions
        });

        // Get actions directly from the servant's actions property
        const servantActions = servantInfo.actions;
        
        if (servantActions) {
            // Process common actions
            if (servantActions.common) {
                if (!acc.common) acc.common = {};
                Object.entries(servantActions.common).forEach(([actionId, action]) => {
                    console.log('Registering common action:', actionId);
                    acc.common[actionId] = action;
                });
            }

            // Process unique actions
            if (servantActions.unique) {
                if (!acc.unique) acc.unique = {};
                Object.entries(servantActions.unique).forEach(([actionId, action]) => {
                    console.log('Registering unique action:', actionId);
                    acc.unique[actionId] = action;
                });
            }
        }
    });
    return acc;
}, { common: {}, unique: {} });



export const getActionImplementation = (actionId, type = 'common') => {
    console.log('Looking for action:', {
        actionId,
        type,
        availableActions: ActionImplementations[type],
        allImplementations: ActionImplementations
    });

    const implementation = ActionImplementations[type]?.[actionId];
    if (!implementation) {
        console.error(`No implementation found for ${type} action: ${actionId}`, {
            availableActions: Object.keys(ActionImplementations[type] || {}),
            searchedId: actionId,
            searchedType: type
        });
    }
    return implementation;
};

export const isActionOnCooldown = (actionRef, currentTurn) => {
    if (!actionRef || typeof actionRef.onCooldownUntil !== 'number') return false;
    return currentTurn <= actionRef.onCooldownUntil;
};

export const executeAction = (actionRef, type, gameState, caster, targetX, targetY) => {
    const actionImpl = getActionImplementation(actionRef.id, type);
    
    console.log('Executing action:', {
        actionName: actionRef.id,
        type,
        caster,
        targetX,
        targetY,
        currentTurn: gameState.currentTurn
    });
    
    if (!actionImpl) {
        console.error(`No implementation found for action: ${actionRef.id}`);
        return { success: false, message: 'Action not found' };
    }

    if (isActionOnCooldown(actionRef, gameState.currentTurn)) {
        console.log('Action is on cooldown:', {
            currentTurn: gameState.currentTurn,
            cooldownUntil: actionRef.onCooldownUntil
        });
        return { success: false, message: 'Action is on cooldown' };
    }

    const result = actionImpl.execute(gameState, caster, targetX, targetY);
    
    console.log('Action execution result:', {
        success: result.success,
        updatedState: result.updatedGameState ? {
            unitCount: result.updatedGameState.units.length,
            // Log affected units if needed
        } : null
    });
    
    if (result.success) {
        actionRef.onCooldownUntil = gameState.currentTurn + actionImpl.cooldown;
    }

    return result;
};

export const getActionAffectedCells = (actionImpl, caster, targetX, targetY, gridSize) => {
    if (!actionImpl.microActions?.[0]) return new Set();

    const affectedCells = TargetingLogic.getAffectedCells({
        targetingType: actionImpl.microActions[0].targetingType,
        casterX: caster.x,
        casterY: caster.y,
        range: actionImpl.microActions[0].range,
        targetX,
        targetY,
        applyCornerRule: actionImpl.microActions[0].applyCornerRule,
        gridSize,
        dimensions: actionImpl.microActions[0].dimensions
    });

    console.log('Calculated affected cells for action:', {
        targetingType: actionImpl.microActions[0].targetingType,
        casterPosition: { x: caster.x, y: caster.y },
        targetPosition: { x: targetX, y: targetY },
        cellCount: affectedCells.size
    });

    return affectedCells;
};