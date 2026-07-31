import { MythcraftHUD } from './app/MythcraftHUD.js';
import { ActionHandler } from './actions/ActionHandler.js';
import { mcConditions as MythcraftConditions } from './data/ConditionData.js';
import { ConditionHandler } from './actions/ConditionHandler.js';
import { conditionTooltip } from './app/ConditionTooltip.js';

let hudInstance;

function normalizeRollObject(roll) {
    if (!roll) return null;
    if (typeof roll === 'string') {
        try { return Roll.fromData(JSON.parse(roll)); } catch (e) {
            try { return Roll.fromData(roll); } catch (e2) {
                return null;
            }
        }
    }
    if (roll instanceof Roll) return roll;
    try { return Roll.fromData(roll); } catch (e) { return null; }
}

function extractDiceResults(message) {
    const allDice = [];
    for (let roll of message.rolls ?? []) {
        roll = normalizeRollObject(roll);
        if (!roll) continue;

        for (const term of roll.terms ?? []) {
            if (term.faces && Array.isArray(term.results)) {
                for (const dieResult of term.results) {
                    const result = dieResult.result;
                    allDice.push({ faces: term.faces, result, isMax: result === term.faces, isMin: result === 1 });
                }
            }
        }
    }
    return allDice;
}

function extractRollBonus(message) {
    for (let roll of message.rolls ?? []) {
        roll = normalizeRollObject(roll);
        if (!roll) continue;

        const bonusValue = roll?.options?.mythcraftBonusValue ?? null;
        if (Number.isFinite(bonusValue) && bonusValue !== 0) {
            return {
                value: bonusValue,
                text: roll?.options?.mythcraftBonusText || (bonusValue >= 0 ? `+${bonusValue}` : `${bonusValue}`)
            };
        }

        let constantBonus = 0;
        for (const term of roll.terms ?? []) {
            if (term.faces) continue;
            const number = Number(term.number);
            if (!Number.isFinite(number)) continue;
            let sign = 1;
            if (typeof term.operator === 'string') {
                sign = term.operator.trim() === '-' ? -1 : 1;
            }
            constantBonus += sign * number;
        }

        if (constantBonus !== 0) {
            return {
                value: constantBonus,
                text: constantBonus >= 0 ? `+${constantBonus}` : `${constantBonus}`
            };
        }

        const bonusMatch = (roll?.formula || '').match(/([+-])\s*(\d+)\s*$/);
        if (bonusMatch) {
            const value = parseInt(`${bonusMatch[1]}${bonusMatch[2]}`, 10);
            if (value !== 0) {
                return {
                    value,
                    text: value >= 0 ? `+${value}` : `${value}`
                };
            }
        }
    }
    return null;
}

function normalizeRollFlavor(flavor) {
    if (!flavor) return flavor;
    const attrNames = { str: "Strength", dex: "Dexterity", end: "Endurance", int: "Intelligence", awa: "Awareness", cha: "Charisma", lck: "Luck", lp: "Luck" };
    return flavor.replace(/\b(STR|DEX|END|INT|AWA|CHA|LCK|LP)\b/gi, match => attrNames[match.toLowerCase()] || match);
}

async function renderAnimatedRolls(message, html) {
    if (!message.rolls?.length) return;
    if (game.settings.get('mythcraft-hud', 'disableChatStyling')) return;

    // Preserve the slot UI for existing chat cards, but only animate recent rolls.
    const ts = Number(message.timestamp) || Date.parse(message.timestamp) || 0;
    const shouldAnimate = ts === 0 || ((Date.now() - ts) < 4000);

    const normalizedRolls = message.rolls
        .map(normalizeRollObject)
        .filter(roll => roll && (!roll.terms || roll.terms.length));
    if (!normalizedRolls.length) return;

    const diceResults = extractDiceResults({ rolls: normalizedRolls });
    if (!diceResults.length) return;

    const total = normalizedRolls.reduce((acc, roll) => acc + (roll.total ?? 0), 0);
    const formula = normalizedRolls.map(roll => roll.formula).join(' + ');
    const rawDiceFormula = normalizedRolls.map(roll => {
        const diceTerms = (roll.terms || []).filter(term => Number.isFinite(term.faces));
        if (!diceTerms.length) return roll.formula;
        return diceTerms.map(term => `${term.number || 1}d${term.faces}`).join(' + ');
    }).join(' + ');
    const rawDiceResults = diceResults.map(d => `${d.result}`).join(', ');
    const bonus = extractRollBonus({ rolls: normalizedRolls });
    const baseTotal = bonus ? total - bonus.value : total;
    if (!shouldAnimate && diceResults.length > 0) {
        diceResults[0].display = total;
    }
    const templateData = {
        dice: diceResults,
        total,
        baseTotal,
        formula,
        rawDiceFormula,
        rawDiceResults,
        bonus,
        bonusClass: bonus ? (bonus.value < 0 ? 'negative' : 'positive') : '',
        style: 'default',
        isNew: shouldAnimate
    };

    const content = await foundry.applications.handlebars.renderTemplate('modules/mythcraft-hud/templates/slot-machine.hbs', templateData);

    let rollResultEl = html.querySelector('.mythcraft-statblock .roll-result');
    if (!rollResultEl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mythcraft-statblock';
        wrapper.innerHTML = `
            <div class="card-header">${message.flavor || 'Roll'}</div>
            <div class="roll-result"></div>
        `;
        const target = html.querySelector('.message-content') || html;
        target.innerHTML = '';
        target.appendChild(wrapper);
        rollResultEl = wrapper.querySelector('.roll-result');
    }

    // Replace the numeric display and formula inside the roll-result with the
    // animation so it occupies the same visual area where the gold number appears.
    rollResultEl.innerHTML = '';
    const frag = document.createRange().createContextualFragment(content);
    rollResultEl.appendChild(frag);

    const animatedContainer = rollResultEl.querySelector('.animated-rolls-container');
    if (animatedContainer && !animatedContainer.dataset.expandListener) {
        animatedContainer.dataset.expandListener = 'true';
        animatedContainer.style.cursor = 'pointer';
        animatedContainer.addEventListener('click', (event) => {
            if (event.target.closest('.slot-window') || event.target.closest('.slot-bonus-pill')) return;
            animatedContainer.classList.toggle('expanded');
        });
    }

    // JS-driven animation: deterministic slot-like spin (constant speed then eased decel)
    function animateSlotDisplays(container, dice) {
        const totalDuration = game.settings.get('mythcraft-hud', 'rollAnimationDuration');

        const windows = Array.from(container.querySelectorAll('.slot-window'));

        // The spin phase will be ~60% of the total duration, and deceleration the remaining ~40%.
        // This maintains a nice visual rhythm across different durations.
        const spinMs = totalDuration * 0.6;
        const decelMs = totalDuration * 0.4;

        // Stagger between reels remains constant
        const staggerMs = 60; // stagger between reels (ms)

        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

        windows.forEach((win, i) => {
            const faces = Math.max(1, Number(win.dataset.faces) || (dice[i]?.faces) || 20);
            const final = Number(win.dataset.final) || Number(dice[i]?.result) || 0;
            const display = win.querySelector('.js-slot-display');
            if (!display) return;

            const startTime = performance.now() + i * staggerMs;
            const constantEnd = startTime + spinMs;
            const decelEnd = constantEnd + decelMs;

            display.classList.toggle('is-min', !!dice[i]?.isMin);
            display.classList.toggle('is-max', !!dice[i]?.isMax);

            // rotations per second during constant phase — higher rps but shorter durations
            const rps = 4.5;

            // compute currentSteps at constantEnd to align decel target
            const currentStepsAtConstantEnd = Math.floor((spinMs / 1000) * faces * rps);

            // additional full rotations during decel
            const extraRotations = 2;
            // compute target step index so final lands at the end of decel
            const currentMod = currentStepsAtConstantEnd % faces;
            const targetSteps = currentStepsAtConstantEnd + (extraRotations * faces) + ((final - 1 - currentMod + faces) % faces);

            function frame(now) {
                if (now < startTime) {
                    requestAnimationFrame(frame);
                    return;
                }
                if (now < constantEnd) {
                    const elapsed = now - startTime;
                    const steps = Math.floor((elapsed / 1000) * faces * rps);
                    const value = (steps % faces) + 1;
                    display.textContent = value;
                    requestAnimationFrame(frame);
                    return;
                }
                if (now < decelEnd) {
                    const decelElapsed = now - constantEnd;
                    const t = Math.min(1, decelElapsed / decelMs);
                    const eased = easeOutCubic(t);
                    const steps = Math.floor(currentStepsAtConstantEnd + (targetSteps - currentStepsAtConstantEnd) * eased);
                    const value = (steps % faces) + 1;
                    display.textContent = value;
                    requestAnimationFrame(frame);
                    return;
                }
                // finished
                display.textContent = final;
                display.classList.add('final');
            }

            requestAnimationFrame(frame);
        });

        function animateNumber(element, from, to, duration) {
            const delta = to - from;
            const startTime = performance.now();
            function frame(now) {
                const elapsed = Math.min(duration, now - startTime);
                const progress = elapsed / duration;
                const value = Math.round(from + delta * progress);
                element.textContent = value;
                if (elapsed < duration) {
                    requestAnimationFrame(frame);
                }
            }
            requestAnimationFrame(frame);
        }

        const totalRevealMs = spinMs + decelMs + (windows.length - 1) * staggerMs + 50;
        setTimeout(() => {
            const totalEl = container.querySelector('.animated-rolls-total');
            const bigValueEl = container.querySelector('.animated-rolls-big-value');
            const primarySlotEl = container.querySelector('.slot-window:first-child .js-slot-display.final');
            const bonusEl = container.querySelector('.slot-bonus-pill');
            if (totalEl) totalEl.classList.add('visible');
            if (bigValueEl) bigValueEl.textContent = total;
            if (bonus && primarySlotEl && bonusEl) {
                bonusEl.textContent = bonus.text;
                bonusEl.classList.add('visible');
                const bonusHold = 950;
                const countDuration = 700;
                setTimeout(() => {
                    bonusEl.classList.add('merge');
                    animateNumber(primarySlotEl, Number(primarySlotEl.textContent) || 0, total, countDuration);
                    primarySlotEl.classList.add('pulse');
                    setTimeout(() => {
                        bonusEl.classList.remove('visible');
                        bonusEl.classList.remove('merge');
                        primarySlotEl.classList.remove('pulse');
                    }, countDuration + 120);
                }, bonusHold);
            }
        }, totalRevealMs);
    }

    // Start JS animation only for recent rolls; preserve the slot UI on refresh without auto-rolling.
    if (shouldAnimate) {
        requestAnimationFrame(() => animateSlotDisplays(rollResultEl, diceResults));
    } else {
        rollResultEl.querySelectorAll('.js-slot-display').forEach(display => display.classList.add('final'));
        const totalEl = rollResultEl.querySelector('.animated-rolls-total');
        const bigValueEl = rollResultEl.querySelector('.animated-rolls-big-value');
        const bonusEl = rollResultEl.querySelector('.slot-bonus-pill');
        const primarySlotEl = rollResultEl.querySelector('.slot-window:first-child .js-slot-display.final');
        if (totalEl) totalEl.classList.add('visible');
        if (bigValueEl) bigValueEl.textContent = total;
        if (bonus && bonusEl) {
            bonusEl.textContent = bonus.text;
            bonusEl.classList.add('visible');
            bonusEl.classList.add('merge');
            if (primarySlotEl) primarySlotEl.classList.add('pulse');
            setTimeout(() => {
                bonusEl.classList.remove('visible');
                bonusEl.classList.remove('merge');
                if (primarySlotEl) primarySlotEl.classList.remove('pulse');
            }, 250);
        }
    }
}

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
        icon: c.icon,
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

    game.settings.register('mythcraft-hud', 'rollAnimationDuration', {
        name: "Roll Animation Duration (ms)",
        hint: "Adjust the total duration of the dice roll animation in milliseconds. Higher is slower and more suspenseful.",
        scope: "client",
        config: true,
        type: Number,
        range: {
            min: 500,
            max: 3000,
            step: 100
        },
        default: 1300, // The previous "Normal" speed
    });

    game.settings.register('mythcraft-hud', 'disableDiceSounds', {
        name: "Disable Dice Sounds",
        hint: "Mute the sound effect when rolling dice through the HUD.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register('mythcraft-hud', 'disableChatStyling', {
        name: "Disable Custom Chat Styling",
        hint: "Turn off the module's custom styling for chat cards. Your rolls will revert to the standard Foundry VTT format.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: true
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
    const attrNames = { str: "Strength", agi: "Agility", dex: "Dexterity", end: "Endurance", con: "Constitution", int: "Intelligence", awa: "Awareness", per: "Perception", wis: "Wisdom", cha: "Charisma", lck: "Luck", lp: "Luck" };
    const _attributeKeyFromFlavor = (rawFlavor) => {
        const lower = (rawFlavor || "").toLowerCase();
        for (const [key, value] of Object.entries(attrNames)) {
            if (new RegExp(`\\b(?:${key}|${value.toLowerCase()})\\b`).test(lower)) {
                return key === 'lp' ? 'lck' : key;
            }
        }
        return null;
    };
    const _normalizeAttributeFlavorText = (rawFlavor) => {
        if (!rawFlavor) return rawFlavor;
        return rawFlavor.replace(/\b(STR|DEX|END|INT|AWA|CHA|LCK|LP)\b/gi, match => attrNames[match.toLowerCase()] || match);
    };
    const _formatAttributeFlavor = (rawFlavor, attrKey) => {
        const key = attrKey || _attributeKeyFromFlavor(rawFlavor);
        if (!key) return _normalizeAttributeFlavorText((rawFlavor || "").trim());
        const fullName = attrNames[key];
        if (!fullName) return _normalizeAttributeFlavorText((rawFlavor || "").trim());
        return `${fullName} Check`;
    };

    const _getRollContext = (flavor, formula, rollOptions = {}, roll = {}) => {
        let resultLabel = "SYSTEM ROLL";
        let normalizedFlavor = (flavor || "").trim();
        const flavorLower = normalizedFlavor.toLowerCase();

        // New check for specific roll class from Mythcraft system
        if (roll.class === "AttributeRoll") {
            resultLabel = "ATTRIBUTE CHECK";
            const attrKey = roll.options?.attribute?.toLowerCase();
            if (attrKey) {
                normalizedFlavor = _formatAttributeFlavor(normalizedFlavor, attrKey);
            }
            return { resultLabel, flavor: normalizedFlavor || "Attribute Check" };
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
            normalizedFlavor = _formatAttributeFlavor(normalizedFlavor, attrKey);
            resultLabel = "ATTRIBUTE CHECK";
        } else if (attrMatch) {
            const attrKey = attrMatch[2].toLowerCase();
            normalizedFlavor = _formatAttributeFlavor(normalizedFlavor, attrKey);
            resultLabel = "ATTRIBUTE CHECK";
        } else if (skillMatch) {
            const skillKey = skillMatch[1].toLowerCase();
            const skillName = skillKey.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            resultLabel = "SKILL CHECK";
            if (!normalizedFlavor || normalizedFlavor === "Roll" || normalizedFlavor === "System Roll" || normalizedFlavor.trim() === "") {
                normalizedFlavor = `${skillName} Check`;
            }
        } else if (saveMatch) {
            const saveKey = saveMatch[1].toLowerCase();
            const saveName = saveKey.charAt(0).toUpperCase() + saveKey.slice(1);
            resultLabel = "SAVE CHECK";
            if (!normalizedFlavor || normalizedFlavor === "Roll" || normalizedFlavor === "System Roll" || normalizedFlavor.trim() === "") {
                normalizedFlavor = `${saveName} Save`;
            }
        } else if (normalizedFlavor.includes("attribute") || normalizedFlavor.includes("ability")) {
            resultLabel = "ATTRIBUTE CHECK";
        } else if (normalizedFlavor.includes("save")) {
            resultLabel = "SAVE CHECK";
        } else if (normalizedFlavor.includes("skill")) {
            resultLabel = "SKILL CHECK";
        } else if (normalizedFlavor.includes("attack")) {
            resultLabel = normalizedFlavor.includes("damage") ? "DAMAGE ROLL" : "ATTACK ROLL";
        } else if (attributes.some(a => flavorLower.includes(a))) {
            resultLabel = "ATTRIBUTE CHECK";
            const attrKey = _attributeKeyFromFlavor(normalizedFlavor);
            if (attrKey) normalizedFlavor = _formatAttributeFlavor(normalizedFlavor, attrKey);
        } else if (normalizedFlavor.toLowerCase().includes("check")) {
            resultLabel = "ATTRIBUTE CHECK";
        } else if (normalizedFlavor) {
            resultLabel = normalizedFlavor.toUpperCase();
        }

        normalizedFlavor = _normalizeAttributeFlavorText(normalizedFlavor);
        return { resultLabel, flavor: normalizedFlavor || resultLabel };
    };

    window.MythcraftHUD_getRollContext = _getRollContext; // Expose for ActionHandler

    const _styleChatMessage = (message, html) => {
        if (game.settings.get('mythcraft-hud', 'disableChatStyling')) return false;
        if (!message?.rolls?.length) return false;

        let roll = message.rolls[0];
        if (typeof roll === 'string') {
            try { roll = Roll.fromData(JSON.parse(roll)); } catch (e) {
                try { roll = Roll.fromData(roll); } catch (e2) {
                    console.warn('Mythcraft HUD | Could not parse roll data from string.', e2);
                    return false;
                }
            }
        }
        if (!roll) return false;

        const total = roll.total ?? 0;
        const formula = roll.formula || '';
        const initialFlavor = normalizeRollFlavor(message.flavor || roll.options?.flavor || '');
        const { flavor } = _getRollContext(initialFlavor, formula, roll.options, roll);

        const normalizedFlavor = normalizeRollFlavor(flavor);
        const existingCard = html.querySelector('.mythcraft-statblock');
        const isBlind = message.blind;
        const resultBlock = `
                <div class="roll-value">${total}</div>
                <div class="roll-formula">${formula}</div>
            `;
        if (existingCard) {
            const headerEl = existingCard.querySelector('.card-header');
            if (headerEl && headerEl.textContent.trim() !== normalizedFlavor) headerEl.textContent = normalizedFlavor;
            return true;
        }

        const target = html.querySelector('.message-content') || html;
        const newContent = `
                <div class="mythcraft-statblock">
                    <div class="card-header">${flavor}</div>
                    <div class="roll-result">
                        ${isBlind ? `<div class="secret">${resultBlock}</div>` : resultBlock}
                    </div>
                    <div class="dice-roll"></div>
                </div>`;

        target.innerHTML = newContent;
        return true;
    };

    Hooks.on('renderChatMessageHTML', async (message, html) => {
        _styleChatMessage(message, html);
        await renderAnimatedRolls(message, html);
    });

    // Intercept chat messages to style them with a custom card.
    // This uses the 'preCreateChatMessage' hook which is the modern, safe way to modify
    // chat message data before it is saved to the database.
    Hooks.on('preCreateChatMessage', async (message) => {
        // If the user disabled custom chat styling, skip processing entirely.
        if (game.settings.get('mythcraft-hud', 'disableChatStyling')) {
            return;
        }

        const d = message; // Work with the document directly

        // Ignore initiative rolls to avoid conflicts with the combat tracker.
        if (d.flags?.core?.initiativeRoll) {
            return;
        }

        // Style Roll Table results without breaking their native item drop links.
        if (d.flags?.core?.RollTableIds || d.content?.includes("table-draw")) {
            const flavor = d.flavor || "Table Draw Result";
            const newContent = `
                <div class="mythcraft-statblock">
                    <div class="card-header">${flavor}</div>
                    <div class="card-body" style="padding: 8px;">
                        ${d.content}
                    </div>
                </div>`;
            
            const updateData = {
                content: newContent,
                flavor: "" // Clear flavor to avoid duplication.
            };

            if (CONST.CHAT_MESSAGE_STYLES) updateData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
            else if (CONST.CHAT_MESSAGE_TYPES) updateData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;

            message.updateSource(updateData);
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
            const initialFlavor = normalizeRollFlavor(d.flavor || roll.options?.flavor || "");
            let { resultLabel, flavor } = _getRollContext(initialFlavor, formula, roll.options, roll);
            flavor = normalizeRollFlavor(flavor);

            // If the roll is coming from our ActionHandler, it won't have the rich context.
            // We re-run the context getter here to ensure the title is always correct.
            const handlerContext = window.MythcraftHUD_getRollContext(d.flavor, formula, roll.options, roll);
            flavor = handlerContext.flavor;

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

            // Ensure the bonus is always available for animation, even on sheet rolls.
            if (!roll.options.mythcraftBonusValue) {
                const bonusTerm = roll.terms.find(t => t instanceof NumericTerm && !t.options.flavor);
                if (bonusTerm) {
                    const bonusValue = bonusTerm.number;
                    roll.options.mythcraftBonusValue = bonusValue;
                    roll.options.mythcraftBonusText = (bonusValue >= 0 ? `+${bonusValue}` : `${bonusValue}`);
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
                        ${isBlind ? `<div class="secret">${resultBlock}</div>` : resultBlock}
                    </div>
                    <div class="dice-roll"></div>
                    ${buttonHtml}
                </div>`;

            // Prepare the data payload to update the message.
            const updateData = {
                content: newContent,
                flavor: "" // Clear flavor to avoid duplication.
            };

            // V12+ replaced ChatMessage types with styles. V14 strictly enforces schemas.
            if (CONST.CHAT_MESSAGE_STYLES) {
                updateData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
            } else if (CONST.CHAT_MESSAGE_TYPES) {
                updateData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;
            }

            const defaultMode = game.settings.settings.has("core.messageMode") ? game.settings.get("core", "messageMode") : game.settings.get("core", "rollMode");
            const chatRollMode = message.rollMode || defaultMode;
            if (ChatMessage.applyMode) ChatMessage.applyMode(updateData, chatRollMode);
            else if (ChatMessage.applyRollMode) ChatMessage.applyRollMode(updateData, chatRollMode);

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

            // Preserve the roll data so native animation hooks can still render the effect.
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
        icon: c.icon,
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
        icon: c.icon,
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

    // Apply chat theme class to body if chat styling is not disabled
    if (!game.settings.get('mythcraft-hud', 'disableChatStyling')) {
        document.body.classList.add('mythcraft-chat-theme');
    }

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
    // Only show AP above the token when in combat with an active initiative.
    if (!token.inCombat || !game.combat?.combatant) return;
    // Do not show AP text for NPC actors.
    if (token.actor?.type === 'npc') return;

    const isTurn = game.combat?.combatant?.tokenId === token.id;
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
