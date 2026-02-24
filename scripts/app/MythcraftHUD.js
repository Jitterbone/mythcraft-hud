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

    async render(options) {
        // Rescue the players element by detaching it, preventing a visual jump during re-render.
        const players = document.querySelector("#players.integrated-players");
        if (players) {
            this._rescuedPlayers = players;
            players.remove(); // Detaches from DOM, preserving the element in memory.
        }
        
        try {
            return await super.render(options);
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

        // Fallback map for skills if attribute is missing on the skill object
        const skillMap = {
            'athletics': 'str', 'sprinting': 'str', 'climbing': 'str', 'swimming': 'str',
            'acrobatics': 'dex', 'balancing': 'dex', 'tumbling': 'dex', 'sleight of hand': 'dex', 'stealth': 'dex', 'hiding': 'dex', 'moving silently': 'dex',
            'endurance': 'end', 'forced march': 'end', 'holding breath': 'end',
            'arcana': 'int', 'history': 'int', 'investigation': 'int', 'investigating': 'int', 'nature': 'int', 'religion': 'int', 'engineering': 'int', 'crafting': 'int', 'cooking': 'int',
            'animal handling': 'awa', 'insight': 'awa', 'empathy': 'awa', 'medicine': 'awa', 'perception': 'awa', 'survival': 'awa', 'eavesdropping': 'awa',
            'deception': 'cha', 'deceiving': 'cha', 'intimidation': 'cha', 'performance': 'cha', 'persuasion': 'cha', 'persuading': 'cha'
        };

        for (const [key, skill] of Object.entries(skills)) {
            let attr = skill.attribute || skill.ability;
            if (!attr && skillMap[key.toLowerCase()]) attr = skillMap[key.toLowerCase()];
            
            if (attr && skillsByAttr[attr]) {
                const bonus = skill.total ?? skill.mod ?? skill.bonus ?? 0;
                skillsByAttr[attr].push({ id: key, label: skill.label || (key.charAt(0).toUpperCase() + key.slice(1)), value: (bonus >= 0 ? "+" : "") + bonus });
            }
        }
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
 
        const restData = {
            breathFeature: breathFeature,
            recoupFeature: recoupFeature,
            restFeature: restFeature,
            hasBreathFeature: !!breathFeature,
            hasRecoupFeature: !!recoupFeature,
            hasRestFeature: !!restFeature,
        };

        // Prepare Death Data
        const death = system.death || { value: 0, max: 3 }; // Default max to 3 if not found
        const isDead = death.value >= death.max;
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

        console.log("Mythcraft HUD | getData retrieved:", this.currentData);
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
                    <span class="injected-group">
                        <button class="injected-btn feature-btn" data-item-id="${feat._id}">${feat.name}</button>
                        <button class="injected-info info-toggle-btn" data-target="desc-${feat._id}"><i class="fas fa-info"></i></button>
                    </span>`;
                    
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
                // Inject before the hotbar or at the start of the wrapper.
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
        document.body.classList.remove("myth-hud-active");
        
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

        console.log(`Mythcraft HUD | Button clicked: ${type}`);

        if (this.currentTab === type) {
            this.closeExpansion();
            return;
        }

        this.currentTab = type;
        let templatePath = `modules/mythcraft-hud/templates/list-${type}.hbs`;

        if (type === 'actions') {
            templatePath = this.currentData.isNPC ? `modules/mythcraft-hud/templates/list-npc-actions.hbs` : `modules/mythcraft-hud/templates/list-actions.hbs`;
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
        } catch (err) {
            console.error(`Mythcraft HUD | Failed to render and inject template '${type}':`, err);
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
    
        switch (restType) {
            case 'breath':
                restName = 'is Catching their Breath';
                featureItem = restFeatures.breathFeature;
                break;
            case 'recoup':
                restName = 'is Recouping';
                featureItem = restFeatures.recoupFeature;
                break;
            case 'rest':
                restName = 'is Taking a Rest';
                featureItem = restFeatures.restFeature;
                break;
        }

        if (!restName) return;

        // Execute the rest logic and get a list of changes
        const changes = await ActionHandler.executeRest(actor, restType);

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