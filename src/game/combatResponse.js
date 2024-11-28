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
