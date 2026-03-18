import { MythcraftHUD } from './app/MythcraftHUD.js';
import { ActionHandler } from './actions/ActionHandler.js';
import { mcConditions as MythcraftConditions } from './data/ConditionData.js';
import { ConditionHandler } from './actions/ConditionHandler.js';
import { conditionTooltip } from './app/ConditionTooltip.js';

let hudInstance;

Hooks.on("init", () => {
    // Wipe whatever the system defines
    CONFIG.statusEffects = [];
    CONFIG.specialStatusEffects = {};

    // Replace entirely with Mythcraft-HUD conditions
    CONFIG.statusEffects = MythcraftConditions.map(c => ({
        id: c.id,
        name: c.label,
        label: c.label,
        description: c.description,
        img: c.img,
        statuses: [c.id],
        changes: c.changes,
        flags: c.flags
    }));

    Handlebars.registerHelper('capitalize', function (str) {
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

    // Intercept chat messages to style them with a custom card.
    // This uses the 'preCreateChatMessage' hook which is the modern, safe way to modify
    // chat message data before it is saved to the database.
    Hooks.on('preCreateChatMessage', async (message) => {
        const d = message; // Work with the document directly

        // Ignore initiative rolls to avoid conflicts with the combat tracker.
        if (d.flags?.core?.initiativeRoll) {
            return;
        }

        // Process messages that have rolls and are not already styled.
        if (d.rolls && d.rolls.length > 0 && !d.content?.includes("mythcraft-statblock")) {
            let roll = d.rolls[0];

            // Ensure we have a valid Roll instance.
            if (typeof roll === 'string') {
                try { roll = Roll.fromData(JSON.parse(roll)); } catch (e) {
                    try { roll = Roll.fromData(roll); } catch (e2) {
                        console.warn("Mythcraft HUD | Could not parse roll data from string.", e2);
                        return;
                    }
                }
            } else if (!(roll instanceof Roll)) {
                try {
                    roll = Roll.fromData(roll);
                } catch (e) {
                    console.warn("Mythcraft HUD | Could not create Roll instance from data.", e);
                    return;
                }
            }

            if (!roll) return;

            const total = roll.total;
            const formula = roll.formula;
            const initialFlavor = d.flavor || roll.options?.flavor || "";
            let { resultLabel, flavor } = _getRollContext(initialFlavor, formula, roll.options, roll);

            let resultClass = "";
            let buttonHtml = "";

            // Add Apply Damage/Healing buttons based on roll context.
            if (roll.options?.isHeal === true) {
                buttonHtml = `<div style="padding: 0 8px 8px 8px;"><button class="apply-healing-btn" data-value="${total}">APPLY HEALING</button></div>`;
            } else if (roll.options?.isHeal === false) {
                buttonHtml = `<div style="padding: 0 8px 8px 8px;"><button class="apply-damage-btn" data-value="${total}">APPLY DAMAGE</button></div>`;
            }

            // Determine if the roll is a critical success or failure.
            const d20Term = roll.terms.find(t => t.faces === 20);
            if (d20Term) {
                const result = d20Term.results.find(r => r.active) || d20Term.results[0];
                if (result) {
                    const d20 = result.result;
                    if (d20 === 20) {
                        resultClass = "crit-success";
                        resultLabel = "CRITICAL SUCCESS";
                    } else if (d20 === 1) {
                        resultClass = "crit-fail";
                        resultLabel = "CRITICAL FAILURE";
                    }
                }
            }

            // Prepare the custom HTML for the chat card.
            const isBlind = d.blind;
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

            // Prepare the data payload to update the message.
            const updateData = {
                content: newContent,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER, // Prevents default roll rendering.
                flavor: "" // Clear flavor to avoid duplication.
            };

            const chatRollMode = message.rollMode || game.settings.get("core", "rollMode");
            ChatMessage.applyRollMode(updateData, chatRollMode);

            if (!d.sound && d.rolls?.length > 0) updateData.sound = CONFIG.sounds.dice;

            // Manually trigger 3D dice if the module is active.
            if (game.dice3d && d.rolls?.length > 0) {
                const isPublicRoll = chatRollMode === 'publicroll';
                if (isPublicRoll) {
                    await game.dice3d.showForRoll(roll, game.user, true);
                } else {
                    const whisperUsers = (updateData.whisper || d.whisper || []).map(id => game.users.get(id)).filter(Boolean);
                    await game.dice3d.showForRoll(roll, game.user, false, whisperUsers, updateData.blind || d.blind);
                }
            }

            // Clear the rolls from the message data to prevent other modules (like Dice So Nice)
            // from processing the roll a second time.
            updateData.rolls = [];

            // Update the message source with our new data.
            message.updateSource(updateData);
        }
    });

    // The `ChatMessage.create` patch above is now the single point of truth for styling all roll messages.
    // The `preCreateChatMessage` hook that specifically handled AttributeRolls is no longer needed and was
    // conflicting with the main patch, causing the double dice roll issue.
    // By removing it and relying on the `ChatMessage.create` patch, we unify the logic.
});

Hooks.on("setup", () => {
    CONFIG.statusEffects = MythcraftConditions.map(c => ({
        id: c.id,
        name: c.label,
        label: c.label,
        description: c.description,
        img: c.img,
        statuses: [c.id],
        changes: c.changes,
        flags: c.flags
    }));
});

Hooks.once("ready", async () => {
    CONFIG.statusEffects = MythcraftConditions.map(c => ({
        id: c.id,
        name: c.label,
        label: c.label,
        description: c.description,
        img: c.img,
        statuses: [c.id],
        changes: c.changes,
        flags: c.flags
    }));

    const validIds = new Set(MythcraftConditions.map(c => c.id));

    for (const scene of game.scenes) {
        for (const tokenDoc of scene.tokens) {
            const badEffects = tokenDoc.actor?.effects.filter(e =>
                [...(e.statuses ?? [])].some(s => !validIds.has(s))
            ).map(e => e.id) ?? [];

            if (badEffects.length > 0) {
                await tokenDoc.actor.deleteEmbeddedDocuments("ActiveEffect", badEffects);
            }
        }
    }

    new ConditionHandler();
    hudInstance = new MythcraftHUD();
    game.mythHUD = hudInstance; // Expose globally for settings callbacks

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
    }

    // The 'preCreateChatMessage' hook now handles all roll messages, making these patches obsolete.
    // Removing them improves performance and reduces the risk of conflicts with the game system or other modules.

    // Prompt 3: Unified Interaction - Handle click on parent .hud-action-button
    $(document).on('click', '.hud-action-button', function (e) {
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
    $(document).on('click', '.apply-damage-btn', async function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const val = parseInt(this.dataset.value);
        const targets = canvas.tokens.controlled;
        if (!targets.length) return ui.notifications.warn("No tokens selected.");

        for (const t of targets) {
            const actor = t.actor;
            if (!actor) continue;
            const hp = actor.system.hp.value;
            await actor.update({ "system.hp.value": hp - val });
            ui.notifications.info(`Applied ${val} damage to ${actor.name}`);
        }
    });

    $(document).on('click', '.apply-healing-btn', async function (ev) {
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
            await actor.update({ "system.hp.value": Math.min(max, hp + val) });
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
        // Always update AP display for the token that changed control state.
        updateTokenAP(token);
    });

    // Consolidated hook to refresh the HUD when any relevant document changes.
    const refreshHUDOnUpdate = (document) => {
        if (!hudInstance || !hudInstance.rendered) return;
        const targetActor = hudInstance.targetActor;
        if (!targetActor) return;

        const isRelevant = (document.documentName === "Actor" && document.id === targetActor.id) ||
            (document.documentName === "Item" && document.actor?.id === targetActor.id);

        if (isRelevant) {
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
        // When the turn changes, update AP display for all tokens in the combat
        // to correctly reflect the active turn color.
        combat.combatants.forEach(c => {
            if (c.token?.object) updateTokenAP(c.token.object);
        });
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
        // When combat ends, iterate all tokens on the canvas to remove their AP display.
        canvas.tokens.placeables.forEach(t => updateTokenAP(t));
    });
});

// --- AP DISPLAY LOGIC ---
const apTextMap = new Map();


function updateTokenAP(token) {
    if (!token) return; // Safety guard
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
