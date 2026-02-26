import { MythcraftHUD } from './app/MythcraftHUD.js';
import { ActionHandler } from './actions/ActionHandler.js';

let hudInstance;

Hooks.once('init', () => {
    Handlebars.registerHelper('capitalize', function(str) {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Register Settings
    game.settings.register('mythcraft-hud', 'hudScale', {
        name: "HUD Scale",
        hint: "Adjust the size of the HUD interface.",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "small": "Small",
            "medium": "Medium",
            "large": "Large",
            "xlarge": "Extra Large"
        },
        default: "medium",
        onChange: value => {
            const scaleMap = { "small": 0.8, "medium": 1.0, "large": 1.2, "xlarge": 1.4 };
            const scale = scaleMap[value] || 1.0;
            document.documentElement.style.setProperty('--myth-hud-scale', scale);
        }
    });

    game.settings.register('mythcraft-hud', 'disableDiceSounds', {
        name: "Disable Dice Sounds",
        hint: "Mute the sound effect when rolling dice through the HUD.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('mythcraft-hud', 'hideHitMissInfo', {
        name: "Hide Hit/Miss Info from Players",
        hint: "When enabled, the AR and Hit/Miss result of an attack will only be visible to the GM.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: false
    });

    // 1. Dialog & Popup Overhaul (CSS Variables)
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --color-bg: #111111;
            --color-text: #fdfaf3;
            --color-border: #d3c4a3;
            --color-blue: #3498db;
            --color-red: #e74c3c;
        }
    `;
    document.head.appendChild(style);

   // Template override for chat messages
    // Helper function to determine the label and flavor for a roll.
    const _getRollContext = (flavor, formula, rollOptions = {}, roll = {}) => {
        let resultLabel = "SYSTEM ROLL";
        const flavorLower = flavor.toLowerCase();

        // New check for specific roll class from Mythcraft system
        if (roll.class === "AttributeRoll") {
            resultLabel = "ATTRIBUTE CHECK";
            const attrKey = roll.options?.attribute?.toLowerCase();
            if (attrKey) {
                const attrNames = { str: "Strength", agi: "Agility", dex: "Dexterity", end: "Endurance", con: "Constitution", int: "Intelligence", awa: "Awareness", per: "Perception", wis: "Wisdom", cha: "Charisma", lck: "Luck" };
                const fullName = attrNames[attrKey] || attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
                // Use the flavor from the roll if it's more specific than a generic "Check"
                if (!flavor || flavor.toLowerCase() === "roll" || flavor.toLowerCase() === "system roll" || flavor.toLowerCase().endsWith(" check")) {
                    flavor = `${fullName} Check`;
                }
            }
            return { resultLabel, flavor };
        }

        // Attribute list for keyword detection
        const attributes = ["strength", "str", "agility", "agi", "dexterity", "dex", "endurance", "end", "constitution", "con", "stamina", "intelligence", "int", "awareness", "awa", "perception", "per", "wisdom", "wis", "charisma", "cha", "luck", "lck"];

        // Regex for formula detection
        const attrMatch = formula.match(/@(attributes?|abilities?|ability)\.([a-zA-Z0-9_]+)/i);
        const skillMatch = formula.match(/@skills?\.([a-zA-Z0-9_\-]+)/i);
        const saveMatch = formula.match(/@saves?\.([a-zA-Z0-9_]+)/i);

        // Check for Damage/Healing based on options first
        if (rollOptions.isHeal === true) {
            resultLabel = "HEALING ROLL";
        } else if (rollOptions.isHeal === false) {
            resultLabel = rollOptions.flavor ? `${rollOptions.flavor.toUpperCase()} DAMAGE` : "DAMAGE ROLL";
        } else if (rollOptions.attribute) {
            const attrKey = rollOptions.attribute.toLowerCase();
            const attrNames = { str: "Strength", agi: "Agility", dex: "Dexterity", end: "Endurance", con: "Constitution", int: "Intelligence", awa: "Awareness", per: "Perception", wis: "Wisdom", cha: "Charisma", lck: "Luck" };
            const fullName = attrNames[attrKey] || attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
            resultLabel = "ATTRIBUTE CHECK";
            if (!flavor || flavor === "Roll" || flavor === "System Roll") {
                flavor = `${fullName} Check`;
            }
        } else if (attrMatch) {
            const attrKey = attrMatch[2].toLowerCase();
            const attrNames = { str: "Strength", agi: "Agility", dex: "Dexterity", end: "Endurance", con: "Constitution", int: "Intelligence", awa: "Awareness", per: "Perception", wis: "Wisdom", cha: "Charisma", lck: "Luck" };
            const fullName = attrNames[attrKey] || attrKey.charAt(0).toUpperCase() + attrKey.slice(1);
            resultLabel = "ATTRIBUTE CHECK";
            if (!flavor || flavor === "Roll" || flavor === "System Roll") {
                flavor = `${fullName} Check`;
            }
        } else if (skillMatch) {
            const skillKey = skillMatch[1].toLowerCase();
            const skillName = skillKey.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            resultLabel = "SKILL CHECK";
            if (!flavor || flavor === "Roll" || flavor === "System Roll" || flavor.trim() === "") {
                flavor = `${skillName} Check`;
            }
        } else if (saveMatch) {
            const saveKey = saveMatch[1].toLowerCase();
            const saveName = saveKey.charAt(0).toUpperCase() + saveKey.slice(1);
            resultLabel = "SAVE CHECK";
            if (!flavor || flavor === "Roll" || flavor === "System Roll" || flavor.trim() === "") {
                flavor = `${saveName} Save`;
            }
        } else if (flavorLower.includes("attribute") || flavorLower.includes("ability")) {
            resultLabel = "ATTRIBUTE CHECK";
        } else if (flavorLower.includes("save")) {
            resultLabel = "SAVE CHECK";
        } else if (flavorLower.includes("skill")) {
            resultLabel = "SKILL CHECK";
        } else if (flavorLower.includes("attack")) {
            resultLabel = flavor.includes("damage") ? "DAMAGE ROLL" : "ATTACK ROLL";
        } else if (attributes.some(a => flavorLower.includes(a))) {
            resultLabel = "ATTRIBUTE CHECK";
        } else if (flavorLower.includes("check")) {
            resultLabel = "ATTRIBUTE CHECK";
        } else if (flavor) {
            resultLabel = flavor.toUpperCase();
        }

        return { resultLabel, flavor };
    };

    // WARNING: This is a monkey patch of a core Foundry method. It is powerful but can be fragile.
    // If chat message creation breaks in a future Foundry version, this is a likely place to investigate.
    // The goal is to intercept all rolls and re-format them into a custom statblock card.
    const originalCreate = ChatMessage.create;
    ChatMessage.create = async function(data, options = {}) {
        const dataArray = Array.isArray(data) ? data : [data];
        
        for (const d of dataArray) {
            // If this is an initiative roll, let Foundry handle it natively.
            // This prevents conflicts with the combat tracker and avoids styling the roll,
            // which is often preferred for clarity in the turn order.
            if (d.flags?.core?.initiativeRoll) {
                continue;
            }
            // Check if it's a roll and not already styled by our HUD
            if (d.rolls && d.rolls.length > 0 && !d.content?.includes("mythcraft-statblock")) {
                
                // Handle Roll instance or JSON data
                let roll = d.rolls[0];
                if (typeof roll === 'string') {
                    try { roll = JSON.parse(roll); } catch (e) {}
                }
                
                if (!roll) continue;

                // Extract info
                const total = roll.total;
                const formula = roll.formula;
                // Fallback to roll options flavor if message flavor is empty
                const initialFlavor = d.flavor || roll.options?.flavor || "";

                let { resultLabel, flavor } = _getRollContext(initialFlavor, formula, roll.options, roll);

                let resultClass = "";
                let buttonHtml = ""; // Action buttons container
                if (roll.options?.isHeal === true) {
                    buttonHtml = `<div style="padding: 0 8px 8px 8px;"><button class="apply-healing-btn" data-value="${total}">APPLY HEALING</button></div>`;
                } else if (roll.options?.isHeal === false) {
                    buttonHtml = `<div style="padding: 0 8px 8px 8px;"><button class="apply-damage-btn" data-value="${total}">APPLY DAMAGE</button></div>`;
                }

                // Crit logic
                let terms = roll.terms;
                if (!terms && roll.toJSON) terms = roll.terms; // Handle Roll instance
                
                if (terms) {
                    const d20Term = terms.find(t => t.faces === 20);
                    if (d20Term) {
                        const result = d20Term.results.find(r => r.active) || d20Term.results[0];
                        const d20 = (typeof result === 'object') ? result.result : result;
                        
                        if (d20 === 20) { 
                            resultClass = "crit-success"; 
                            resultLabel = "CRITICAL SUCCESS"; 
                        } else if (d20 === 1) { 
                            resultClass = "crit-fail"; 
                            resultLabel = "CRITICAL FAILURE"; 
                        }
                    }
                }

                // Build new HTML
                const isBlind = d.blind; // Capture original blind flag
                const resultBlock = `
                    <div class="roll-value">${total}</div>
                    <div class="roll-formula">${formula}</div>
                `;
                const newContent = `
                    <div class="mythcraft-statblock">
                        <div class="card-header">${flavor}</div>
                        <div class="roll-result ${resultClass}">
                            <div class="roll-label">${resultLabel}</div>
                            ${isBlind ? `<div class="secret">${resultBlock}</div>` : resultBlock}
                        </div>
                        ${buttonHtml}
                    </div>`;
                
                d.content = newContent;
                d.type = CONST.CHAT_MESSAGE_TYPES.OTHER; // Prevent default roll rendering
                d.flavor = ""; // Clear flavor to avoid duplication
                
                // Determine the roll mode from options to correctly handle dice visibility.
                const chatRollMode = options.rollMode || game.settings.get("core", "rollMode");

                if (!d.sound && d.rolls?.length > 0) d.sound = CONFIG.sounds.dice;

                // The Dice So Nice! integration has been temporarily disabled as per your request.
                // Because the module uses custom chat cards (by changing the message type to OTHER),
                // this will prevent 3D dice from showing for these rolls until the integration is re-enabled.
            }
        }
        
        return originalCreate.call(this, data, options);
    };

    // The `ChatMessage.create` patch above is now the single point of truth for styling all roll messages.
    // The `preCreateChatMessage` hook that specifically handled AttributeRolls is no longer needed and was
    // conflicting with the main patch, causing the double dice roll issue.
    // By removing it and relying on the `ChatMessage.create` patch, we unify the logic.
});

Hooks.once('ready', () => {
    console.log("Mythcraft HUD | Initializing...");
    hudInstance = new MythcraftHUD();
    game.mythHUD = hudInstance; // Expose globally for settings callbacks
    console.log("Mythcraft HUD | Ready! Select a token to view the HUD.");
    
    // Apply HUD Scale
    const currentScale = game.settings.get('mythcraft-hud', 'hudScale');
    const scaleMap = { "small": 0.8, "medium": 1.0, "large": 1.2, "xlarge": 1.4 };
    document.documentElement.style.setProperty('--myth-hud-scale', scaleMap[currentScale] || 1.0);
    
    // Persistent Open Logic
    if (game.user.character) {
        // Player with assigned character
        hudInstance.actor = game.user.character;
        hudInstance.render({ force: true });
    } else if (game.user.isGM) {
        // GM Mode - Open blank (will show character switcher)
        hudInstance.render({ force: true });
    }

    // Hide Foundry's default hotbar to prevent layout conflicts
    const hotbar = document.getElementById('hotbar');
    if (hotbar) {
        hotbar.style.display = 'none';
        console.log("Mythcraft HUD | Foundry hotbar hidden.");
    }

    // --- MONKEY PATCHING SYSTEM ROLLS ---
    // Intercept system roll functions to redirect output to HUD style
    const ActorClass = CONFIG.Actor.documentClass;

    // WARNING: This function patches core Actor methods. This is done to intercept system-native
    // roll dialogs (e.g., from the character sheet) and format their output using the module's
    // custom chat cards. This is fragile and may break if the Mythcraft system changes its roll methods.
    const patchSystemRoll = (methodName, typeLabel) => {
        if (!ActorClass.prototype[methodName]) return;
        
        console.log(`Mythcraft HUD | Patching system method: ${methodName}`);
        const originalMethod = ActorClass.prototype[methodName];

        ActorClass.prototype[methodName] = async function(...args) {
            // By simply calling the original method, we allow it to create a standard chat message.
            // Our powerful `ChatMessage.create` patch will then intercept this message,
            // re-style it into our professional card, and handle the 3D dice roll.
            // This unifies all sheet rolls (attributes, skills, saves) into a single, reliable pipeline
            // and fixes the double dice roll bug.
            return await originalMethod.apply(this, args);
        };
    };

    // Apply patches to likely system methods
    patchSystemRoll('rollSkill', 'SKILL CHECK');
    patchSystemRoll('rollSave', 'SAVE CHECK');
    patchSystemRoll('rollAttribute', 'ATTRIBUTE CHECK');
    patchSystemRoll('rollAttributeCheck', 'ATTRIBUTE CHECK');

    // Prompt 3: Unified Interaction - Handle click on parent .hud-action-button
    $(document).on('click', '.hud-action-button', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const link = $(this).find('.inline-roll');
        if (link.length) {
            link[0].click();
        }
    });

    // Listener for SP Refund buttons on spell cards
    $(document).on('click', '.myth-hud-refund-btn', async (ev) => {
        ev.preventDefault();
        const btn = ev.currentTarget;
        const actorUuid = btn.dataset.actorUuid;
        const spCost = parseInt(btn.dataset.spCost);
        
        await ActionHandler.refundSP(actorUuid, spCost);
        
        // Visual feedback
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i> Refunded';
        btn.classList.add('refunded');
    });

    // Listeners for Apply Buttons (Damage/Healing)
    $(document).on('click', '.apply-damage-btn', async function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const val = parseInt(this.dataset.value);
        const targets = canvas.tokens.controlled;
        if (!targets.length) return ui.notifications.warn("No tokens selected.");
        
        for (const t of targets) {
            const actor = t.actor;
            if (!actor) continue;
            const hp = actor.system.hp.value;
            await actor.update({"system.hp.value": hp - val});
            ui.notifications.info(`Applied ${val} damage to ${actor.name}`);
        }
    });

    $(document).on('click', '.apply-healing-btn', async function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const val = parseInt(this.dataset.value);
        const targets = canvas.tokens.controlled;
        if (!targets.length) return ui.notifications.warn("No tokens selected.");
        
        for (const t of targets) {
            const actor = t.actor;
            if (!actor) continue;
            const hp = actor.system.hp.value;
            const max = actor.system.hp.max;
            await actor.update({"system.hp.value": Math.min(max, hp + val)});
            ui.notifications.info(`Applied ${val} healing to ${actor.name}`);
        }
    });

    // --- HUD & TOKEN HOOKS ---

    // Ensure hotbar stays hidden when UI is toggled
    Hooks.on('toggleSidebar', (sidebar, collapsed) => {
        const hotbar = document.getElementById('hotbar');
        if (hotbar) hotbar.style.display = 'none';
    });

    // When a token is controlled, show HUD for that actor
    Hooks.on('controlToken', (token, controlled) => {
        if (!hudInstance) return;
        if (controlled) {
            console.log(`Mythcraft HUD | Token controlled: ${token.actor.name}`);
            hudInstance.closeExpansion();
            hudInstance.activeToken = token;
            hudInstance.actor = null; // Clear the fallback actor
            hudInstance.render({ force: true });
        } else {
            const lastActor = token.actor;
            // A token was deselected. Check if any tokens are left.
            if (canvas.tokens.controlled.length === 0) {
                hudInstance.closeExpansion();
                if (game.user.character) {
                    // Player has a default character, revert to it
                    hudInstance.activeToken = null;
                    hudInstance.actor = game.user.character;
                    hudInstance.render({ force: true });
                } else if (game.user.isGM) {
                    // GM keeps the last viewed actor displayed to prevent collapse.
                    hudInstance.activeToken = null;
                    hudInstance.actor = lastActor;
                    hudInstance.render({ force: true });
                }
            }
        }
        // Always update AP display for the token that changed state
        updateTokenAP(token);
    });

    // Manually scrub GM-only data from chat cards for players
    Hooks.on('renderChatMessage', (message, html, data) => {
        if (!game.user.isGM) {
            html.find('.mythcraft-hit-box[data-visibility="gm"]').remove();
        }
    });

    // Consolidated hook to refresh the HUD when any relevant document changes.
    const refreshHUDOnUpdate = (document) => {
        if (!hudInstance || !hudInstance.rendered) return;
        const targetActor = hudInstance.targetActor;
        if (!targetActor) return;

        const isRelevant = (document.documentName === "Actor" && document.id === targetActor.id) ||
                           (document.documentName === "Item" && document.actor?.id === targetActor.id);

        if (isRelevant) {
            console.log(`Mythcraft HUD | ${document.documentName} '${document.name}' updated, refreshing HUD.`);
            hudInstance.render();
        }
    };

    Hooks.on('updateActor', (actor, changes, options, userId) => {
        refreshHUDOnUpdate(actor);
        if (changes.system?.ap) {
            actor.getActiveTokens().forEach(t => {
                if (t.controlled) updateTokenAP(t);
            });
        }
    });
    Hooks.on('updateItem', (item, changes, options, userId) => refreshHUDOnUpdate(item));
    Hooks.on('createItem', (item, options, userId) => refreshHUDOnUpdate(item));
    Hooks.on('deleteItem', (item, options, userId) => refreshHUDOnUpdate(item));

    // --- COMBAT & AP HOOKS ---

    // Update AP when turn changes
    Hooks.on('updateCombat', async (combat, updateData, options, userId) => {
        canvas.tokens.controlled.forEach(t => updateTokenAP(t));
        
        // Reactive AP Logic (GM Only)
        if (game.user.isGM && (updateData.turn !== undefined || updateData.round !== undefined)) {
            const combatant = combat.combatant;
            if (!combatant || !combatant.actor) return;

            const actor = combatant.actor;
            
            let level = 1;
            if (actor.system.level?.value !== undefined) level = Number(actor.system.level.value);
            else if (actor.system.level !== undefined) level = Number(actor.system.level);
            
            if (actor.type === 'npc') {
                 const cr = Number(actor.system.cr);
                 if (!isNaN(cr)) level = cr;
            }
            if (isNaN(level)) level = 1;

            const maxAP = actor.system.ap?.max || 0;
            const currentAP = actor.system.ap?.value || 0;
            
            const reactiveCap = Math.ceil(level / 2) + 1;
            
            let newAP = maxAP;
            
            if (combat.round > 1) {
                const carryover = Math.min(currentAP, reactiveCap);
                newAP += carryover;
            }

            if (newAP !== currentAP) {
                await actor.update({ "system.ap.value": newAP });
            }
        }
    });

    Hooks.on('deleteCombat', () => {
        canvas.tokens.controlled.forEach(t => updateTokenAP(t));
    });
});

// --- AP DISPLAY LOGIC ---
const apTextMap = new Map();

function updateTokenAP(token) {
    // Cleanup existing text
    if (apTextMap.has(token.id)) {
        const text = apTextMap.get(token.id);
        if (text && !text.destroyed) {
            token.removeChild(text);
            text.destroy();
        }
        apTextMap.delete(token.id);
    }

    if (!token.controlled) return;
    // Do not show AP text for NPC actors.
    if (token.actor?.type === 'npc') return;

    if (!token.inCombat) return;

    const combat = game.combat;
    if (!combat) return;

    const combatant = combat.combatants.find(c => c.tokenId === token.id);
    if (!combatant) return;

    const isTurn = combat.combatant?.id === combatant.id;
    const ap = token.actor.system.ap?.value ?? 0;
    
    // Blue if turn, Yellow if not
    const color = isTurn ? 0x3498db : 0xf1c40f;

    const style = new PIXI.TextStyle({
        fontFamily: "Signika",
        fontSize: 36,
        fontWeight: "bold",
        fill: color,
        stroke: 0x000000,
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: "#000000",
        dropShadowBlur: 2,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 2,
        align: "center"
    });

    const text = new PIXI.Text(`${ap}`, style);
    text.anchor.set(0.5, 1); // Anchor to bottom-center
    text.position.set(token.w / 2, 0); // Position at top-center of the token
    token.addChild(text);
    apTextMap.set(token.id, text);
}
