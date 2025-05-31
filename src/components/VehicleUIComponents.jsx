// VehicleUIComponents.jsx
import React, { useState } from "react";
import { User, X, ArrowRight, ArrowLeft, Move } from "lucide-react";
import { VehicleUtils } from "../game/utils/VehicleUtils.js";

export const VehiclePassengerManager = ({
  vehicle,
  gameState,
  onClose,
  onBoardUnit,
  onDisembarkUnit,
  playerTeam,
}) => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Get units that can board this vehicle
  const nearbyUnits = gameState.units.filter((unit) => {
    if (unit.aboardVehicle || unit.isVehicle) return false;
    if (unit.team !== playerTeam) return false;

    // Check if unit is adjacent to vehicle
    const disembarkPositions = VehicleUtils.getDisembarkPositions(
      vehicle,
      gameState
    );
    return disembarkPositions.some(
      (pos) => pos.x === unit.x && pos.y === unit.y && pos.z === unit.z
    );
  });

  // Get units currently aboard
  const aboardUnits = VehicleUtils.getUnitsAboard(vehicle, gameState);

  // Generate vehicle grid for visual representation
  const vehicleGrid = Array.from(
    { length: vehicle.dimensions.height },
    (_, y) =>
      Array.from({ length: vehicle.dimensions.width }, (_, x) => {
        const occupant = aboardUnits.find(
          (unit) =>
            unit.vehicleRelativePosition?.x === x &&
            unit.vehicleRelativePosition?.y === y
        );
        return { x, y, occupant };
      })
  );

  const handleBoardUnit = (unit, relativeX, relativeY) => {
    onBoardUnit(vehicle.id, unit.id, relativeX, relativeY);
    setSelectedUnit(null);
    setSelectedPosition(null);
  };

  const handleDisembarkUnit = (unit) => {
    const disembarkPositions = VehicleUtils.getDisembarkPositions(
      vehicle,
      gameState
    );
    if (disembarkPositions.length > 0) {
      const pos = disembarkPositions[0]; // Use first available position
      onDisembarkUnit(vehicle.id, unit.id, pos.x, pos.y, pos.z);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[600px] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Manage Vehicle: {vehicle.name}</h3>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Vehicle Layout */}
          <div>
            <h4 className="text-lg font-semibold mb-3">Vehicle Layout</h4>
            <div className="border-2 border-gray-300 p-4 bg-gray-50">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${vehicle.dimensions.width}, 1fr)`,
                }}
              >
                {vehicleGrid.flat().map((cell) => (
                  <div
                    key={`${cell.x}-${cell.y}`}
                    className={`
                      w-12 h-12 border border-gray-400 flex items-center justify-center
                      cursor-pointer text-xs
                      ${
                        selectedPosition?.x === cell.x &&
                        selectedPosition?.y === cell.y
                          ? "bg-blue-200"
                          : cell.occupant
                          ? "bg-green-200"
                          : "bg-white hover:bg-gray-100"
                      }
                    `}
                    onClick={() => {
                      if (cell.occupant) {
                        // Click on occupied cell - select unit for disembark
                        setSelectedUnit(cell.occupant);
                        setSelectedPosition(null);
                      } else {
                        // Click on empty cell - select position for boarding
                        setSelectedPosition({ x: cell.x, y: cell.y });
                        setSelectedUnit(null);
                      }
                    }}
                  >
                    {cell.occupant ? (
                      <div className="text-center">
                        <User size={16} />
                        <div className="text-xs">
                          {cell.occupant.name?.substring(0, 3)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        {cell.x},{cell.y}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              <p>
                Capacity: {aboardUnits.length}/{vehicle.maxPassengers || 10}
              </p>
              <p>Click empty cells to select boarding position</p>
              <p>Click occupied cells to select unit for disembarking</p>
            </div>
          </div>

          {/* Unit Lists */}
          <div>
            {/* Units Aboard */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3">
                Units Aboard ({aboardUnits.length})
              </h4>
              <div className="max-h-32 overflow-y-auto border rounded p-2">
                {aboardUnits.length === 0 ? (
                  <p className="text-gray-500 italic">No units aboard</p>
                ) : (
                  aboardUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={`
                        p-2 border rounded mb-2 cursor-pointer flex justify-between items-center
                        ${
                          selectedUnit?.id === unit.id
                            ? "bg-blue-100"
                            : "hover:bg-gray-50"
                        }
                      `}
                      onClick={() => setSelectedUnit(unit)}
                    >
                      <div>
                        <div className="font-medium">{unit.name}</div>
                        <div className="text-sm text-gray-600">
                          Position: ({unit.vehicleRelativePosition?.x},{" "}
                          {unit.vehicleRelativePosition?.y})
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisembarkUnit(unit);
                        }}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        <ArrowLeft size={12} /> Exit
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Nearby Units */}
            <div>
              <h4 className="text-lg font-semibold mb-3">
                Nearby Units ({nearbyUnits.length})
              </h4>
              <div className="max-h-32 overflow-y-auto border rounded p-2">
                {nearbyUnits.length === 0 ? (
                  <p className="text-gray-500 italic">No units nearby</p>
                ) : (
                  nearbyUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="p-2 border rounded mb-2 hover:bg-gray-50 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{unit.name}</div>
                        <div className="text-sm text-gray-600">
                          HP: {unit.hp} | Pos: ({unit.x}, {unit.y})
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (selectedPosition) {
                            handleBoardUnit(
                              unit,
                              selectedPosition.x,
                              selectedPosition.y
                            );
                          } else {
                            // Auto-board to first available position
                            const result = VehicleUtils.boardUnitAuto(
                              vehicle,
                              unit,
                              gameState
                            );
                            if (result) {
                              onBoardUnit(
                                vehicle.id,
                                unit.id,
                                result.updatedUnit.vehicleRelativePosition.x,
                                result.updatedUnit.vehicleRelativePosition.y
                              );
                            }
                          }
                        }}
                        disabled={
                          aboardUnits.length >= (vehicle.maxPassengers || 10)
                        }
                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:bg-gray-400"
                      >
                        <ArrowRight size={12} /> Board
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Instructions */}
        {selectedPosition && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800">
              Selected position ({selectedPosition.x}, {selectedPosition.y}).
              Click "Board" next to a unit to place them here.
            </p>
          </div>
        )}

        {selectedUnit && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800">
              Selected {selectedUnit.name}. Click "Exit" to disembark them to a
              nearby position.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const VehicleInspector = ({
  vehicle,
  gameState,
  onClose,
  onManagePassengers,
}) => {
  const aboardUnits = VehicleUtils.getUnitsAboard(vehicle, gameState);
  const disembarkPositions = VehicleUtils.getDisembarkPositions(
    vehicle,
    gameState
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Vehicle Info: {vehicle.name}</h3>
          <button className="p-2 hover:bg-gray-100 rounded" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Vehicle Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded">
              <div className="font-bold">HP</div>
              <div>{vehicle.hp}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-bold">Movement</div>
              <div>
                {vehicle.movementLeft}/{vehicle.movementRange}
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-bold">Size</div>
              <div>
                {vehicle.dimensions.width}×{vehicle.dimensions.height}
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="font-bold">Passengers</div>
              <div>
                {aboardUnits.length}/{vehicle.maxPassengers || 10}
              </div>
            </div>
          </div>

          {/* Passengers List */}
          <div>
            <h4 className="font-bold mb-2">Current Passengers</h4>
            <div className="max-h-32 overflow-y-auto border rounded p-2">
              {aboardUnits.length === 0 ? (
                <p className="text-gray-500 italic">No passengers</p>
              ) : (
                aboardUnits.map((unit) => (
                  <div key={unit.id} className="p-2 border rounded mb-2">
                    <div className="font-medium">{unit.name}</div>
                    <div className="text-sm text-gray-600">
                      HP: {unit.hp} | Position: (
                      {unit.vehicleRelativePosition?.x || 0},{" "}
                      {unit.vehicleRelativePosition?.y || 0})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onManagePassengers}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <Move size={16} /> Manage Passengers
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>

          {/* Debug Info */}
          <div className="text-xs text-gray-500 border-t pt-2">
            <p>Available disembark positions: {disembarkPositions.length}</p>
            <p>Vehicle team: {vehicle.team}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
