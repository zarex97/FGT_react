// src/game/systems/ContractUtils.js
// Central contract management system

export const ContractUtils = {
  // Create a contract between master and servant
  establishContract: (master, servant) => {
    if (
      master.contract.contractStatus === "Free" &&
      servant.contract.contractStatus === "Free"
    ) {
      master.contract.contractStatus = "Contracted";
      master.contract.contractedTo = servant.id;

      servant.contract.contractStatus = "Contracted";
      servant.contract.contractedTo = master.id;

      console.log(`📜 Contract established: ${master.name} ⟷ ${servant.name}`);
      return true;
    }
    return false;
  },

  // Break a contract
  breakContract: (master, servant) => {
    if (
      master.contract.contractedTo === servant.id &&
      servant.contract.contractedTo === master.id
    ) {
      master.contract.contractStatus = "Free";
      master.contract.contractedTo = null;

      servant.contract.contractStatus = "Free";
      servant.contract.contractedTo = null;

      console.log(`💔 Contract broken: ${master.name} ⟷ ${servant.name}`);
      return true;
    }
    return false;
  },

  // Check if a servant is within master's zone for NP usage
  isServantInMasterZone: (master, servant, gameState) => {
    if (master.contract.contractedTo !== servant.id) return false;

    const distance =
      Math.abs(master.x - servant.x) + Math.abs(master.y - servant.y);
    return distance <= master.zoneCoverageRange;
  },

  // Check if master can use command seal on target
  canUseCommandSeal: (master, target) => {
    return (
      master.commandSealsRemaining > 0 &&
      master.contract.contractedTo === target.id &&
      master.contract.contractStatus === "Contracted"
    );
  },

  // Check if servant can use Noble Phantasm
  canUseNoblePhantasm: (servant, gameState) => {
    // If servant is not contracted, they cannot use NP
    if (servant.contract.contractStatus !== "Contracted") {
      console.log(
        `❌ ${servant.name} cannot use NP: Not contracted to a Master`
      );
      return false;
    }

    // Find the master this servant is contracted to
    const master = gameState.units.find(
      (unit) =>
        unit.id === servant.contract.contractedTo && unit.class === "Master"
    );

    if (!master) {
      console.log(`❌ ${servant.name} cannot use NP: Master not found`);
      return false;
    }

    // Check if servant is within master's zone
    const distance =
      Math.abs(master.x - servant.x) + Math.abs(master.y - servant.y);
    const inZone = distance <= master.zoneCoverageRange;

    if (!inZone) {
      console.log(
        `❌ ${servant.name} cannot use NP: Outside Master's zone (distance: ${distance}/${master.zoneCoverageRange})`
      );
      return false;
    }

    console.log(`✅ ${servant.name} can use NP: Within Master's zone`);
    return true;
  },
};

export const GameStateContractHelpers = {
  // Get all servants contracted to a specific master
  getContractedServants: (master, gameState) => {
    return gameState.units.filter(
      (unit) =>
        unit.contract.contractedTo === master.id &&
        unit.contract.party === "Servant"
    );
  },

  // Get the master a servant is contracted to
  getContractedMaster: (servant, gameState) => {
    return gameState.units.find(
      (unit) =>
        unit.id === servant.contract.contractedTo &&
        unit.contract.party === "Master"
    );
  },

  // Check if any servants are in master's zone for NP usage
  getServantsInMasterZone: (master, gameState) => {
    const contractedServants = GameStateContractHelpers.getContractedServants(
      master,
      gameState
    );

    return contractedServants.filter((servant) => {
      const distance =
        Math.abs(master.x - servant.x) + Math.abs(master.y - servant.y);
      return distance <= master.zoneCoverageRange;
    });
  },

  // Get all free (uncontracted) units of a specific party type
  getFreeUnits: (gameState, partyType) => {
    return gameState.units.filter(
      (unit) =>
        unit.contract.party === partyType &&
        unit.contract.contractStatus === "Free"
    );
  },

  // Check if a unit can form contracts (Masters and some special Servant classes)
  canFormContracts: (unit) => {
    return (
      unit.contract.party === "Master" ||
      (unit.contract.party === "Servant" && unit.canContractOthers === true)
    );
  },

  // Validate game state contracts (debugging helper)
  validateContracts: (gameState) => {
    const issues = [];

    gameState.units.forEach((unit) => {
      if (
        unit.contract.contractStatus === "Contracted" &&
        unit.contract.contractedTo
      ) {
        const contractedUnit = gameState.units.find(
          (u) => u.id === unit.contract.contractedTo
        );

        if (!contractedUnit) {
          issues.push(
            `${unit.name} is contracted to non-existent unit ${unit.contract.contractedTo}`
          );
        } else if (contractedUnit.contract.contractedTo !== unit.id) {
          issues.push(
            `${unit.name} and ${contractedUnit.name} have mismatched contracts`
          );
        }
      }
    });

    if (issues.length > 0) {
      console.warn("Contract validation issues:", issues);
    }

    return issues;
  },
};
