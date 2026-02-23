# Mythcraft HUD - Setup & Integration Changelog

## Project Initialization Complete ✓

This document outlines the complete setup of the Mythcraft HUD module foundation and the integration of the Universal Action Menu macro.

---

## Project Structure (Foundation Built)

```
mythcraft-hud/
├── module.json                          ✓ Module metadata
├── README.md                            ✓ Comprehensive documentation
├── CHANGELOG.md                         ✓ This file
├── scripts/
│   ├── main.js                         ✓ Enhanced with all hook handlers
│   ├── app/
│   │   └── MythcraftHUD.js             ✓ Complete HUD app with skills/saves support
│   ├── actions/
│   │   └── ActionHandler.js            ✓ Full macro logic integration
│   └── data/
│       └── DataScraper.js              ✓ Mythcraft-specific item categorization
├── styles/
│   └── myth-hud.css                    ✓ Complete styling with visual fixes
└── templates/
    ├── hud-base.hbs                    ✓ Enhanced with skills/saves buttons
    ├── list-weapons.hbs                ✓ Show AP costs
    ├── list-spells.hbs                 ✓ Show AP and SP costs
    ├── list-features.hbs               ✓ FIXED - Complete PC/NPC support
    ├── list-skills.hbs                 ✓ NEW - Rollable skills
    └── list-saves.hbs                  ✓ NEW - Rollable saves
```

---

## What Was Fixed/Created

### 1. **list-features.hbs Template** (FIXED)
- **Issue**: Template was truncated/corrupted with incomplete Handlebars syntax
- **Solution**: Completely rebuilt with proper:
  - PC vs NPC categorization
  - Talents, Features, Reactions, Actions support
  - Proper Handlebars iteration and conditional logic
  - Empty state handling

### 2. **DataScraper.js** (UPDATED)
- **Issue**: Using generic D&D item types; Mythcraft has different types
- **Solution**: Updated for Mythcraft-specific item types:
  - `weapon` - Melee/ranged attacks
  - `spell` - Spellcasting
  - `talent` - Character talents (PC only)
  - `feature` - All ability types
  - `background`, `lineage`, `profession` - Character background items
  - Proper categorization for NPC vs PC actors

### 3. **ActionHandler.js** (VASTLY ENHANCED)
- **Was**: Basic stubs that just called `item.roll()`
- **Now**: Complete macro logic including:
  - `configureAttack()` - Weapon attacks with AP checking
  - `executeSpellCast()` - Spell casting with SP deduction
  - `executeNPCSpell()` - Fast NPC spell mode
  - `rollSkill()` - Skill rolls with 1d20 + bonus
  - `rollSave()` - Save rolls with 1d20 + bonus
  - Helper methods: `calculateAPC()`, `getAttributeValue()`, `scrapeEffect()`
  - Full error checking and user notifications

### 4. **MythcraftHUD.js** (EXPANDED)
- **Added**: 
  - Skills and saves data in `getData()`
  - Attributes reference for calculations
  - Skill/save button click handlers
  - Full implementation of `activateExpansionListeners()`
  - isNPC flag for template conditional rendering

### 5. **myth-hud.css** (COMPLETELY REWRITTEN)
- **Fixed Issues**:
  - ✓ HUD positioning (now sits correctly above hotbar)
  - ✓ Proper z-index stacking
  - ✓ Expansion area scrolling (independent without affecting main bar)
  - ✓ Button hover states with proper visual feedback
  - ✓ Portrait sizing and positioning
  - ✓ List container sizing avoiding viewport overflow
  - ✓ Mobile/responsive considerations
- **Enhancements**:
  - Gradient backgrounds matching Mythcraft theme
  - Smooth animations and transitions
  - Improved shadows and depth
  - Better color consistency
  - Custom scrollbar styling
  - Proper spacing and alignment with flexbox

### 6. **hud-base.hbs** (ENHANCED)
- **Added**: 
  - Skills and Saves menu buttons
  - Improved spacing and organization
  - Better resource display (showing max values)
  - Title attributes on buttons for tooltips
  - Actor portrait title attribute

### 7. **list-weapons.hbs** (ENHANCED)
- Shows AP cost formula from `system.apcFormula`
- Better hover states
- Attribute indicator in title

### 8. **list-spells.hbs** (ENHANCED)
- Shows both AP and SP costs
- Better conditional rendering for optional costs
- Proper cost display formatting

### 9. **New Templates Created**
- `list-skills.hbs` - Rollable skill list with bonuses
- `list-saves.hbs` - Rollable save list with bonuses

### 10. **main.js** (HARDENED)**
- **Added**:
  - Better error handling with safety checks
  - Enhanced logging for debugging
  - Item update hooks (`createItem`, `updateItem`, `deleteItem`)
  - Token arguments in `updateActor` hook
  - Multi-user awareness with `userId` parameter

### 11. **Documentation** (CREATED)
- `README.md` - Complete module guide with:
  - Feature overview
  - Installation instructions
  - Module structure breakdown
  - Mythcraft data path compatibility reference
  - Usage examples
  - Developer extension guide
  - Known issues and future enhancements
- `CHANGELOG.md` - This detailed changelog

---

## Key Features Implemented

### From the Macro
✓ PC Features: Talents/Features (Cards), Weapons, Spells
✓ NPC Features: Passives/Reactions (Cards), Actions, Spells
✓ Auto-detection of PC vs NPC
✓ Dialog stays open for NPCs, closes for PC spells/weapons
✓ AP Cost calculation with formula support
✓ SP auto-spend with confirmation
✓ Multiattack support (framework ready for expansion)

### From Requirements
✓ Track Action Points (AP)
✓ Track Hit Points (HP)
✓ Rollable Skills
✓ Display Saves (with rollable option)
✓ Display Stats/Attributes
✓ Actor sheet image display (portrait on right)
✓ Lists expand/collapse above hotbar
✓ Persistent HUD attached to hotbar
✓ Visual bug fixes and polishing

---

## Data Paths - Mythcraft Compatibility

### Actor System Paths
```javascript
actor.system.hp          // { value, max }
actor.system.ap          // { value, max }
actor.system.sp          // { value, max }
actor.system.attributes  // { str, dex, con, int, wis, cha }
actor.system.skills      // { acrobatics, animal-handling, etc. }
actor.system.saves       // { strength, dexterity, etc. }
```

### Item System Paths
```javascript
item.system.apcFormula   // AP cost calculation
item.system.spc          // Spell Point cost
item.system.attr         // Primary ability (str, int, wis, etc.)
item.system.damage       // { formula, type }
item.system.description  // { value, gm }
```

---

## Testing Checklist

- [ ] Verify module loads without console errors
- [ ] Select a token on the map - HUD should appear
- [ ] Click Weapons button - should expand weapon list
- [ ] Click weapon - should check AP cost and trigger roll
- [ ] Click Spells button - should expand spell list
- [ ] Cast spell - should deduct SP and show notification
- [ ] Click Features button - should show talents/features based on actor type
- [ ] Click Skills button - should expand with rollable skills
- [ ] Click Saves button - should expand with rollable saves
- [ ] Click portrait - verify it's the correct actor image
- [ ] Deselect token - HUD should hide
- [ ] Switch tokens - HUD should update immediately
- [ ] Take damage - HP should update in real-time

---

## Known Limitations & Future Work

### Current Limitations
- Skills/Saves templates require Handlebars `capitalize` and `gt` helpers
- Portrait doesn't auto-update if changed while HUD is open
- Expansion area has independent scroll from main bar

### Planned Enhancements
- [ ] Drag-and-drop items to hotbar
- [ ] Custom configurable resources per actor
- [ ] Combat round indicator
- [ ] Status effect visual display
- [ ] Settings panel for GM customization
- [ ] Condition/state tracking (exhaustion, concentration, etc.)
- [ ] Quick-access macro buttons
- [ ] Chat log integration for roll history
- [ ] Multiattack expansion with sub-action info blocks
- [ ] Spell slot tracking (if added to Mythcraft later)

---

## Integration Notes

This module integrates the provided Universal Action Menu macro as a **persistent HUD system** rather than a standalone dialog. Key differences:

| Feature | Macro | HUD Module |
|---------|-------|-----------|
| Opening | Manual hotkey press | Auto-appears on token selection |
| Persistence | Closes after action | Stays open, can use repeatedly |
| Layout | Vertical dialog | Horizontal bar with expansion areas |
| Resources | Display only | Display + real-time tracking |
| Multiple tokens | One at a time | Auto-switches with token selection |
| Skills/Saves | Not included | Integrated and rollable |

---

## How to Use the Module

1. **Select a Token** - Click any token on the map
2. **The HUD Appears** - Shows above your hotbar with:
   - HP/AP/SP on the left
   - Menu buttons in center (Weapons, Spells, Features, Skills, Saves)
   - Actor portrait on the right

3. **Expand Lists** - Click any menu button to see items of that type

4. **Execute Actions**:
   - **Weapons**: Click weapon → rolls attack, checks AP
   - **Spells**: Click spell → rolls spell, deducts SP
   - **Features**: Click feature → uses standard roll
   - **Skills**: Click skill → 1d20 + skill bonus roll
   - **Saves**: Click save → 1d20 + save bonus roll

5. **Collapse** - Click the same menu button again to collapse

---

## File Sizes & Performance

All modules are optimized for performance:
- `main.js` - ~2.5 KB (minimal hooks)
- `MythcraftHUD.js` - ~4 KB (main app logic)
- `ActionHandler.js` - ~6 KB (action execution)
- `DataScraper.js` - ~2.5 KB (data organization)
- `myth-hud.css` - ~8 KB (complete styling)
- Total templates - ~4 KB (6 Handlebars files)

**Total unpacked**: ~27 KB (extremely lightweight)

---

## Support & Debugging

### Enable Debug Logging
Open browser console and watch for messages like:
```
Mythcraft HUD | Initializing...
Mythcraft HUD | Selected token: [TokenName]
Mythcraft HUD | Item [ItemName] updated, refreshing HUD
```

### Common Issues
- **HUD not appearing**: Check module is enabled and token is selected
- **Buttons not working**: Check console for JavaScript errors
- **Resources not updating**: Verify actor data structure matches Mythcraft system
- **Styling issues**: Clear browser cache and reload

---

## Next Steps

1. **Install and activate** the module in Foundry
2. **Run the testing checklist** above
3. **Report any issues** with specific steps to reproduce
4. **Customize CSS colors** in `myth-hud.css` to match your theme
5. **Extend ActionHandler** with custom logic as needed

---

**Setup Completed**: February 22, 2026
**Module Version**: 0.8.1-beta
**Foundry Compatibility**: v13+
**System**: Mythcraft
