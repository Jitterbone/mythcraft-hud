# MythCraft HUD Module (v1.0.1) 🐲

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?style=flat&logo=kofi&logoColor=white)](https://ko-fi.com/jitterbone)

A modular, persistent, and highly-integrated contextual HUD for the **MythCraft** system in Foundry VTT. This module replaces the default hotbar with a dynamic interface that provides immediate access to your character's most important actions and information.

> 💡 **Sister Module Recommendation**:
> For a completely automated and enhanced MythCraft experience, pair this HUD with the [MythCraft Essence Sheet](https://foundryvtt.com/packages/mythcraft-essence-sheet) module!

## ✨ Features

-   **🛡️ Persistent & Contextual HUD**: A clean, modern interface that stays docked to your screen and automatically updates to the currently selected token.
-   **📊 Real-Time Resource Tracking**: Always know your `HP`, `AP` (Action Points), and `SP` (Spell Points) at a glance.
-   **⚡ Quick Action Menus**: Expandable menus give you one-click access to:
    -   ⚔️ **Weapons**: With automatic AP cost calculation and warnings.
    -   🔮 **Spells**: With automatic SP deduction and 1-click damage/healing buttons.
    -   🌟 **Features & Talents**: For both PCs and NPCs.
    -   🎲 **Skills & Saves**: Quick, rollable buttons for every skill and save.
-   **👤 Actor-Aware Interface**:
    -   Shows the selected token's portrait.
    -   Provides a **GM Character Switcher** to quickly swap between player characters.
    -   Displays a token's current AP on the canvas during combat.
-   **🎨 Unified Chat Cards & Animated Rolls**: All rolls from the HUD or character sheet are intercepted and reformatted into animated slot-machine style chat cards with 1-click damage and healing applications.
-   **🤖 Complete Combat Automations**:
    -   **Movement AP Tracking**: Token movement in combat automatically tracks strides and consumes AP according to character speed.
    -   **Sheet Attack & Action AP**: Rolling attacks or actions directly from the character sheet automatically deducts item APC during combat.
    -   **Automatic Spell SP Deduction**: Casting spells from the HUD or sheet deducts SP in or out of combat.
    -   **Resource Limit Enforcement**: Optional settings to prevent players from taking actions, casting spells, or moving tokens if they lack sufficient AP/SP (GMs exempt).
    -   **End-of-Combat AP Restoration**: Automatically restores all player character AP when combat concludes.
    -   **Tactical Modifiers & Automatic Crits**: Tactical dialog to add advantage, disadvantage, or extra damage dice before rolling.
    -   **Multiattack Parsing**: Intelligently reads NPC multiattack descriptions and injects clickable action buttons directly into the chat card.
-   **⚙️ Theming & Configuration**:
    -   Adjust HUD scale to fit your screen (`Small`, `Medium`, `Large`, `Extra Large`).
    -   Configure roll animation durations and toggle dice sounds.
    -   Fully modular automation settings (`Automatic`, `Prompt Confirmation`, `Disabled`).
-   **🛌 Rest Integration**: A dedicated menu to handle the system's `Breath`, `Recoup`, and `Rest` actions, automatically applying their effects.

## 🚀 Installation

### Manifest URL (Recommended)
1. In the Foundry VTT setup screen, go to the "Add-on Modules" tab.
2. Click "Install Module".
3. Paste the following URL into the "Manifest URL" field and click "Install":
   ```
   https://github.com/Jitterbone/mythcraft-hud/releases/latest/download/module.json
   ```

### Manual Installation
1. Download the `module.zip` file from the latest GitHub Release.
2. Unzip the file into your Foundry VTT `Data/modules` directory.

### Activation
1. In your game world, go to "Game Settings" -> "Manage Modules".
2. Find "MythCraft HUD" in the list and check the box to enable it.
3. Save your module settings and the world will reload.

## MythCraft Data Path Compatibility

The module is built specifically for the **MythCraft** system and uses these data paths:

### Actor Data
- `system.hp` - Hit Points (value, max)
- `system.ap` - Action Points (value, max)
- `system.sp` - Spell Points (value, max)
- `system.attributes` - Ability scores (str, dex, con, int, wis, cha)
- `system.skills` - Skills object with bonuses
- `system.saves` - Saves object with bonuses

### Item Types
- **weapon** - Melee/ranged weapons with AP costs
- **spell** - Spellcasting abilities consuming SP
- **talent** - Character talents (PC only)
- **feature** - Racial, class, or special abilities
- **background** - Background features
- **lineage** - Lineage/ancestry features
- **profession** - Profession-based abilities

### Item System Data
- `system.apcFormula` - AP cost calculation formula (supports @attribute references)
- `system.spc` - Spell Point cost
- `system.attr` - Primary attribute for attack (str, dex, int, wis, etc.)
- `system.damage.formula` - Damage roll formula
- `system.damage.type` - Damage type (sharp, blunt, cold, fire, etc.)
- `system.description.value` - Item description (HTML)

## Usage

### Selecting a Token
Click on any token on the map to control it. The HUD will immediately update to display that actor's information and actions.

### Using the HUD
- **Actor Card**: Shows the character's portrait and real-time resource bars (HP, AP, SP).
- **Attribute & Defense Bar**: Rollable attribute checks and quick view of defenses. Hover over an attribute to see and roll associated skills.
- **Action Menus**: Click the icons (⚔️, 🔮, 🌟) to expand a list of available actions. Click the same icon again to collapse it.

### Rolling Actions
Simply click on any weapon, spell, feature, skill, or save in the HUD to perform the action. The module will handle the roll, resource costs, and post a formatted card to chat.

For weapon attacks, a **Tactical Modifiers** dialog will appear, allowing you to add situational bonuses, spend AP to reduce costs, or include extra damage dice with specific damage types before you roll.

## Compatibility

- **System**: MythCraft v0.6.4+
- **Foundry VTT**: v13+ / v14
- **Dice So Nice!**: Supported for 3D dice rolls (optional).

## Support & Contributing

If you encounter a bug, have a feature request, or would like to support ongoing development:
- 🐛 **GitHub Issues**: [Open an issue on GitHub](https://github.com/Jitterbone/mythcraft-hud/issues)
- ☕ **Ko-fi**: [Support development on Ko-fi](https://ko-fi.com/jitterbone)

---

## ⚖️ Legal & Attribution

This work is based on The MythCraft System by QuasiReal Publishing LLC and published using the Creative Commons Attribution 3.0 Unported license ([http://creativecommons.org/licenses/by/3.0/](http://creativecommons.org/licenses/by/3.0/)).