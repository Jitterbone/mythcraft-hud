# Mythcraft HUD Module (0.9.4-beta) 🐲

A modular, persistent, and highly-integrated contextual HUD for the **Mythcraft** system in Foundry VTT. This module replaces the default hotbar with a dynamic interface that provides immediate access to your character's most important actions and information.

## ✨ Features

-   **🛡️ Persistent & Contextual HUD**: A clean, modern interface that stays docked to your screen and automatically updates to the currently selected token.
-   **📊 Real-Time Resource Tracking**: Always know your `HP`, `AP` (Action Points), and `SP` (Spell Points) at a glance.
-   **⚡ Quick Action Menus**: Expandable menus give you one-click access to:
    -   ⚔️ **Weapons**: With automatic AP cost calculation and warnings.
    -   🔮 **Spells**: With automatic SP deduction and a handy refund button.
    -   🌟 **Features & Talents**: For both PCs and NPCs.
    -   🎲 **Skills & Saves**: Quick, rollable buttons for every skill and save.
-   **👤 Actor-Aware Interface**:
    -   Shows the selected token's portrait.
    -   Provides a **GM Character Switcher** to quickly swap between player characters.
    -   Displays a token's current AP on the canvas during combat.
-   **🎨 Unified Chat Cards**: All rolls from the HUD or character sheet are intercepted and reformatted into beautiful, easy-to-read chat cards. No more plain white system messages!
-   **🤖 Smart Action Processing**:
    -   **Attack Modifiers**: A tactical dialog to add advantage, disadvantage, or extra damage to your attacks.
    -   **Automatic Crits**: Automatically calculates critical damage for weapon attacks.
    -   **Multiattack Parsing**: Intelligently reads NPC multiattack descriptions and injects clickable action buttons directly into the chat card.
-   **⚙️ Configuration**:
    -   Adjust the HUD scale to fit your screen.
    -   Disable dice roll sounds for a quieter experience.
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
2. Find "Mythcraft HUD" in the list and check the box to enable it.
3. Save your module settings and the world will reload.

## Module Structure

```
mythcraft-hud/
├── module.json              # Module metadata and configuration
├── README.md               # This file
├── scripts/
│   ├── main.js             # Entry point, hook handlers
│   ├── app/
│   │   └── MythcraftHUD.js # Main HUD application class
│   ├── actions/
│   │   └── ActionHandler.js # Handles weapon/spell/feature execution
│   └── data/
│       └── DataScraper.js  # Collects and categorizes actor items
├── styles/
│   └── myth-hud.css        # HUD styling and layout
└── templates/
    ├── hud-base.hbs        # Main HUD bar template
    ├── list-weapons.hbs    # Weapons list template
    ├── list-spells.hbs     # Spells list template
    ├── list-features.hbs   # Features/talents/actions list
    ├── list-skills.hbs     # Skills list template
    └── list-saves.hbs      # Saves list template
```

## Mythcraft Data Path Compatibility

The module is built specifically for the **Mythcraft** system and uses these data paths:

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
- `system.damage.type` - Damage type (fire, cold, etc.)
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

For weapon attacks, a **Tactical Modifiers** dialog will appear, allowing you to add situational bonuses, spend AP to reduce costs, or include extra damage dice before you roll.

## Developer Information

### Adding New Menu Buttons

Edit `hud-base.hbs` to add new buttons in the `.hud-action-btns` section:
```handlebars
<button class="hud-menu-btn" data-type="yourtype" title="Your Type">
    <i class="fas fa-your-icon"></i>
</button>
```

Then create corresponding template: `list-yourtype.hbs`

### Customizing Resources

Edit `MythcraftHUD.js` `getData()` method to add custom resource tracking:
```javascript
customResource: system.customResource || { value: 0, max: 0 },
```

Then display in `hud-base.hbs`:
```handlebars
<div class="hud-row">
    <span class="hud-label">Custom</span>
    <span class="hud-val">{{customResource.value}} / {{customResource.max}}</span>
</div>
```

### Extending ActionHandler

Add new action methods to `ActionHandler.js`:
```javascript
static async executeCustomAction(itemId, actor) {
    const item = actor.items.get(itemId);
    // Custom logic here
    await item.roll();
}
```

## Compatibility

- **System**: Mythcraft v0.6.4+
- **Foundry VTT**: v13+
- **Dependencies**: Integrates with Dice So Nice! for 3D dice, but it is not required.

## Known Issues & Limitations

- Skills and Saves templates use Handlebars `capitalize` and `gt` helpers - ensure Foundry has these built-in
- Portrait image may not update immediately if changed mid-session (refresh HUD by reselecting token)
- Expansion area scrolls independently; ensure HUD doesn't exceed viewport height

## Future Enhancements

- [ ] Combat round indicator
- [ ] Automated Mythcraft condition handling
- [ ] Status effect display
- [ ] Building out settings panel for advanced customization
- [ ] Condition/state tracking

## Support & Contributing

If you encounter a bug or have a feature request, please open an issue on GitHub.

If you enjoy using this module and would like to show your support, you can:

<a href="https://ko-fi.com/jitterbone" target="_blank">[!ko-fi](https://ko-fi.com/jitterbone)</a>
