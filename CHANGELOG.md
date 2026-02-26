# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
