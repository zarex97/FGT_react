- [ ] Complete Character Attributes (Array of Traits, True name, Concealed name, team color, Alignment)
- [ ] Add team color to players
- [ ] Add NP Logic (Should be easy, most of the Skill logic can be copied, same as what I did with Actions)
- [ ] Fix Profile Sheet
- [ ] Add save/load function
  - [ ] Make that every "sendJsonMessage" that is sent to the server causes the game state to be saved in a json file that will have an array of gameStates, up to a limit (e.g:100)

Last Session Short term Goals:
- [ ] Check that handleDoNothing on the combatMenus works as intented
- [ ] We could add a function that asked if the defender wanted to counter, and if not, it would set canCounter to false it would store the combatSent or the combatReceived inside arrays of processed combats (like processedCombatSent and processedCombatReceived). If yes, then the user would counter on their own (we must pust a piece of code that changes canCounter from true to false if it is true at the start of anything, the line code could on using nps, actions and skills, or it could in the microActions themselves)
- [ ] Configurate important common Actions like "Evade"
- [ ] what about special duration for effects, like "3 times, 1 turn", or "For this combat process only", we must implement this.
- [ ] What about effects with triggers - related to passives..
