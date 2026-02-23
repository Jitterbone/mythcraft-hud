# Mythcraft HUD Module

A modular, persistent contextual HUD for the Mythcraft system in Foundry VTT. Provides quick access to weapons, spells, features, skills, and saves directly from the hotbar.

## Features

- **Persistent HUD** - Stays attached to the hotbar above the main UI
- **Resource Tracking** - Display and track HP, AP (Action Points), and SP (Spell Points)
- **Quick Actions** - One-click access to:
  - Weapons (with AP cost calculation)
  - Spells (with SP cost deduction)
  - Features/Talents (PC and NPC specific)
  - Skills (with bonus rollable)
  - Saves (with bonus rollable)
- **Actor Visuals** - Shows selected token's portrait
- **PC vs NPC Support** - Different layouts for player characters and NPCs
- **Resource Auto-Deduction** - Automatically deducts SP when spells are cast
- **Expandable Lists** - Click menu buttons to expand/collapse item lists
- **Dice Tray** - A persistent dice rolling interface at the bottom of the chat log for quick rolls.

## Installation

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
1. Click on any token on the map to control it
2. The HUD will immediately attach and display that actor's information

### Using the HUD
- **Resource Display** (Left) - Shows current HP/AP/SP values
- **Menu Buttons** (Center) - Click to expand/collapse:
  - Fist icon: Weapons
  - Star icon: Spells
  - Book icon: Features
  - Dice icon: Skills
  - Shield icon: Saves
- **Portrait** (Right) - Current actor's token image

### Expanding Lists
Click any menu button to show the corresponding item list above the hotbar. Click the same button again to collapse it.

### Rolling Actions
- **Weapons**: Click weapon → rolls attack with AP deduction check
- **Spells**: Click spell → rolls spell with SP deduction
- **Features**: Click feature → uses the item's standard roll
- **Skills**: Click skill → rolls 1d20 + skill bonus
- **Saves**: Click save → rolls 1d20 + save bonus

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
- **Browser**: Modern browsers with ES6 support

## Known Issues & Limitations

- Skills and Saves templates use Handlebars `capitalize` and `gt` helpers - ensure Foundry has these built-in
- Portrait image may not update immediately if changed mid-session (refresh HUD by reselecting token)
- Expansion area scrolls independently; ensure HUD doesn't exceed viewport height

## Future Enhancements

- [ ] Drag-and-drop to hotbar
- [ ] Custom resource configuration per actor
- [ ] Combat round indicator
- [ ] Status effect display
- [ ] Settings panel for customization
- [ ] Condition/state tracking
- [ ] Quick-access macros
- [ ] NPC conversation menu integration

## Support & Contributing

For bugs, feature requests, or questions:
1. Check the module structure documentation above
2. Review the code comments in each file
3. Test with a clean actor and fresh world save

## Publishing New Versions (Automated)

This repository is configured with a GitHub Actions workflow to automate the release process.

### The Release Workflow
1.  **Update Version**: In `module.json`, increment the `version` number. For pre-releases, use a suffix like `-beta`.
    ```json
    "version": "0.8.3-beta"
    ```
2.  **Commit and Push**: Commit the `module.json` change to your `main` branch.
    ```sh
    git commit -m "Prepare release v0.8.3-beta"
    git push origin main
    ```
3.  **Create and Push a Git Tag**: Create a tag that matches the version in `module.json` (prefixed with `v`) and push it to GitHub. This triggers the automation.
    ```sh
    git tag v0.8.3-beta
    git push origin v0.8.3-beta
    ```

The GitHub Action will then automatically build the release, and your manifest URL will work correctly.

#### Troubleshooting a Failed Release
If the GitHub Action fails with an `already_exists` error, you must delete the failed tag from GitHub before retrying.
```sh
git tag -d v0.8.3-beta && git push --delete origin v0.8.3-beta
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
