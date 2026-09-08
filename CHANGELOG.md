# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.4] - 2026-09-08

### Fixed
- **Roll Privacy & Mode Enforcement**: Fixed an issue where weapon attacks and actions rolled from the HUD only displayed to the rolling player or did not strictly follow the active roll mode. Implemented `getActiveRollMode` and `getMessageModeKey` resolvers that respect live chat input mode buttons and core settings (`publicroll`, `gmroll`, `blindroll`, `selfroll`).
- **Damage Buttons & Spell Privacy**: 1-click damage roll buttons, chat cards, and d20 dice animations triggered from the HUD now strictly propagate and respect active user and GM roll privacy.

## [1.0.3] - 2026-08-31

### Changed
- **Visual Overhaul Architecture**: Refocused MythCraft HUD as a pure visual overlay and pen-and-paper friendly UI tool for the MythCraft System.
- **Removed Automated Constraints**: Stripped intrusive background AP/SP resource deductions, movement distance restrictions, and condition lifecycle automations from the HUD to support freeform pen-and-paper gameplay.
- **Essence Sheet Integration**: Fully harmonized with the `mythcraft-essence-sheet` module as the single source for all system automation, condition engines, and resource management.

## [1.0.2] - 2026-08-30

### Fixed
- **Slowed Condition Movement Key**: Corrected ActiveEffect target key to `system.movement.walk` (fixing a crash caused by the legacy `system.movement.speed.value` path).
- **Core Condition Identifiers**: Aligned condition IDs with the MythCraft system core model: `partialCover`, `totalCover`, `completeSurprise`, and `partialSurprise` (with aliases preserved for backward compatibility).

## [1.0.1] - 2026-08-23

### Added
- **Combat Movement AP Automation**: Moving tokens during active combat automatically tracks movement strides and deducts AP based on character speed (`auto`, `prompt`, `disabled`).
- **Sheet Attack & Action AP Deduction**: Attack rolls and item actions taken from character sheets automatically evaluate the item's APC and deduct AP during combat (`auto`, `prompt`, `disabled`).
- **Automatic Spell SP Deduction**: Casting spells from the HUD or sheet automatically calculates and deducts SP in or out of combat (`auto`, `prompt`, `disabled`).
- **Enforce AP & SP Limits**: Added dedicated automation settings (`enforceAP`, `enforceSP`) to prevent player characters from taking actions, casting spells, or moving tokens without sufficient resources (GMs are fully exempt).
- **1-Click Spell Damage & Healing**: Automatically scrapes damage and healing formulas directly from spell descriptions, rendering 1-click roll buttons on spell chat cards with slot animations and "APPLY DAMAGE/HEALING" buttons.
- **End-of-Combat AP Restoration**: Automatically restores all player character AP to their full maximum when combat ends.
- **Settings Category Headers**: Organized module settings into clean, dedicated `🎨 Theming` and `🤖 Automations` subcategories.

### Fixed
- **Non-Attack Spell Interception**: Spells that do not call for a magic attack roll no longer roll a default d20, cleanly outputting a formatted spell card with full description and resource costs.
- **Spell Description Post Exemption**: Differentiated between casting a spell and posting its description to chat from the sheet so description posts never consume SP or trigger limit errors.
- **Forward-Only Initiative AP**: Prevented reactive AP from triggering when combat initiative moves backward in the turn tracker.
- **Canvas Token Guard**: Guarded canvas token lookups during early chat batch rendering to prevent errors before canvas initialization.

## [1.0.0] - 2026-08-21

### Added
- **Apply Damage & Healing to Selected Tokens**: Integrated an "APPLY DAMAGE" (and "APPLY HEALING") action directly on chat cards that applies the evaluated total to all selected canvas tokens with automatic HP bounds checking.
- **Specific Damage Types**: Fully integrated typed damage support (Sharp, Blunt, Cold, Fire, Corrosive, Lightning, Toxic, Necrotic, Psychic, Radiant, Sonic). Damage buttons, chat card headers, and notifications clearly display and apply the specific damage type.
- **Tactical Modifiers Extra Damage**: Weapon attacks configured with extra damage dice with distinct types now generate dedicated roll buttons for each damage type (e.g. `ROLL SHARP DAMAGE` and `ROLL COLD DAMAGE`).
- **Modifier Source Breakdown**: Expanding any animated chat roll card displays the complete source of each modifier (Attribute mod, Tactical Advantage, Tactical Disadvantage, item bonuses, etc.), along with Total Modifier and Final Total rows.
- **Foundry Roll Mode & Privacy Compliance**: Full adherence to Public, Private GM, Blind GM (`???` masked for non-GM players), and Self Roll modes across dice animations, whispers, 3D dice (`Dice So Nice!`), and apply buttons.

### Changed
- **Documentation**: Streamlined and cleaned `README.md` for end-users and Game Masters.
- **Foundry Compatibility**: Validated for Foundry VTT v13+ and v14 schemas.

## [0.9.9-hotfix] - 2024-08-01

### Fixed
- **Roll Animation**: Correctly display negative attribute modifiers in the roll animation. The bonus pill will now appear red and show a minus sign (e.g., `-1`) for negative values, and green with a plus sign for positive values.

## [0.9.9.1-beta] - 2024-07-31

### Fixed
- **Sheet Rolls**: Correctly trigger the modifier count-up animation for rolls made from the character sheet, ensuring visual consistency with rolls made from the HUD.
- **Chat Card Clarity**: Removed redundant labels from chat cards and improved the title format for skill rolls to be more descriptive (e.g., `DEX Check (Stealth)`).
- **Luck Points**: Correctly display Luck Points (`lp.value`) in the HUD instead of the Luck attribute modifier.

## [0.9.9-beta] - 2026-07-30

### Fixed
- Preserve animated slot UI on refresh while preventing auto-roll replay for old chat cards.
- Wrap animated dice results into a compact 5-column layout for large rolls.
- Restrict hotbar condition listing to currently active conditions only.
- Show on-token AP text only during active combat with initiative.

## [0.9.8.1-beta] - 2024-06-09

### Fixed
- **AP Display**: Corrected an issue where the on-token AP display would not appear for player characters who were not in combat. The AP text will now correctly show for any controlled player token, regardless of combat state, and hide for NPCs.

## [0.9.8-beta] - 2024-06-08

### Added
- **NPC Combat Routine UI**: Completely overhauled the presentation of NPC Multiattack and tiered actions. Passives now display cleanly at the top of the menu, while Multiattack descriptions, Tier 1 Actions, Tier 2 Actions, and Reactions are elegantly contained within a distinct, stylized "Combat Routine" box.
- Improved HTML decoding for NPC feature descriptions to properly render entity tags from Foundry JSON exports.

## [0.9.7] - 2024-06-07

### Added
- General stability improvements and version bump for 0.9.7.

## [0.9.6-beta-hotfix] - 2024-06-06

### Fixed
- **UI Formatting**: Adjusted the background colors and opacity for the Token HUD conditions grid and tooltip to match Foundry VTT's default translucent style.

## [0.9.6-beta] - 2024-06-05

### Fixed
- **UI Formatting**: Fixed the layout and CSS of the "Conditions" menu button so it dynamically resizes for text without breaking the rigid hotbar sizing constraints.
- **Condition Application**: Fixed a race condition where the "Bloodied" condition would fail to auto-apply by shifting the evaluation to the much safer `updateActor` hook.

## [0.9.5-beta] - 2026-03-09

### Fixed
- Fixed a bug that could cause the error `TypeError: Cannot read properties of undefined (reading 'actor')` during an `updateActor` hook, which was related to conflicts with other modules during chat message creation.
- Fixed a compatibility error with Foundry VTT v12+ (`getProperty is not a function`) that occurred when clicking on tokens.

### Changed
- **Performance:** Significantly improved performance and stability by removing fragile monkey-patching of core Foundry VTT functions (`ChatMessage.create`, `Actor.prototype.roll*`). The module now uses modern, standard hooks for chat message processing, reducing the risk of module conflicts.
- Removed verbose console logs to reduce console bloat and potential performance impact.

## [0.9.4-beta] - 2024-05-29

### Changed
- **AP Token Display**: Re-enabled the on-token AP display that appears above character tokens during combat. The logic has also been improved to be more reliable when combat turns change or when combat ends.

### Removed
- **Hit/Miss Notifier**: Removed the automatic Hit/Miss calculation and display when targeting an actor to streamline combat rolls. The associated "Hide Hit/Miss Info" setting has also been removed.

## [0.9.3-beta-1] - 2024-05-29

### Changed
- **Recoup Action**: Reworked the `Recoup` action to precisely follow system rules. The action is always available, but HP gain is now conditional on the character being "Bloodied" (at or below 50% HP). The logic correctly calculates HP restored (up to 1/4 max HP, capped at the Bloodied threshold), removes one Death Point, and incorporates the effects of "Catch your Breath".

## [0.9.3-beta] - 2024-05-29

### Fixed
- **Skill Mapping**: Completely overhauled the skill-to-attribute mapping logic. The HUD now uses a comprehensive fallback map based on the official Mythcraft SRD to correctly categorize all skills, even when attribute data is missing from the character sheet. Uncategorized skills will now appear in a dedicated 'UNC' group, ensuring no skill is ever hidden.

### Changed
- **Skill Labels**: Improved skill label generation to correctly format camelCase keys (e.g., `sleightOfHand`) into readable names (`Sleight Of Hand`).

## [0.9.2-hotfix-1] - 2024-05-28

### Fixed
- **Dice So Nice! Integration**: Resolved an issue that caused two sets of 3D dice to appear for a single roll. The roll processing logic has been corrected to prevent duplicate dice animations.
- **Dice Roll Privacy**: Ensured that public rolls are visible to all players, while private rolls are correctly whispered, respecting the user's dice privacy settings.
- **Spell AP Cost**: Fixed a bug where the Action Point (AP) cost for spells was not being calculated or displayed correctly in the spell list.

### Changed
- **Dice So Nice! Dependency**: The integration with "Dice So Nice!" is now optional. The module will no longer require it to be installed and will function correctly (without 3D dice) if it is not present.

## [0.9.2-hotfix] - 2024-05-28

### Added
- **Dice So Nice! Integration**: Added a delay to chat card creation to wait for 3D dice animations to complete. This prevents the chat message from appearing before the dice have finished rolling, improving the visual flow of actions.

### Fixed
- **UI Contrast**: Improved the readability of the "Roll Attack" button in the Tactical Modifiers dialog by giving it a solid, dark background for better text contrast.

## [0.9.2-beta] - 2024-05-27

### Fixed
- **Foundry v13 Compatibility**: Fixed a critical error (`HandlebarsApplicationMixin is not a function`) that prevented the HUD from loading on Foundry VTT v13. The module has been updated to use the modern `HandlebarsApplication` class.

## [0.9.1-beta] - 2024-05-26

### Fixed
- **Module Installation**: Corrected the `module.json` file to include a valid `download` URL, enabling seamless installation and updates from within Foundry VTT.

## [0.9.0-beta] - 2024-05-25

### Fixed
- **Duplicate Dice Rolls**: Resolved an issue where rolling attributes, skills, or saves directly from the character sheet would cause two sets of 3D dice to appear. The roll is now correctly processed only once by unifying all sheet rolls through a single, robust chat message interception pipeline.

### Changed
- **Code Refactor**: Simplified sheet roll interception logic by removing a redundant `preCreateChatMessage` hook and streamlining the `patchSystemRoll` function. This improves stability and maintainability.
- **Documentation**: Completely revamped the `README.md` with a comprehensive feature list, clearer instructions, and an improved visual layout to better showcase the module's capabilities.

## [0.8.3-beta] - 2024-05-24

### Fixed
- **Blind Roll Privacy**: Ensured that "Blind GM Rolls" are now completely hidden from the player who made the roll, preserving the custom chat card UI for the GM.
- **Hit/Miss Privacy**: Corrected the "Hide Hit/Miss Info from Players" setting by implementing a robust, multi-layered solution using both CSS and a `renderChatMessage` hook to reliably hide GM-only information from players.
- **UI Consistency**: Prevented blind rolls from losing their custom UI styling, ensuring a consistent look and feel for all chat cards visible to the GM.

## [0.8.2-beta] - 2024-05-24

### Added
- **Persistent HUD**: A modular HUD that docks above the hotbar, providing quick access to character actions.
- **Resource Tracking**: Displays HP, AP, and SP for the selected actor in real-time.
- **Quick Action Menus**: Expandable menus for Weapons, Spells, Features, Skills, and Saves.
- **GM Character Switcher**: Allows GMs to quickly switch the HUD's focus between different player characters.
- **Custom Chat Cards**: All rolls made through the HUD or character sheet are formatted into professional, easy-to-read chat cards.
- **AP/SP Cost Handling**: Automatically deducts spell points on cast and provides warnings for AP costs on weapon attacks.
- **Multiattack Processing**: Automatically parses NPC Multiattack actions to inject interactive buttons into the description.
- **Configuration Settings**: Added client settings for adjusting the HUD scale and disabling dice roll sounds.
- **AP Token Indicator**: Displays the current AP of a selected token directly on the canvas when it's in combat.

### Changed
- **Event Handling**: Refactored HUD event listeners to use direct jQuery binding for improved reliability and to fix unresponsive buttons.
- **Hook Registration**: Centralized all Foundry hooks into the `ready` hook for improved stability and to prevent race conditions.
- **Release Workflow**: Implemented a fully automated GitHub Actions workflow for creating versioned releases.

### Fixed
- **Button Interactivity**: Resolved a critical issue where HUD menu buttons would become unresponsive after certain actions.
- **GM Switcher**: Corrected a bug where the GM character switcher buttons were not changing the active actor.
- **File Structure**: Corrected the location and content of the GitHub Actions workflow files.
- **Code Stability**: Repaired corrupted code in `main.js` and moved all hook registrations to the `ready` hook.
