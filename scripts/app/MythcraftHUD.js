import { DataScraper } from '../data/DataScraper.js';
import { ActionHandler } from '../actions/ActionHandler.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MythcraftHUD extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor() {
        super();
        this.activeToken = null;
        this.actor = null; // Fallback actor (for players)
        this.currentTab = null; // Remembers what list is currently open
        this._rescuedPlayers = null; // To hold the detached players list during re-render
        this._isRendering = false; // To prevent race conditions
        this._renderPending = false;
    }

    static DEFAULT_OPTIONS = {
        id: "mythcraft-hud-app",
        tag: "div",
        window: {
            frame: false, // Replaces popOut: true + CSS hiding header
            positioned: true,
            controls: []
        },
        position: {
            width: "auto",
            height: "auto"
        }
    };

    async _onSkillRoll(event) {
        event.preventDefault();
        const skillId = event.currentTarget.dataset.skillId;
        if (this.targetActor) {
            await ActionHandler.rollSkill(skillId, this.targetActor);
        }
    }

    async _onSaveRoll(event) {
        event.preventDefault();
        const saveId = event.currentTarget.dataset.saveId;
        if (this.targetActor) {
            await ActionHandler.rollSave(saveId, this.targetActor);
        }
    }

    async _onAttributeRoll(event) {
        event.preventDefault();
        const attrId = event.currentTarget.dataset.attrId;
        if (this.targetActor) {
            await ActionHandler.rollAttribute(attrId, this.targetActor);
        }
    }

    static PARTS = {
        hud: {
            template: "modules/mythcraft-hud/templates/hud-base.hbs",
        }
    };

    static templatePaths = {
        actions: "modules/mythcraft-hud/templates/list-actions.hbs",
        "npc-actions": "modules/mythcraft-hud/templates/list-npc-actions.hbs",
        spells: "modules/mythcraft-hud/templates/list-spells.hbs",
        features: "modules/mythcraft-hud/templates/list-features.hbs",
        rest: "modules/mythcraft-hud/templates/list-rest.hbs",
        saves: "modules/mythcraft-hud/templates/list-saves.hbs",
        skills: "modules/mythcraft-hud/templates/list-skills.hbs",
        weapons: "modules/mythcraft-hud/templates/list-weapons.hbs"
    };

    async render(options) {
        this._renderPending = true;
        if (this._isRendering) return;

        this._isRendering = true;
        while (this._renderPending) {
            this._renderPending = false;
            try {
                // The actual render logic, moved from the original method
                const players = document.querySelector("#players.integrated-players");
                if (players) {
                    this._rescuedPlayers = players;
                    players.remove(); // Detaches from DOM, preserving the element in memory.
                }
                
                await super.render({ force: true });
            } catch (e) {
                console.error("Mythcraft HUD | An error occurred during render, restoring players list.", e);
                // If render fails, we must restore the players list to prevent it from disappearing.
                if (this._rescuedPlayers) {
                    document.body.appendChild(this._rescuedPlayers);
                    this._rescuedPlayers.classList.remove("integrated-players");
                    this._rescuedPlayers = null;
                }
                // Re-throw the error so it's still visible in the console.
                throw e;
            }
        }
        this._isRendering = false;
    }
    /**
     * Groups actor skills by their primary attribute.
     * @param {object} skills - The actor's system.skills object.
     * @param {Array<object>} pairs - The attribute/defense pairs for the HUD.
     * @returns {object} An object with attribute IDs as keys and arrays of skill data as values.
     * @private
     */
    _groupSkillsByAttribute(skills = {}, pairs = []) {
        const skillsByAttr = {};
        pairs.forEach(p => skillsByAttr[p.id] = []);
        skillsByAttr.uncategorized = []; // Add a bucket for uncategorized skills

        // Create a reverse map from all possible attribute names to the canonical pair ID.
        // This ensures that skills with attributes like 'con' or 'constitution' are correctly
        // mapped to the 'end' group used by the HUD.
        const attrToPairId = {};
        const pairDefinitions = {
            str: ['str', 'strength'],
            dex: ['dex', 'agi', 'agility'],
            end: ['end', 'con', 'stamina', 'constitution', 'endurance'],
            int: ['int', 'intelligence'],
            awa: ['awa', 'awr', 'per', 'perception', 'wis', 'wisdom'],
            cha: ['cha', 'charisma']
        };
        for (const pairId in pairDefinitions) {
            for (const alias of pairDefinitions[pairId]) {
                attrToPairId[alias] = pairId;
            }
        }

        // Fallback map for skills if attribute is missing on the skill object.
        // Keys are lowercase and have no spaces for consistent matching.
        // This map is based on the official Mythcraft SRD and supplemented with common skills.
        const skillMap = {
            // STR
            'appliedforce': 'str',
            'athletics': 'str',
            'climbing': 'str',
            'menacing': 'str',
            'sprinting': 'str',
            'swimming': 'str',
            // DEX
            'acrobatics': 'dex',
            'balancing': 'dex',
            'contorting': 'dex',
            'dancing': 'dex',
            'hiding': 'dex',
            'movingsilently': 'dex',
            'sneaking': 'dex',
            'stealth': 'dex',
            'tumbling': 'dex',
            // END
            'distancerunning': 'end',
            'endurance': 'end',
            'forcedmarch': 'end',
            'holdingbreath': 'end',
            // AWA
            'animalhandling': 'awa',
            'eavesdropping': 'awa',
            'foraging': 'awa',
            'insight': 'awa',
            'intuiting': 'awa',
            'investigating': 'awa',
            'investigation': 'awa',
            'navigating': 'awa',
            'perceiving': 'awa',
            'perception': 'awa',
            'sheltering': 'awa',
            'survival': 'awa',
            'tracking': 'awa',
            // INT
            'alchemy': 'int', 'appraising': 'int', 'arcana': 'int', 'art': 'int', 'astrology': 'int', 'astronomy': 'int', 'biology': 'int', 'brewing': 'int', 'calligraphy': 'int', 'carpentry': 'int', 'cartography': 'int', 'chemistry': 'int', 'cobbling': 'int', 'cooking': 'int', 'crafting': 'int', 'disguising': 'int', 'dungeoneering': 'int', 'economics': 'int', 'engineering': 'int', 'evading': 'int', 'forging': 'int', 'geography': 'int', 'glassblowing': 'int', 'history': 'int', 'jeweling': 'int', 'law': 'int', 'leatherworking': 'int', 'lockpicking': 'int', 'masonry': 'int', 'medicine': 'int', 'military': 'int', 'nature': 'int', 'painting': 'int', 'politics': 'int', 'pottery': 'int', 'religion': 'int', 'sleightofhand': 'int', 'smithing': 'int', 'vehiclesland': 'int', 'vehicleswater': 'int', 'weaving': 'int', 'woodcarving': 'int',
            // CHA
            'deceiving': 'cha',
            'deception': 'cha',
            'empathy': 'cha',
            'entertaining': 'cha',
            'gossiping': 'cha',
            'instrument': 'cha',
            'intimidating': 'cha',
            'leadership': 'cha',
            'performance': 'cha',
            'persuading': 'cha',
            'persuasion': 'cha',
            'savoirfaire': 'cha',
            // LCK
            'fortuity': 'lck',
            'scavenging': 'lck'
        };

        for (const [key, skill] of Object.entries(skills)) {
            if (!key || typeof skill !== 'object' || skill === null) continue;

            const attr = skill.attribute || skill.ability;
            let canonicalAttr = attr ? attrToPairId[attr.toLowerCase()] : null;

            // If the attribute on the skill object is missing or invalid (doesn't map to a canonical attribute),
            // then try to find it using the fallback map based on the skill's key.
            // This is more robust and handles cases where `skill.attribute` might be `""` or some other junk value.
            if (!canonicalAttr) {
                const normalizedKey = key.toLowerCase().replace(/[\s-]/g, '');
                const fallbackAttr = skillMap[normalizedKey]; // e.g., 'awa'
                if (fallbackAttr) {
                    // The fallback map uses canonical IDs, so we can assign it directly.
                    canonicalAttr = fallbackAttr;
                }
            }

            // Prepare the skill entry object
            const bonus = skill.total ?? skill.mod ?? skill.bonus ?? 0;
            // Improved label generation for camelCase keys like 'sleightOfHand' -> 'Sleight Of Hand'
            const label = skill.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const skillEntry = { id: key, label: label, value: (bonus >= 0 ? "+" : "") + bonus };

            if (canonicalAttr && skillsByAttr[canonicalAttr]) {
                skillsByAttr[canonicalAttr].push(skillEntry);
            } else {
                // If still no attribute, put it in the uncategorized list for display
                skillsByAttr.uncategorized.push(skillEntry);
            }
        }
        // Filter out the empty key entry that sometimes appears in system data
        skillsByAttr.uncategorized = skillsByAttr.uncategorized.filter(s => s.id !== '');
        return skillsByAttr;
    }

    async _prepareContext(options) {
        // Always get hotbar data, even if no actor is selected
        const hotbarData = this.getHotbarMacros();
        const actor = this.targetActor;

        // GM Character List Logic
        let gmCharacters = [];
        if (game.user.isGM) {
            gmCharacters = game.actors.filter(a => a.type === 'character').sort((a, b) => a.name.localeCompare(b.name)).map(a => ({
                id: a.id,
                name: a.name,
                img: a.img,
                isActive: actor?.id === a.id
            }));
        }
        
        // If no actor, return just the hotbar and a flag
        if (!actor) {
            return { hasActor: false, hotbar: hotbarData, isGM: game.user.isGM, gmCharacters };
        }

        const system = actor.system;
        const itemData = DataScraper.getActorData(actor);

        // Process Multiattack for NPCs
        if (actor.type === 'npc') {
            this._processMultiattack(itemData);
        }

        // Prepare Rest Data - Following user prompt to iterate actor.items directly
        const relevantItemTypes = ["feature", "talent", "background", "lineage", "profession"];
        const features = actor.items.filter(i => relevantItemTypes.includes(i.type));
 
        const findRestFeature = (features, name, keyword) => {
            // This regex looks for patterns like "(x/Restname)" to exclude them.
            const exclusionRegex = new RegExp(`\\([^/)]+\\/\\s*${keyword}\\s*\\)`, 'i');
            const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
 
            return features.find(f => {
                const fName = f.name.toLowerCase();
                const rawDesc = f.system.description.value || '';
                // Strip HTML and inline roll syntax for a very clean string for reliable searching.
                const cleanDesc = rawDesc.replace(/<[^>]+>/g, '').replace(/\[\[.*?\]\]/g, '');
 
                if (fName === name.toLowerCase()) return true;
 
                const hasKeyword = keywordRegex.test(cleanDesc);
                const isExcluded = exclusionRegex.test(cleanDesc);
 
                return hasKeyword && !isExcluded;
            });
        };

        const breathFeature = findRestFeature(features, 'Catch your Breath', 'catch your breath');
        const recoupFeature = findRestFeature(features, 'Recoup', 'recoup');
        const restFeature = findRestFeature(features, 'Take a Rest', 'take a rest');
 
        // Check for Bloodied condition: HP is at or below 50% of max.
        const isBloodied = system.hp.value <= (system.hp.max / 2);

        const restData = {
            breathFeature: breathFeature,
            recoupFeature: recoupFeature,
            restFeature: restFeature,
            hasBreathFeature: !!breathFeature,
            hasRecoupFeature: !!recoupFeature,
            hasRestFeature: !!restFeature,
            isBloodied: isBloodied,
            // The 'canRecoup' guard is removed; Recoup is always available if the feature exists.
        };

        // Prepare Death Data
        const death = system.death || { value: 0, max: 3 }; // Default max to 3 if not found
        const isDead = (death.max > 0) && (death.value >= death.max);
        const isDying = system.hp.value === 0 && !isDead;

        const skullTally = [];
        if (isDying) {
            for (let i = 0; i < death.max; i++) {
                skullTally.push({ isActive: i < death.value });
            }
        }

        const deathPercent = (death.max > 0) ? Math.min(100, (death.value / death.max) * 100) : 0;
        const deathData = {
            value: death.value,
            max: death.max,
            percent: deathPercent,
            isDead: isDead,
            isDying: isDying,
            skullTally: skullTally
        };

        // Attribute & Defense Pairs
        const attributes = system.attributes || {};
        const defenses = system.defenses || {};
        
        // Helper to get mod safely
        const findAttr = (...keys) => {
            for (const k of keys) {
                if (attributes[k] !== undefined) return Number(attributes[k]);
            }
            return 0;
        };
        const formatMod = (val) => (val >= 0 ? "+" : "") + val;

        const pairs = [
            { id: 'str', label: 'STR', val: findAttr('str','strength'), defLabel: 'AR', defVal: defenses.ar ?? (10 + findAttr('str','strength')) },
            { id: 'dex', label: 'DEX', val: findAttr('dex','agi','agility'), defLabel: 'REF', defVal: defenses.ref ?? (10 + findAttr('dex','agi','agility')) },
            { id: 'end', label: 'END', val: findAttr('end','con','stamina'), defLabel: 'FORT', defVal: defenses.fort ?? (10 + findAttr('end','con','stamina')) },
            { id: 'int', label: 'INT', val: findAttr('int','intelligence'), defLabel: 'LOG', defVal: defenses.log ?? (10 + findAttr('int','intelligence')) },
            { id: 'awa', label: 'AWA', val: findAttr('awr','awa','per','perception'), defLabel: 'ANT', defVal: defenses.ant ?? (10 + findAttr('awr','awa','per','perception')) },
            { id: 'cha', label: 'CHA', val: findAttr('cha','charisma'), defLabel: 'WILL', defVal: defenses.will ?? (10 + findAttr('cha','charisma')) }
        ];
        
        // Group Skills by Attribute
        const skillsByAttr = this._groupSkillsByAttribute(system.skills, pairs);

        const attributeList = pairs.map(p => ({
            id: p.id,
            label: p.label,
            value: formatMod(p.val),
            defLabel: p.defLabel,
            defVal: p.defVal,
            skills: skillsByAttr[p.id]?.sort((a, b) => a.label.localeCompare(b.label)) || [],
            hasSkills: (skillsByAttr[p.id]?.length || 0) > 0
        }));

        // Add the uncategorized skills as a separate group if they exist.
        // This ensures that even if a skill's attribute can't be determined, it still appears on the HUD.
        if (skillsByAttr.uncategorized && skillsByAttr.uncategorized.length > 0) {
            attributeList.push({
                id: 'unc',
                label: 'UNC',
                value: '-',
                defLabel: 'Misc',
                defVal: '',
                skills: skillsByAttr.uncategorized.sort((a, b) => a.label.localeCompare(b.label)),
                hasSkills: true
            });
        }

        // We store this on the class so we can easily pass it to the list templates later
        this.currentData = {
            hasActor: true,
            actorName: actor.name,
            actorImg: actor.img,
            hp: system.hp || { value: 0, max: 0 },
            ap: system.ap || { value: 0, max: 0 },
            sp: system.sp || { value: 0, max: 0 },
            skills: system.skills || {},
            saves: system.saves || {},
            attributeList: attributeList,
            isNPC: actor.type === "npc",
            items: itemData,
            hotbar: hotbarData,
            isGM: game.user.isGM,
            gmCharacters: gmCharacters,
            restFeatures: restData,
            death: deathData
        };

        return this.currentData;
    }

    _processMultiattack(itemData) {
        // Assume actions are in 'features' based on typical structure
        const features = itemData.features || [];
        const multiattack = features.find(i => i.name.toLowerCase() === 'multiattack');
        
        if (multiattack) {
            let desc = multiattack.system.description.value || "";
            const subActions = [];
            
            // Sort features by name length descending to match longest names first
            const otherFeatures = features.filter(i => i !== multiattack).sort((a, b) => b.name.length - a.name.length);
            
            otherFeatures.forEach(feat => {
                // Escape regex special characters
                const escapedName = feat.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
                
                if (regex.test(desc)) {
                    // Mark as hidden from main list
                    feat.isHidden = true;
                    
                    // Create injection HTML
                    const btnHtml = `
                    <div class="injected-group">
                        <button class="injected-btn feature-btn" data-item-id="${feat._id}">${feat.name}</button>
                        <button class="injected-info info-toggle-btn" data-target="desc-${feat._id}"><i class="fas fa-info"></i></button>
                    </div>`;
                    
                    desc = desc.replace(regex, btnHtml);
                    
                    subActions.push({
                        id: `desc-${feat._id}`,
                        name: feat.name,
                        description: feat.system.description.value || ""
                    });
                }
            });
            
            itemData.multiattack = {
                processedDesc: desc,
                subActions: subActions
            };
            
            // Hide the original Multiattack card too
            multiattack.isHidden = true;
        }
    }

    _renderGMCharacterSwitcher(html, context) {
        if (!context.isGM || !context.gmCharacters || context.gmCharacters.length === 0) return;

        const charListHtml = `
            <div class="hud-gm-char-list">
                ${context.gmCharacters.map(c => `
                    <div class="hud-gm-char-card ${c.isActive ? 'active' : ''}" data-actor-id="${c.id}" title="${c.name}">
                        <img src="${c.img}">
                    </div>
                `).join('')}
            </div>
        `;
        
        html.find('.hud-gm-char-list').remove();
        
        const rightCol = html.find('.hud-right-column');
        if (rightCol.length > 0) {
             rightCol.prepend(charListHtml);
        } else {
            html.prepend(charListHtml);
        }

        html.find('.hud-gm-char-card').on('click', (event) => {
            event.preventDefault();
            const actorId = event.currentTarget.dataset.actorId;
            const actor = game.actors.get(actorId);
            if (actor) {
                this.closeExpansion();
                this.activeToken = null;
                this.actor = actor;
                this.render({ force: true });
            }
        });
    }

    _onRender(context, options) {
        document.body.classList.add("myth-hud-active");
        const html = $(this.element);

        // If the main layout container is missing (because hasActor is false),
        // create a minimal version to hold the players list and keep the layout consistent.
        if (!context.hasActor && html.find('.hud-layout-container').length === 0) {
            const wrapper = html.find('#mythcraft-hud-wrapper');
            if (wrapper.length) {
                const minimalLayout = `
                    <div class="hud-layout-container">
                        <div class="hud-left-column">
                            <div id="hud-players-mount"></div>
                        </div>
                        <div class="hud-right-column">
                            <!-- Empty right column to maintain layout -->
                        </div>
                    </div>
                `;
                const hotbar = wrapper.find('.mythcraft-hotbar');
                if (hotbar.length) {
                    hotbar.before(minimalLayout);
                } else {
                    wrapper.prepend(minimalLayout);
                }
            }
        }

        this._renderGMCharacterSwitcher(html, context);

        // --- EVENT LISTENERS ---
        // The ApplicationV2 'events' object seems unreliable for this persistent,
        // non-windowed app. We revert to direct jQuery listeners for robustness.

        // Main Menu Buttons
        html.find('.hud-menu-btn').on('click', this._onMenuButtonClick.bind(this));

        // Death Skull Tally
        html.find('.death-skull-icon').on('click', this._onDeathSkullClick.bind(this));

        // Attribute/Skill Buttons
        html.find('.hud-attr-btn').on('click', this._onAttributeRoll.bind(this));
        // Skill buttons are in a popup, so delegate from the main element
        // Use a namespace (.skill) to prevent stacking listeners on re-renders.
        html.off('click.skill').on('click.skill', '.hud-skill-btn', this._onSkillRoll.bind(this));

        // Hotbar Macro Buttons
        html.find('.hotbar-macro-btn').on('click', this._onMacroExecute.bind(this));

        // Expansion List Buttons (delegate from the expansion area)
        const expansionArea = html.find('#mythcraft-hud-expansion');
        expansionArea.on('click', '.hud-rest-row', this._onRestClick.bind(this));
        expansionArea.on('click', '.weapon-btn', this._onWeaponClick.bind(this));
        expansionArea.on('click', '.mod-toggle-btn', this._onModifierClick.bind(this));
        expansionArea.on('click', '.spell-btn', this._onSpellClick.bind(this));
        expansionArea.on('click', '.feature-btn', this._onFeatureClick.bind(this));
        expansionArea.on('click', '.hud-save-btn', this._onSaveRoll.bind(this));
        expansionArea.on('click', '.info-toggle-btn', this._onInfoToggle.bind(this));
        expansionArea.on('click', '.clickable-card', this._onCardClick.bind(this));

        // --- RESOURCE COLORING ---
        const updateResourceColor = (label, valSpan) => {
            if (label.includes('HP')) {
                const hp = context.hp;
                if (hp && hp.max > 0) {
                    const pct = hp.value / hp.max;
                    let color = '#e74c3c'; // Red (< 25%)
                    if (pct >= 0.75) color = '#2ecc71'; // Green
                    else if (pct >= 0.5) color = '#f1c40f'; // Yellow
                    else if (pct >= 0.25) color = '#e67e22'; // Orange
                    valSpan.css('color', color);
                }
            } else if (label.includes('AP')) {
                valSpan.css('color', '#3498db'); // Blue
            } else if (label.includes('SP')) {
                valSpan.css('color', '#cc66ff'); // Purple
            }
        };

        html.find('.hud-row').each((i, el) => {
            const row = $(el);
            const label = row.find('.hud-label').text().trim().toUpperCase();
            const valSpan = row.find('.hud-val');
            updateResourceColor(label, valSpan);
        });

        html.find('.stat-row').each((i, el) => {
            const row = $(el);
            const label = row.text().trim().toUpperCase();
            const valSpan = row.find('.stat-val');
            updateResourceColor(label, valSpan);
        });

        // --- UI INTEGRATION LOGIC (Fail-safe) ---
        const playersMount = html.find("#hud-players-mount")[0];
        const players = this._rescuedPlayers || document.getElementById("players");

        if (players) {
            if (playersMount) {
                // If the mount exists, the players list belongs inside it.
                playersMount.appendChild(players);
                players.classList.add("integrated-players");
            } else {
                // If no mount exists, the players list must be in the body.
                if (players.classList.contains("integrated-players")) {
                    document.body.appendChild(players);
                    players.classList.remove("integrated-players");
                }
            }
        }
        
        // After all attempts to re-attach, clear the reference.
        this._rescuedPlayers = null;

        this.updatePosition();
        
        // --- DOCKING LOGIC ---
        const updateDocking = () => {
            const height = this.element.offsetHeight || 0;
            document.documentElement.style.setProperty('--myth-hud-height', `${height + 10}px`); // +10px buffer
        };
        updateDocking();

        this._resizeObserver = new ResizeObserver(updateDocking);
        this._resizeObserver.observe(this.element);

    }

    async close(options) {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }

        // Restore Players List
        const players = document.getElementById("players");
        if (players && players.classList.contains("integrated-players")) {
            document.body.appendChild(players);
            players.classList.remove("integrated-players");
        }

        return super.close(options);
    }

    updatePosition() {
        const app = this.element; // In V2, this.element is the HTMLElement
        
        if (app) {
            app.classList.remove("hud-left", "hud-center", "hud-right", "hud-inverted");
            app.classList.add('hud-left');
        }
    }

    // Helper to get the actor from the token OR the fallback actor
    get targetActor() {
        return this.activeToken?.actor || this.actor;
    }

    // Get current user's hotbar macros (10 slots)
    getHotbarMacros() {
        const macros = [];
        const hotbar = game.user?.hotbar || {};
        
        for (let i = 1; i <= 10; i++) {
            const macroId = hotbar[i];
            const macro = macroId ? game.macros.get(macroId) : null;
            
            macros.push({
                slot: i,
                macro: macro,
                name: macro?.name || '',
                icon: macro?.img || 'icons/svg/d20-black.svg'
            });
        }
        
        return macros;
    }

    // --- Event Handlers ---

    async _onMenuButtonClick(event) {
        event.preventDefault();
        const btn = event.currentTarget;
        const type = btn.dataset.type;
        const expansionArea = $(this.element).find('#mythcraft-hud-expansion');

        // If this menu is already open, close it and do nothing else.
        if (this.currentTab === type) {
            this.closeExpansion();
            return;
        }

        // Determine the correct template path
        let templatePath;
        if (type === 'actions' && this.targetActor?.type === 'npc') {
            templatePath = MythcraftHUD.templatePaths['npc-actions'];
        } else {
            templatePath = MythcraftHUD.templatePaths[type];
        }

        if (!templatePath) {
            console.error(`Mythcraft HUD | No template path found for type: ${type}`);
            return;
        }

        console.log(`Mythcraft HUD | Opening ${type} menu with template: ${templatePath}`);

        const appRect = this.element.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();

        try {
            const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--myth-hud-scale')) || 1.0;
            const bottomOffset = (appRect.bottom - btnRect.top + 6) / scale;
            const leftOffset = (btnRect.left - appRect.left) / scale;

            expansionArea.css({
                position: "absolute",
                bottom: `${bottomOffset}px`,
                left: `${leftOffset}px`,
                maxHeight: "65vh",
                zIndex: 200
            });

            const listHtml = await renderTemplate(templatePath, this.currentData);
            // The rest menu is short and has tooltips that need to escape. Don't wrap it in a scroller.
            if (type === 'rest') {
                expansionArea.html(listHtml);
            } else {
                expansionArea.html(`<div class="hud-list-scroller">${listHtml}</div>`);
            }
            // After successfully opening, set the current tab.
            this.currentTab = type;
        } catch (err) {
            console.error(`Mythcraft HUD | Failed to render and inject template '${type}':`, err);
            this.closeExpansion(); // Close on error to be safe.
        }
    }

    async _onMacroExecute(event) {
        event.preventDefault();
        const macroId = event.currentTarget.dataset.macroId;
        if (macroId) {
            const macro = game.macros.get(macroId);
            if (macro) {
                console.log(`Mythcraft HUD | Executing macro: ${macro.name}`);
                await macro.execute();
            }
        }
    }

    async _onWeaponClick(event) {
        event.preventDefault();
        const actor = this.targetActor;
        if (!actor) return;
        const itemId = event.currentTarget.dataset.itemId;
        const isBlind = $(event.currentTarget).hasClass('injected-btn');
        await ActionHandler.rollWeapon(itemId, actor, { rollMode: isBlind ? 'blindroll' : null });
        if (actor.type !== 'npc') this.closeExpansion();
    }

    async _onModifierClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const actor = this.targetActor;
        if (!actor) return;
        const itemId = event.currentTarget.dataset.itemId;
        await ActionHandler.showModifierDialog(itemId, actor);
    }

    _onSpellClick(event) {
        event.preventDefault();
        const actor = this.targetActor;
        if (!actor) return;
        const itemId = event.currentTarget.dataset.itemId;
        if (actor.type === 'npc') {
            ActionHandler.executeNPCSpell(itemId, actor);
        } else {
            ActionHandler.castSpell(itemId, actor);
            this.closeExpansion();
        }
    }

    _onFeatureClick(event) {
        event.preventDefault();
        const actor = this.targetActor;
        if (!actor) return;
        const itemId = event.currentTarget.dataset.itemId;
        const isBlind = $(event.currentTarget).hasClass('injected-btn');
        ActionHandler.useAction(itemId, actor, { rollMode: isBlind ? 'blindroll' : null });
        if (actor.type !== 'npc') this.closeExpansion();
    }

    _onInfoToggle(event) {
        event.preventDefault();
        event.stopPropagation();
        const targetId = event.currentTarget.dataset.target;
        $(this.element).find(`#${targetId}`).slideToggle(200);
    }

    _onCardClick(event) {
        event.preventDefault();
        event.stopPropagation();
        $(event.currentTarget).find('.card-body').slideToggle(200);
    }

    closeExpansion() {
        const expansionArea = $(this.element).find('#mythcraft-hud-expansion');
        expansionArea.empty();
        expansionArea.removeAttr("style");
        this.currentTab = null;
    }

    async _onRestClick(event) {
        event.preventDefault();
        const actor = this.targetActor;
        if (!actor) return;
    
        const restType = event.currentTarget.dataset.restType;
        const restFeatures = this.currentData.restFeatures;
        
        let restName = '';
        let featureItem = null;
        let changes = [];
    
        switch (restType) {
            case 'breath':
                restName = 'is Catching their Breath';
                featureItem = restFeatures.breathFeature;
                changes = await ActionHandler.executeRest(actor, restType);
                break;
            case 'recoup':
                restName = 'is Recouping';
                featureItem = restFeatures.recoupFeature;

                // Custom logic for Recoup based on detailed rules.
                const updates = {};

                // 1. HP Gain (only if Bloodied)
                const maxHP = actor.system.hp.max;
                const currentHP = actor.system.hp.value;
                const bloodiedThreshold = Math.floor(maxHP / 2);

                if (currentHP <= bloodiedThreshold) {
                    const potentialHPRestored = Math.floor(maxHP / 4);
                    // HP cannot be restored above the bloodied threshold.
                    const maxPossibleHP = bloodiedThreshold;
                    const actualHPRestored = Math.min(potentialHPRestored, maxPossibleHP - currentHP);

                    if (actualHPRestored > 0) {
                        updates['system.hp.value'] = currentHP + actualHPRestored;
                        changes.push(`Regained ${actualHPRestored} HP.`);
                    }
                }

                // 2. Remove 1 Death Point
                const currentDeath = actor.system.death?.value || 0;
                if (currentDeath > 0) {
                    updates['system.death.value'] = Math.max(0, currentDeath - 1);
                    changes.push(`Removed 1 Death Point.`);
                }

                // 3. Include "Catch your Breath" effects
                const breathChanges = await ActionHandler.executeRest(actor, 'breath');
                changes.push(...breathChanges.filter(c => c)); // Add non-empty changes

                // Apply all updates to the actor
                if (Object.keys(updates).length > 0) await actor.update(updates);
                break;
            case 'rest':
                restName = 'is Taking a Rest';
                featureItem = restFeatures.restFeature;
                changes = await ActionHandler.executeRest(actor, restType);
                break;
        }

        if (!restName) return;

        let content = `<p><strong>${actor.name}</strong> ${restName}.</p>`;

        if (changes.length > 0) {
            content += '<ul style="margin: 0; padding-left: 20px; font-size: 0.9em;">';
            changes.forEach(change => {
                content += `<li>${change}</li>`;
            });
            content += '</ul>';
        }

        if (featureItem) {
            // Enrich the description to make inline rolls clickable before sending to chat.
            const enrichedDesc = await TextEditor.enrichHTML(featureItem.system.description.value, { async: true, rollData: actor.getRollData() });

            // Create an embedded card for the feature.
            content += `
                <div class="clickable-card" style="margin-top: 5px;">
                    <div class="card-header">${featureItem.name}</div>
                    <div class="card-body" style="display: block;">
                        ${enrichedDesc}
                    </div>
                </div>
            `;
        }

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: content
        });
    }

    async _onDeathSkullClick(event) {
        event.preventDefault();
        const actor = this.targetActor;
        if (!actor) return;
    
        const clickedIndex = parseInt(event.currentTarget.dataset.index);
        const currentValue = actor.system.death?.value || 0;
        const newIndexValue = clickedIndex + 1;
    
        let newValue;
        // If clicking the currently active last skull, "untick" it.
        if (newIndexValue === currentValue) {
            newValue = currentValue - 1;
        } else {
            newValue = newIndexValue;
        }
    
        await actor.update({ 'system.death.value': newValue });
    }
}