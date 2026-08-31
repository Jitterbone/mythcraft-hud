# MythCraft HUD Module (v1.0.3) 🐲

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-FF5E5B?style=flat&logo=kofi&logoColor=white)](https://ko-fi.com/jitterbone)

A visual overhaul and contextual heads-up display for the **MythCraft** system in Foundry VTT. Designed for groups who prefer a traditional, pen-and-paper style of playing, MythCraft HUD enhances your table's visuals, quick-action access, and dice rolling experience without intrusive background resource tracking or automated restrictions.

> 💡 **Sister Module Recommendation**:
> For a completely automated and enhanced MythCraft experience (including automatic AP turn resets, reactive AP carryover, movement AP stride enforcement, spell SP consumption, and condition lifecycle rules), pair this HUD with the [MythCraft Essence Sheet](https://foundryvtt.com/packages/mythcraft-essence-sheet) module!

---

## ✨ Features

- **🛡️ Persistent & Contextual HUD**: A clean, modern interface that stays docked to your screen and automatically updates to the currently selected token.
- **📊 Real-Time Resource Tracking**: View your character's `HP`, `AP` (Action Points), `SP` (Spell Points), and `LP` (Luck Points) at a glance.
- **⚡ Quick Action Menus**: Expandable drawers giving you one-click access to:
  - ⚔️ **Weapons & Attacks**: Quick-roll weapon attacks with an optional tactical modifier dialog (Advantage, Disadvantage, situational bonus dice).
  - 🔮 **Spells**: View and cast prepared spells with formatted descriptions and 1-click damage/healing buttons.
  - 🌟 **Features & Talents**: Quick references and rollable features for both PCs and NPCs.
  - 🎲 **Skills & Saves**: Quick, rollable buttons for every attribute check, skill, and saving throw.
- **👤 Actor-Aware Interface**:
  - Displays token portrait and current health/resource bars.
  - **GM Character Switcher**: Allows GMs to instantly switch active views between player characters.
  - **Token Canvas AP Display**: Visual AP badges over active combatants on the map.
  - **Radial Condition Rings**: Clean, rotating condition icons rendered around tokens in PIXI.
- **🎨 Slot-Machine Roll Animations & Theming**:
  - Replaces default roll templates with suspenseful animated dice roll cards.
  - Full adherence to Public, Private GM, Blind GM, and Self Roll modes.
  - Optional integration with **Dice So Nice!** 3D dice.
- **⚙️ Visual Theming & Customization**:
  - Adjust HUD scale to fit your screen (`Small`, `Medium`, `Large`, `Extra Large`).
  - Configure roll animation duration and toggle dice audio effects.
  - Toggle custom chat card styles or custom attributes (such as SAN / Sanity).

---

## 🚀 Installation

### Manifest URL (Recommended)
1. In the Foundry VTT setup screen, go to the **Add-on Modules** tab.
2. Click **Install Module**.
3. Paste the following URL into the **Manifest URL** field and click **Install**:
   ```
   https://github.com/Jitterbone/mythcraft-hud/releases/latest/download/module.json
   ```

### Manual Installation
1. Download the `module.zip` file from the latest GitHub Release.
2. Unzip the archive into your Foundry VTT `Data/modules` directory.

### Activation
1. In your game world, navigate to **Game Settings** $\rightarrow$ **Manage Modules**.
2. Enable **MythCraft HUD**.
3. Save your module settings to reload.

---

## Usage

### Selecting a Token
Click on any controlled token on the canvas. The HUD will immediately update to display that actor's stats, resources, and action drawers.

### Using the HUD
- **Actor Card**: Shows character portrait, defenses, and current HP/AP/SP/LP.
- **Attribute & Defense Bar**: Click any attribute to roll a check or hover to expand associated skills.
- **Action Drawers**: Click the category icons (⚔️, 🔮, 🌟) to expand actions. Click again to collapse.
- **Rolling Actions**: Click any item to post a rich chat card or trigger a roll.

---

## Compatibility

- **System**: MythCraft v0.6.4+
- **Foundry VTT**: v13+ / v14
- **Dice So Nice!**: Supported for 3D dice rolling.
- **MythCraft Essence Sheet**: Fully compatible and recommended for complete rules automation!

---

## Support & Contributing

If you encounter a bug or have a suggestion:
- 🐛 **GitHub Issues**: [Open an issue on GitHub](https://github.com/Jitterbone/mythcraft-hud/issues)
- ☕ **Ko-fi**: [Support development on Ko-fi](https://ko-fi.com/jitterbone)

---

## ⚖️ Legal & Attribution

This work is based on The MythCraft System by QuasiReal Publishing LLC and published using the Creative Commons Attribution 3.0 Unported license ([http://creativecommons.org/licenses/by/3.0/](http://creativecommons.org/licenses/by/3.0/)).