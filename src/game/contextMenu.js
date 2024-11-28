const ContextMenu = ({ position, unit }) => {
  const isPlayerTurn = gameState.turn === unit.team;
  console.log("isPlayerTurn:", isPlayerTurn);
  console.log("unit.hasAttacked:", unit.hasAttacked);
  console.log("current gameState:", gameState);
  const canUseSkill = (skill) => {
    return skill.isReactionary || unit.canCounter || isPlayerTurn;
  };

  if (!position) return null;

  return (
    <div
      className="fixed bg-white shadow-lg rounded-lg border border-gray-200 z-50 w-48 context-menu"
      style={{ left: position.x, top: position.y }}
    >
      <button
        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                        ${
                          unit.hasAttacked || !isPlayerTurn
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
        onClick={() => handleAction("basic-attack", unit)}
        disabled={unit.hasAttacked || !isPlayerTurn}
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
        onClick={() => {
          setShowOtherActions(true);
          setContextMenu(null);
        }}
      >
        <MoreHorizontal size={16} /> Other Actions
      </button>
      <button
        className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2
                    ${!isPlayerTurn ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => handleAction("move", unit)}
        disabled={!isPlayerTurn}
      >
        <Move size={16} /> Move
      </button>
      <button
        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
        onClick={() => {
          setShowCombatManagement(true);
          setContextMenu(null);
        }}
      >
        <Swords size={16} /> Manage Combat
      </button>
    </div>
  );
};
