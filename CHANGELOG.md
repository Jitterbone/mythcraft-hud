# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
