export const UnitUtils = {
    createStatusSnapshot(unit) {
        // This will create a deep copy of the entire unit
        return JSON.parse(JSON.stringify(unit));
    },

    saveStatusIfHit(unit) {
        unit.statusIfHit = this.createStatusSnapshot(unit);
    },

    backupCurrentStatus(unit) {
        unit.backUpStatus = this.createStatusSnapshot(unit);
    },

    restoreFromBackup(unit) {
        if (unit.backUpStatus) {
            // Restore everything except references that should remain constant
            const preservedRefs = {
                id: unit.id,
                sprite: unit.sprite,
                skills: unit.skills,
                noblePhantasms: unit.noblePhantasms,
                reactions: unit.reactions
            };

            Object.assign(unit, unit.backUpStatus, preservedRefs);
        }
    }
};