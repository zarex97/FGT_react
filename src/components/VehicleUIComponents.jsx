// VehicleUIComponents.jsx - Add these components to your TacticalGame.jsx

import React, { useState } from "react";
import { User, X, CheckCircle, AlertCircle } from "lucide-react";
import { VehicleUtils } from "../game/utils/VehicleUtils";

// Component for managing passengers aboard a vehicle
export const VehiclePassengerManager = ({
  vehicle,
  gameState,
  onClose,
  sendJsonMessage,
}) => {
  const [selectedAction, setSelectedAction] = useState(null); // 'board' or 'disembark'
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [selectedBoardingPosition, setSelectedBoardingPosition] =
    useState(null);
  const [selectedDisembarkPosition, setSelectedDisembarkPosition] =
    useState(null);

  const passengersAboard = VehicleUtils.getUnitsAboard(vehicle, gameState);
  const nearbyUnits = getNearbyUnitsForBoarding(vehicle, gameState);
  const disembarkPositions = VehicleUtils.getDisembarkPositions(
    vehicle,
    gameState
  );

  const handleBoard = () => {
    if (selectedPassenger && selectedBoardingPosition) {
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "BOARD_VEHICLE",
        vehicleId: vehicle.id,
        unitId: selectedPassenger.id,
        relativeX: selectedBoardingPosition.x,
        relativeY: selectedBoardingPosition.y,
      });
      onClose();
    }
  };

  const handleDisembark = () => {
    if (selectedPassenger && selectedDisembarkPosition) {
      sendJsonMessage({
        type: "GAME_ACTION",
        action: "DISEMBARK_VEHICLE",
        vehicleId: vehicle.id,
        unitId: selectedPassenger.id,
        targetX: selectedDisembarkPosition.x,
        targetY: selectedDisembarkPosition.y,
        targetZ: selectedDisembarkPosition.z,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[900px] max-h-[700px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {vehicle.name} - Passenger Management
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel - Actions */}
          <div>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Actions</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedAction("board")}
                  className={`px-4 py-2 rounded ${
                    selectedAction === "board"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200"
                  }`}
                  disabled={
                    nearbyUnits.length === 0 ||
                    passengersAboard.length >= vehicle.maxPassengers
                  }
                >
                  Board Passenger
                </button>
                <button
                  onClick={() => setSelectedAction("disembark")}
                  className={`px-4 py-2 rounded ${
                    selectedAction === "disembark"
                      ? "bg-green-500 text-white"
                      : "bg-gray-200"
                  }`}
                  disabled={passengersAboard.length === 0}
                >
                  Disembark Passenger
                </button>
              </div>
            </div>

            {/* Boarding Interface */}
            {selectedAction === "board" && (
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">Select Unit to Board:</h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {nearbyUnits.map((unit) => (
                      <div
                        key={unit.id}
                        onClick={() => setSelectedPassenger(unit)}
                        className={`p-2 border rounded cursor-pointer ${
                          selectedPassenger?.id === unit.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={unit.sprite}
                            alt={unit.name}
                            className="w-8 h-8"
                          />
                          <span>{unit.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPassenger && (
                  <div>
                    <h5 className="font-semibold mb-2">
                      Select Position on Vehicle:
                    </h5>
                    <VehicleLayoutGrid
                      vehicle={vehicle}
                      occupiedPositions={passengersAboard.map(
                        (p) => p.vehicleRelativePosition
                      )}
                      onPositionSelect={setSelectedBoardingPosition}
                      selectedPosition={selectedBoardingPosition}
                    />
                  </div>
                )}

                <button
                  onClick={handleBoard}
                  disabled={!selectedPassenger || !selectedBoardingPosition}
                  className={`w-full py-2 rounded ${
                    selectedPassenger && selectedBoardingPosition
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Confirm Boarding
                </button>
              </div>
            )}

            {/* Disembarking Interface */}
            {selectedAction === "disembark" && (
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold mb-2">
                    Select Passenger to Disembark:
                  </h5>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {passengersAboard.map((passenger) => (
                      <div
                        key={passenger.id}
                        onClick={() => setSelectedPassenger(passenger)}
                        className={`p-2 border rounded cursor-pointer ${
                          selectedPassenger?.id === passenger.id
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={passenger.sprite}
                            alt={passenger.name}
                            className="w-8 h-8"
                          />
                          <span>{passenger.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPassenger && (
                  <div>
                    <h5 className="font-semibold mb-2">
                      Select Disembark Position:
                    </h5>
                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                      {disembarkPositions.map((pos, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedDisembarkPosition(pos)}
                          className={`p-2 text-xs border rounded ${
                            selectedDisembarkPosition === pos
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          ({pos.x}, {pos.y})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDisembark}
                  disabled={!selectedPassenger || !selectedDisembarkPosition}
                  className={`w-full py-2 rounded ${
                    selectedPassenger && selectedDisembarkPosition
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Confirm Disembark
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Vehicle Status */}
          <div>
            <div className="mb-4">
              <h4 className="text-lg font-semibold mb-2">Vehicle Status</h4>
              <div className="bg-gray-50 p-3 rounded">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Size: {vehicle.dimensions.width}×{vehicle.dimensions.height}
                  </div>
                  <div>Max Passengers: {vehicle.maxPassengers}</div>
                  <div>Current Passengers: {passengersAboard.length}</div>
                  <div>
                    Available Spaces:{" "}
                    {vehicle.maxPassengers - passengersAboard.length}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">Current Passengers</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {passengersAboard.length === 0 ? (
                  <p className="text-gray-500 italic">No passengers aboard</p>
                ) : (
                  passengersAboard.map((passenger) => (
                    <div
                      key={passenger.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                    >
                      <img
                        src={passenger.sprite}
                        alt={passenger.name}
                        className="w-8 h-8"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{passenger.name}</div>
                        <div className="text-xs text-gray-600">
                          Position: ({passenger.vehicleRelativePosition?.x},{" "}
                          {passenger.vehicleRelativePosition?.y})
                        </div>
                      </div>
                      <div className="text-xs text-green-600">
                        <CheckCircle size={16} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for visualizing vehicle interior layout
const VehicleLayoutGrid = ({
  vehicle,
  occupiedPositions,
  onPositionSelect,
  selectedPosition,
}) => {
  const { dimensions, passengerLayout } = vehicle;

  return (
    <div className="inline-block border-2 border-gray-300 p-2 bg-gray-50">
      {Array.from({ length: dimensions.height }).map((_, y) => (
        <div key={y} className="flex">
          {Array.from({ length: dimensions.width }).map((_, x) => {
            const canPlace = passengerLayout ? passengerLayout[y][x] : true;
            const isOccupied = occupiedPositions.some(
              (pos) => pos?.x === x && pos?.y === y
            );
            const isSelected =
              selectedPosition?.x === x && selectedPosition?.y === y;

            return (
              <div
                key={`${x}-${y}`}
                onClick={() =>
                  canPlace && !isOccupied && onPositionSelect({ x, y })
                }
                className={`w-8 h-8 border border-gray-400 flex items-center justify-center text-xs cursor-pointer ${
                  !canPlace
                    ? "bg-gray-800 cursor-not-allowed"
                    : isOccupied
                    ? "bg-red-200 cursor-not-allowed"
                    : isSelected
                    ? "bg-blue-300"
                    : "bg-white hover:bg-gray-100"
                }`}
                title={
                  !canPlace
                    ? "Equipment/Engine area"
                    : isOccupied
                    ? "Occupied"
                    : `Position (${x}, ${y})`
                }
              >
                {!canPlace ? "■" : isOccupied ? <User size={12} /> : ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Helper function to find units near a vehicle for boarding
const getNearbyUnitsForBoarding = (vehicle, gameState) => {
  const nearbyUnits = [];
  const disembarkPositions = VehicleUtils.getDisembarkPositions(
    vehicle,
    gameState
  );

  gameState.units.forEach((unit) => {
    if (!unit.isVehicle && !unit.aboardVehicle && unit.team === vehicle.team) {
      // Check if unit is adjacent to vehicle or at a disembark position
      const isNearby = disembarkPositions.some(
        (pos) => unit.x === pos.x && unit.y === pos.y && unit.z === pos.z
      );

      if (isNearby) {
        nearbyUnits.push(unit);
      }
    }
  });

  return nearbyUnits;
};

// Component for vehicle inspection (like unit profile)
export const VehicleInspector = ({ vehicle, gameState, onClose }) => {
  const [activeTab, setActiveTab] = useState("status");
  const passengersAboard = VehicleUtils.getUnitsAboard(vehicle, gameState);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[800px] h-[600px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{vehicle.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {["status", "passengers", "layout", "skills"].map((tab) => (
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
          {activeTab === "status" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 border rounded">
                  <span className="font-bold">HP:</span> {vehicle.hp}/
                  {vehicle.maxHp}
                </div>
                <div className="p-2 border rounded">
                  <span className="font-bold">Defense:</span> {vehicle.baseDef}
                </div>
                <div className="p-2 border rounded">
                  <span className="font-bold">Movement:</span>{" "}
                  {vehicle.movementLeft}/{vehicle.baseMovementRange}
                </div>
                <div className="p-2 border rounded">
                  <span className="font-bold">Size:</span>{" "}
                  {vehicle.dimensions.width}×{vehicle.dimensions.height}
                </div>
                <div className="p-2 border rounded">
                  <span className="font-bold">Type:</span> {vehicle.vehicleType}
                </div>
                <div className="p-2 border rounded">
                  <span className="font-bold">Armor:</span> {vehicle.armorType}
                </div>
              </div>
            </div>
          )}

          {activeTab === "passengers" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Passengers ({passengersAboard.length}/{vehicle.maxPassengers})
                </h3>
              </div>

              {passengersAboard.length === 0 ? (
                <p className="text-gray-500 italic">No passengers aboard</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {passengersAboard.map((passenger) => (
                    <div
                      key={passenger.id}
                      className="p-3 border rounded flex items-center gap-3"
                    >
                      <img
                        src={passenger.sprite}
                        alt={passenger.name}
                        className="w-12 h-12"
                      />
                      <div>
                        <div className="font-medium">{passenger.name}</div>
                        <div className="text-sm text-gray-600">
                          HP: {passenger.hp}/{passenger.maxHp}
                        </div>
                        <div className="text-xs text-gray-500">
                          Pos: ({passenger.vehicleRelativePosition?.x},{" "}
                          {passenger.vehicleRelativePosition?.y})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "layout" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vehicle Layout</h3>
              <div className="flex justify-center">
                <VehicleLayoutGrid
                  vehicle={vehicle}
                  occupiedPositions={passengersAboard.map(
                    (p) => p.vehicleRelativePosition
                  )}
                  onPositionSelect={() => {}} // Read-only in inspector
                  selectedPosition={null}
                />
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border border-gray-400"></div>
                  <span>Available passenger space</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 border border-gray-400"></div>
                  <span>Occupied passenger space</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-800 border border-gray-400"></div>
                  <span>Equipment/Engine area</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "skills" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vehicle Abilities</h3>
              {vehicle.skills?.length > 0 ? (
                vehicle.skills.map((skill, index) => (
                  <div key={index} className="p-4 border rounded">
                    <h4 className="font-bold text-lg">{skill.name}</h4>
                    <div className="text-sm text-gray-600 mt-2">
                      {skill.description}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No special abilities</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default { VehiclePassengerManager, VehicleInspector };
