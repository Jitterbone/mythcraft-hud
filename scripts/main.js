import { MythcraftHUD } from './app/MythcraftHUD.js';
import { ActionHandler, getActiveRollMode, getMessageModeKey } from './actions/ActionHandler.js';
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

function extractRollModifiersAndBonus(rolls, message) {
    const modifiers = [];
    let totalBonus = 0;
    let explicitBonus = null;

    const normalizedRolls = (rolls ?? []).map(normalizeRollObject).filter(Boolean);

    for (const roll of normalizedRolls) {
        // Check if structured modifiers were attached (e.g. from ActionHandler)
        if (Array.isArray(roll.options?.modifiers) && roll.options.modifiers.length > 0) {
            for (const mod of roll.options.modifiers) {
                const num = Number(mod.value) || 0;
                modifiers.push({
                    label: mod.label || "Modifier",
                    value: num,
                    text: (num >= 0 ? `+${num}` : `${num}`),
                    cssClass: num >= 0 ? 'positive' : 'negative'
                });
            }
        }

        // Check if a mythcraftBonusValue was attached
        if (Number.isFinite(roll?.options?.mythcraftBonusValue)) {
            explicitBonus = {
                value: roll.options.mythcraftBonusValue,
                text: roll.options.mythcraftBonusText || (roll.options.mythcraftBonusValue >= 0 ? `+${roll.options.mythcraftBonusValue}` : `${roll.options.mythcraftBonusValue}`)
            };
        }

        // Parse terms if no structured modifiers were added
        if (modifiers.length === 0 && Array.isArray(roll.terms)) {
            let lastOperator = '+';
            for (const term of roll.terms) {
                const isOp = term.operator !== undefined || term.constructor?.name === "OperatorTerm";
                const isNum = !term.faces && (term.number !== undefined || term.constructor?.name === "NumericTerm");

                if (isOp) {
                    lastOperator = term.operator || '+';
                } else if (isNum) {
                    const value = Number(term.number);
                    if (!Number.isFinite(value)) continue;
                    const signedVal = lastOperator === '-' ? -value : value;
                    totalBonus += signedVal;

                    let label = term.options?.flavor || term.flavor;
                    if (!label) {
                        const rollFlavor = normalizeRollFlavor(message?.flavor || roll.options?.flavor || '');
                        if (rollFlavor.includes("Check")) label = "Attribute / Skill";
                        else if (rollFlavor.includes("Save")) label = "Save Bonus";
                        else if (rollFlavor.includes("Attack")) label = "Attack Bonus";
                        else if (rollFlavor.includes("Damage")) label = "Damage Bonus";
                        else label = "Modifier";
                    }
                    modifiers.push({
                        label: label,
                        value: signedVal,
                        text: (signedVal >= 0 ? `+${signedVal}` : `${signedVal}`),
                        cssClass: signedVal >= 0 ? 'positive' : 'negative'
                    });
                }
            }
        }
    }

    let bonus = explicitBonus;
    if (!bonus) {
        if (modifiers.length > 0) {
            const sum = modifiers.reduce((acc, m) => acc + m.value, 0);
            if (sum !== 0) {
                bonus = {
                    value: sum,
                    text: sum >= 0 ? `+${sum}` : `${sum}`
                };
            }
        } else if (totalBonus !== 0) {
            bonus = {
                value: totalBonus,
                text: totalBonus >= 0 ? `+${totalBonus}` : `${totalBonus}`
            };
        }
    }

    return { modifiers, bonus };
}

const MYTHCRAFT_DAMAGE_TYPES = new Set([
    "sharp", "blunt", "cold", "corrosive", "fire", "lightning", 
    "toxic", "necrotic", "psychic", "radiant", "sonic", "acid",
    "poison", "holy", "unholy", "force", "arcane", "bleed", "true",
    "physical", "elemental", "energy", "direct", "magic", "magical"
]);

function getValidDamageType(typeStr) {
    if (!typeStr || typeof typeStr !== "string") return null;
    const clean = typeStr.toLowerCase().trim();
    if (MYTHCRAFT_DAMAGE_TYPES.has(clean)) return clean;
    if (clean === "damage") return "damage";
    return null;
}

function extractDamageType(message, rolls, context) {
    const flagType = message?.flags?.["mythcraft-hud"]?.damageType;
    if (flagType && flagType !== "damage") return flagType;

    const normalizedRolls = (rolls ?? []).map(normalizeRollObject).filter(Boolean);
    for (const roll of normalizedRolls) {
        const optType = getValidDamageType(roll.options?.type || roll.options?.damageType);
        if (optType && optType !== "damage") return optType;
        const optFlavor = getValidDamageType(roll.options?.flavor);
        if (optFlavor && optFlavor !== "damage") return optFlavor;
    }
    const flavorText = ((message?.flavor || "") + " " + (context?.flavor || "")).toLowerCase();
    for (const dt of MYTHCRAFT_DAMAGE_TYPES) {
        if (new RegExp(`\\b${dt}\\b`, "i").test(flavorText)) {
            return dt;
        }
    }
    for (const roll of normalizedRolls) {
        if (roll.options?.type === "damage" || roll.options?.flavor === "damage") return "damage";
    }
    if (/\bdamage\b/i.test(flavorText) || message?.flags?.["mythcraft-hud"]?.isDamageRoll) {
        return "damage";
    }
    return "";
}

function checkDamageOrHealing(message, rolls, context) {
    const normalizedRolls = (rolls ?? []).map(normalizeRollObject).filter(Boolean);
    
    // Check if it's explicitly healing
    const hasHealOption = normalizedRolls.some(r => r.options?.isHeal === true || r.options?.type === "healing" || r.options?.type === "heal");
    const flavorText = ((message?.flavor || "") + " " + (context?.flavor || "") + " " + (context?.resultLabel || "")).toLowerCase();
    if (hasHealOption || /\b(heal|healing|regain hp|restore hp)\b/i.test(flavorText)) {
        return { isDamage: false, isHeal: true, damageType: "" };
    }

    // Check if this is an attribute check, skill check, save, or attack roll (NOT damage)
    const resultLabel = (context?.resultLabel || "").toUpperCase();
    const isNonDamageCheck = (
        resultLabel.includes("ATTRIBUTE CHECK") ||
        resultLabel.includes("SKILL CHECK") ||
        resultLabel.includes("SAVE CHECK") ||
        resultLabel.includes("ATTACK ROLL") ||
        resultLabel.includes("TABLE DRAW") ||
        normalizedRolls.some(r => r.class === "AttributeRoll" || r.options?.attribute || ["attribute", "skill", "save", "attack", "check"].includes(r.options?.type?.toLowerCase()))
    );

    // Explicit damage roll identification
    const hasExplicitDamageRoll = normalizedRolls.some(r => 
        r.options?.isHeal === false || 
        r.class === "DamageRoll" || 
        r.constructor?.name === "DamageRoll" ||
        getValidDamageType(r.options?.type || r.options?.damageType) !== null
    );

    const damageType = extractDamageType(message, rolls, context);

    if (hasExplicitDamageRoll) {
        return { isDamage: true, isHeal: false, damageType: damageType || "damage" };
    }

    if (!isNonDamageCheck && (damageType !== "" || /\bdamage\b/i.test(flavorText))) {
        return { isDamage: true, isHeal: false, damageType: damageType || "damage" };
    }

    return { isDamage: false, isHeal: false, damageType: "" };
}

function normalizeRollFlavor(flavor) {
    if (!flavor) return flavor;
    const attrNames = { str: "Strength", dex: "Dexterity", end: "Endurance", int: "Intelligence", awa: "Awareness", cha: "Charisma", lck: "Luck", lp: "Luck" };
    return flavor.replace(/\b(STR|DEX|END|INT|AWA|CHA|LCK|LP)\b/gi, match => attrNames[match.toLowerCase()] || match);
}

async function renderAnimatedRolls(message, html) {
    if (!message.rolls?.length) return;
    if (game.settings.get('mythcraft-hud', 'disableChatStyling')) return;

    // Check roll privacy: If blind and current user is not GM, non-GMs must NOT see roll dice animation or results!
    if (message.blind && !game.user.isGM) {
        return;
    }

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
    let { modifiers, bonus } = extractRollModifiersAndBonus(normalizedRolls, message);

    // Fail-safe calculation: if total != sum of dice results, a bonus definitely exists!
    const diceSum = diceResults.reduce((acc, d) => acc + (Number(d.result) || 0), 0);
    const mathDiff = total - diceSum;
    if ((!bonus || bonus.value === 0) && mathDiff !== 0) {
        bonus = {
            value: mathDiff,
            text: mathDiff >= 0 ? `+${mathDiff}` : `${mathDiff}`
        };
        if (modifiers.length === 0) {
            modifiers.push({
                label: "Modifier",
                value: mathDiff,
                text: bonus.text,
                cssClass: mathDiff >= 0 ? 'positive' : 'negative'
            });
        }
    }

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
        modifiers,
        bonus,
        bonusClass: bonus ? (bonus.value < 0 ? 'negative' : 'positive') : '',
        style: 'default',
        isNew: shouldAnimate
    };

    const content = await foundry.applications.handlebars.renderTemplate('modules/mythcraft-hud/templates/slot-machine.hbs', templateData);

    let statblockEl = html.querySelector('.mythcraft-statblock');
    let rollResultEl = statblockEl?.querySelector('.roll-result');
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
        statblockEl = wrapper;
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

    // Ensure Apply Damage / Healing button is present on the card if this is a damage/heal roll
    const initialFlavor = normalizeRollFlavor(message.flavor || normalizedRolls[0]?.options?.flavor || '');
    const rollContext = window.MythcraftHUD_getRollContext ? window.MythcraftHUD_getRollContext(initialFlavor, formula, normalizedRolls[0]?.options, normalizedRolls[0]) : { flavor: initialFlavor, resultLabel: "" };
    const { isDamage, isHeal, damageType } = checkDamageOrHealing(message, normalizedRolls, rollContext);

    if (isDamage || isHeal) {
        let btn = statblockEl.querySelector(isHeal ? '.apply-healing-btn' : '.apply-damage-btn');
        const typeLabel = damageType ? (damageType.toUpperCase() + ' ') : '';
        if (!btn) {
            const btnHtml = isHeal 
                ? `<div class="card-action-bar" style="padding: 0 8px 8px 8px;"><button class="apply-healing-btn" data-value="${total}"><i class="fas fa-heart"></i> APPLY HEALING (${total})</button></div>`
                : `<div class="card-action-bar" style="padding: 0 8px 8px 8px;"><button class="apply-damage-btn" data-value="${total}" data-damage-type="${damageType}"><i class="fas fa-bolt"></i> APPLY ${typeLabel}DAMAGE (${total})</button></div>`;
            const btnFrag = document.createRange().createContextualFragment(btnHtml);
            statblockEl.appendChild(btnFrag);
        } else {
            btn.dataset.value = total;
            if (damageType) btn.dataset.damageType = damageType;
            btn.innerHTML = isHeal ? `<i class="fas fa-heart"></i> APPLY HEALING (${total})` : `<i class="fas fa-bolt"></i> APPLY ${typeLabel}DAMAGE (${total})`;
        }
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
            const primaryWin = windows[0];
            const primarySlotEl = primaryWin?.querySelector('.js-slot-display');
            const bonusEl = container.querySelector('.slot-bonus-pill');
            if (totalEl) totalEl.classList.add('visible');
            if (bigValueEl) bigValueEl.textContent = total;

            const firstDieVal = Number(dice[0]?.result) || 0;

            const handleBonus = (currentVal) => {
                if (bonus && bonus.value !== 0 && primarySlotEl && bonusEl) {
                    bonusEl.textContent = bonus.text;
                    if (bonus.value < 0) {
                        bonusEl.classList.remove('positive');
                        bonusEl.classList.add('negative');
                    } else if (bonus.value > 0) {
                        bonusEl.classList.remove('negative');
                        bonusEl.classList.add('positive');
                    }
                    bonusEl.classList.add('visible');
                    const bonusHold = 750;
                    const countDuration = 600;
                    setTimeout(() => {
                        bonusEl.classList.add('merge');
                        animateNumber(primarySlotEl, currentVal, total, countDuration);
                        primarySlotEl.classList.add('pulse');
                        setTimeout(() => {
                            bonusEl.classList.remove('visible', 'merge');
                            primarySlotEl.classList.remove('pulse');
                        }, countDuration + 120);
                    }, bonusHold);
                }
            };

            // If there are multiple dice (e.g. 2d6, 3d4, etc.), combine them into the first square!
            if (windows.length > 1) {
                const combineHold = 600; // Hold individual results briefly so user can see what was rolled
                const combineDuration = 450;
                setTimeout(() => {
                    // Smoothly merge secondary windows into the first square
                    windows.slice(1).forEach(win => win.classList.add('merge-out'));
                    
                    // Animate first square counting up to the sum of all dice
                    if (primarySlotEl) {
                        animateNumber(primarySlotEl, firstDieVal, diceSum, combineDuration);
                        primarySlotEl.classList.add('pulse');
                        setTimeout(() => primarySlotEl.classList.remove('pulse'), combineDuration + 100);
                    }

                    // Once merge animation completes, completely hide extra windows from layout
                    setTimeout(() => {
                        windows.slice(1).forEach(win => win.classList.add('is-hidden'));
                    }, combineDuration);

                    // After dice combine, if there is a bonus modifier, apply it next
                    setTimeout(() => {
                        handleBonus(diceSum);
                    }, combineDuration + 200);
                }, combineHold);
            } else {
                // Single die: apply bonus directly if present
                handleBonus(firstDieVal);
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
        const windows = Array.from(rollResultEl.querySelectorAll('.slot-window'));
        const primarySlotEl = rollResultEl.querySelector('.slot-window:first-child .js-slot-display');
        
        if (windows.length > 1) {
            windows.slice(1).forEach(win => {
                win.classList.add('merge-out');
                win.classList.add('is-hidden');
            });
        }
        if (primarySlotEl) {
            primarySlotEl.textContent = total;
        }
        if (totalEl) totalEl.classList.add('visible');
        if (bigValueEl) bigValueEl.textContent = total;
    }
}

Hooks.on("init", () => {
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

    game.settings.register('mythcraft-hud', 'showCustomAttributes', {
        name: "Show Custom Attributes in HUD",
        hint: "Include custom character attributes (such as SAN / Sanity or homebrew attributes) in the HUD attribute bar.",
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => {
            if (game.mythHUD) game.mythHUD.render();
        }
    });

    game.settings.register('mythcraft-hud', 'hideHitMissInfo', {
        name: "Hide Hit/Miss Info from Players",
        hint: "When enabled, the target AR and Hit/Miss result of an attack roll will only be visible to the GM.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
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
    const attrNames = { str: "Strength", agi: "Agility", dex: "Dexterity", end: "Endurance", con: "Constitution", int: "Intelligence", awa: "Awareness", per: "Perception", wis: "Wisdom", cha: "Charisma", lck: "Luck", lp: "Luck", san: "Sanity" };
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
        return rawFlavor.replace(/\b(STR|DEX|END|INT|AWA|CHA|LCK|LP|SAN)\b/gi, match => attrNames[match.toLowerCase()] || match);
    };
    const _formatAttributeFlavor = (rawFlavor, attrKey, skillName) => {
        const key = attrKey || _attributeKeyFromFlavor(rawFlavor);
        const skill = skillName || (rawFlavor.match(/\(([^)]+)\)/)?.[1]);
        let baseName = key ? (attrNames[key] || mythcraft?.CONFIG?.attributes?.list?.[key]?.label || key) : _normalizeAttributeFlavorText((rawFlavor || "").trim());
        if (typeof baseName === "string" && baseName.endsWith(" Check")) {
            baseName = baseName.replace(/\s*Check\s*$/i, "").trim();
        }
        if (skill) {
            return `${baseName} Check (${skill})`;
        }
        return `${baseName} Check`;
    };

    const _getRollContext = (flavor, formula, rollOptions = {}, roll = {}) => {
        let resultLabel = "SYSTEM ROLL";
        let normalizedFlavor = (flavor || "").trim();
        const flavorLower = normalizedFlavor.toLowerCase();

        // 1. Mythcraft System AttributeRoll or explicit attribute option
        if (roll.class === "AttributeRoll" || rollOptions.attribute || roll.options?.attribute) {
            resultLabel = (roll.options?.skill || rollOptions.skill) ? "SKILL CHECK" : "ATTRIBUTE CHECK";
            const attrKey = (roll.options?.attribute || rollOptions.attribute || "").toLowerCase();
            const skillKey = (roll.options?.skill || rollOptions.skill || "");
            let skillName = "";
            if (skillKey && typeof mythcraft !== "undefined") {
                const skillCfg = mythcraft.CONFIG?.skills?.list?.[skillKey];
                if (skillCfg) {
                    const loc = game.i18n.localize(skillCfg.label);
                    skillName = (loc && !loc.startsWith("MYTHCRAFT.")) ? loc : (skillCfg.label || skillKey);
                }
            }
            normalizedFlavor = _formatAttributeFlavor(normalizedFlavor, attrKey, skillName);
            return { resultLabel, flavor: normalizedFlavor || "Attribute Check" };
        }

        // 2. Explicit Healing
        if (rollOptions.isHeal === true || rollOptions.type === "healing" || rollOptions.type === "heal" || flavorLower.includes("healing")) {
            resultLabel = "HEALING ROLL";
            if (!normalizedFlavor || normalizedFlavor === "Roll" || normalizedFlavor === "System Roll") {
                normalizedFlavor = "Healing";
            }
            return { resultLabel, flavor: normalizedFlavor };
        }

        // 3. Formula Detection for @attributes, @skills, @saves
        const attrMatch = (formula || "").match(/@(attributes?|abilities?|ability)\.([a-zA-Z0-9_]+)/i);
        const skillMatch = (formula || "").match(/@skills?\.([a-zA-Z0-9_\-]+)/i);
        const saveMatch = (formula || "").match(/@saves?\.([a-zA-Z0-9_]+)/i);

        if (attrMatch) {
            const attrKey = attrMatch[2].toLowerCase();
            normalizedFlavor = _formatAttributeFlavor(normalizedFlavor, attrKey);
            resultLabel = "ATTRIBUTE CHECK";
            return { resultLabel, flavor: normalizedFlavor };
        }
        if (skillMatch) {
            const skillKey = skillMatch[1].toLowerCase();
            const skillName = skillKey.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            resultLabel = "SKILL CHECK";
            if (!normalizedFlavor || normalizedFlavor === "Roll" || normalizedFlavor === "System Roll" || normalizedFlavor.trim() === "") {
                normalizedFlavor = `${skillName} Check`;
            }
            return { resultLabel, flavor: normalizedFlavor };
        }
        if (saveMatch) {
            const saveKey = saveMatch[1].toLowerCase();
            const saveName = saveKey.charAt(0).toUpperCase() + saveKey.slice(1);
            resultLabel = "SAVE CHECK";
            if (!normalizedFlavor || normalizedFlavor === "Roll" || normalizedFlavor === "System Roll" || normalizedFlavor.trim() === "") {
                normalizedFlavor = `${saveName} Save`;
            }
            return { resultLabel, flavor: normalizedFlavor };
        }

        // 4. Specific or Explicit Damage Roll
        const validDmgType = getValidDamageType(rollOptions.type || rollOptions.damageType);
        const isExplicitDamage = rollOptions.isHeal === false || roll.class === "DamageRoll" || roll.constructor?.name === "DamageRoll" || validDmgType !== null;

        if (isExplicitDamage) {
            const rawType = validDmgType || getValidDamageType(rollOptions.flavor) || extractDamageType({ flavor: normalizedFlavor }, [roll], {}) || "damage";
            if (rawType && rawType !== "damage") {
                const capitalized = rawType.charAt(0).toUpperCase() + rawType.slice(1);
                resultLabel = `${capitalized.toUpperCase()} DAMAGE`;
                normalizedFlavor = `${capitalized} Damage`;
            } else {
                resultLabel = "DAMAGE ROLL";
                if (!normalizedFlavor || normalizedFlavor === "Roll" || normalizedFlavor === "System Roll") {
                    normalizedFlavor = "Damage Roll";
                }
            }
            return { resultLabel, flavor: normalizedFlavor };
        }

        // 5. Keyword Detection in Flavor
        const attributes = ["strength", "str", "agility", "agi", "dexterity", "dex", "endurance", "end", "constitution", "con", "stamina", "intelligence", "int", "awareness", "awa", "perception", "per", "wisdom", "wis", "charisma", "cha", "luck", "lck"];

        if (normalizedFlavor.includes("attribute") || normalizedFlavor.includes("ability")) {
            resultLabel = "ATTRIBUTE CHECK";
        } else if (normalizedFlavor.includes("save")) {
            resultLabel = "SAVE CHECK";
        } else if (normalizedFlavor.includes("skill")) {
            resultLabel = "SKILL CHECK";
        } else if (normalizedFlavor.includes("attack")) {
            resultLabel = "ATTACK ROLL";
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
        const context = _getRollContext(initialFlavor, formula, roll.options, roll);
        let flavor = normalizeRollFlavor(context.flavor);

        const isBlindForUser = message.blind && !game.user.isGM;
        const existingCard = html.querySelector('.mythcraft-statblock');

        const actor = message.speaker?.actor ? game.actors?.get(message.speaker.actor) : (canvas?.tokens?.get ? canvas.tokens.get(message.speaker?.token)?.actor : null) || game.user?.character;
        const item = findItemFromChatMessage(message, actor);

        let descHtml = "";
        let resourceRowHtml = "";
        let spellButtonsHtml = "";
        if (item && (item.type === "spell" || item.type === "feature")) {
            const desc = item.system?.description?.value || item.system?.description || "";
            if (desc) {
                descHtml = `<div class="card-desc scrollable" style="max-height: 220px; overflow-y: auto; padding: 6px 8px; font-size: 0.85rem; border-top: 1px solid rgba(42, 122, 127, 0.4); margin-top: 6px; line-height: 1.35; color: rgba(255, 255, 255, 0.85);">${desc}</div>`;
            }
            if (item.type === "spell") {
                const spCost = calculateItemSP(item);
                const apCost = calculateItemAPC(item, actor);
                if (spCost > 0 || apCost > 0) {
                    resourceRowHtml = `<div class="spell-resource-row" style="display: flex; gap: 10px; align-items: center; padding: 4px 8px; font-size: 0.82rem; color: #9bd7e5; border-bottom: 1px solid rgba(42, 122, 127, 0.25);">`;
                    if (spCost > 0) {
                        resourceRowHtml += `<span class="sp-spent">SP Cost: <strong>${spCost}</strong></span>`;
                    }
                    if (apCost > 0) {
                        resourceRowHtml += `<span class="ap-spent">AP Cost: <strong>${apCost}</strong></span>`;
                    }
                    resourceRowHtml += `</div>`;
                }
                spellButtonsHtml = generateSpellEffectButtons(item, actor);
            }
        }

        const { isDamage, isHeal, damageType } = checkDamageOrHealing(message, message.rolls, context);
        let buttonHtml = "";
        const typeLabel = damageType ? (damageType.toUpperCase() + ' ') : '';
        if (!isBlindForUser && (isDamage || isHeal)) {
            buttonHtml = isHeal 
                ? `<div class="card-action-bar" style="padding: 0 8px 8px 8px;"><button class="apply-healing-btn" data-value="${total}"><i class="fas fa-heart"></i> APPLY HEALING (${total})</button></div>`
                : `<div class="card-action-bar" style="padding: 0 8px 8px 8px;"><button class="apply-damage-btn" data-value="${total}" data-damage-type="${damageType}"><i class="fas fa-bolt"></i> APPLY ${typeLabel}DAMAGE (${total})</button></div>`;
        }

        const resultBlock = isBlindForUser 
            ? `<div class="secret"><div class="roll-value">???</div><div class="roll-formula">Blind GM Roll</div></div>`
            : `
                <div class="roll-value">${total}</div>
                <div class="roll-formula">${formula}</div>
            `;

        if (existingCard) {
            const headerEl = existingCard.querySelector('.card-header');
            if (headerEl && headerEl.textContent.trim() !== flavor) headerEl.textContent = flavor;
            if (buttonHtml && !existingCard.querySelector('.apply-damage-btn, .apply-healing-btn')) {
                const btnFrag = document.createRange().createContextualFragment(buttonHtml);
                existingCard.appendChild(btnFrag);
            }
            if (descHtml && !existingCard.querySelector('.card-desc')) {
                const descFrag = document.createRange().createContextualFragment(descHtml);
                existingCard.appendChild(descFrag);
            }
            if (spellButtonsHtml && !existingCard.querySelector('.roll-spell-damage-btn')) {
                const spBtnFrag = document.createRange().createContextualFragment(spellButtonsHtml);
                existingCard.appendChild(spBtnFrag);
            }
            return true;
        }

        const target = html.querySelector('.message-content') || html;
        const newContent = `
                <div class="mythcraft-statblock${item?.type === 'spell' ? ' spell-card' : ''}">
                    <div class="card-header">${flavor}</div>
                    ${resourceRowHtml}
                    <div class="roll-result">
                        ${resultBlock}
                    </div>
                    <div class="dice-roll"></div>
                    ${descHtml}
                    ${spellButtonsHtml}
                    ${buttonHtml}
                </div>`;

        target.innerHTML = newContent;
        return true;
    };

    Hooks.on('renderChatMessageHTML', async (message, html) => {
        const handled = _styleChatMessage(message, html);
        if (message.rolls?.length) {
            await renderAnimatedRolls(message, html);
        } else {
            // Check if this is a sheet spell card without rolls
            const actor = message.speaker?.actor ? game.actors?.get(message.speaker.actor) : (canvas?.tokens?.get ? canvas.tokens.get(message.speaker?.token)?.actor : null) || game.user?.character;
            const item = findItemFromChatMessage(message, actor);
            if (item && item.type === "spell" && !html.querySelector('.mythcraft-statblock')) {
                const desc = item.system?.description?.value || item.system?.description || "";
                const spCost = calculateItemSP(item);
                const apCost = calculateItemAPC(item, actor);
                let resourceRowHtml = "";
                if (spCost > 0 || apCost > 0) {
                    resourceRowHtml = `<div class="spell-resource-row" style="display: flex; gap: 10px; align-items: center; padding: 4px 8px; font-size: 0.82rem; color: #9bd7e5; border-bottom: 1px solid rgba(42, 122, 127, 0.25);">`;
                    if (spCost > 0) resourceRowHtml += `<span class="sp-spent">SP Cost: <strong>${spCost}</strong></span>`;
                    if (apCost > 0) resourceRowHtml += `<span class="ap-spent">AP Cost: <strong>${apCost}</strong></span>`;
                    resourceRowHtml += `</div>`;
                }
                const spellButtonsHtml = generateSpellEffectButtons(item, actor);
                const target = html.querySelector('.message-content') || html;
                target.innerHTML = `
                    <div class="mythcraft-statblock spell-card">
                        <div class="card-header">${item.name}</div>
                        ${resourceRowHtml}
                        <div class="card-desc scrollable" style="max-height: 220px; overflow-y: auto; padding: 6px 8px; font-size: 0.85rem; line-height: 1.35; color: rgba(255, 255, 255, 0.85);">${desc}</div>
                        ${spellButtonsHtml}
                    </div>`;
            }
        }
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
            const actor = d.speaker?.actor ? game.actors?.get(d.speaker.actor) : (canvas?.tokens?.get ? canvas.tokens.get(d.speaker?.token)?.actor : null) || game.user?.character;
            const item = findItemFromChatMessage(d, actor);

            // Check if this roll is from a spell that is NOT a magic attack roll
            if (item && item.type === "spell") {
                const desc = item.system?.description?.value || item.system?.description || "";
                const cleanText = desc.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const isMagicAttack = /make a(?:n)?\s+magic\s+attack\s+roll|make a(?:n)?\s+magic\s+attack|magic\s+attack\s+roll/.test(cleanText);

                if (!isMagicAttack) {
                    // NON-ATTACK SPELL: Suppress dice roll completely!
                    const spCost = calculateItemSP(item);
                    const apCost = calculateItemAPC(item, actor);

                    let resourceRowHtml = "";
                    if (spCost > 0 || apCost > 0) {
                        resourceRowHtml = `<div class="spell-resource-row" style="display: flex; gap: 10px; align-items: center; padding: 4px 8px; font-size: 0.82rem; color: #9bd7e5; border-bottom: 1px solid rgba(42, 122, 127, 0.25);">`;
                        if (spCost > 0) resourceRowHtml += `<span class="sp-spent">SP Cost: <strong>${spCost}</strong></span>`;
                        if (apCost > 0) resourceRowHtml += `<span class="ap-spent">AP Cost: <strong>${apCost}</strong></span>`;
                        resourceRowHtml += `</div>`;
                    }

                    const spellButtonsHtml = generateSpellEffectButtons(item, actor);

                    const newContent = `
                        <div class="mythcraft-statblock spell-card">
                            <div class="card-header">${item.name}</div>
                            ${resourceRowHtml}
                            <div class="card-desc scrollable" style="max-height: 220px; overflow-y: auto; padding: 6px 8px; font-size: 0.85rem; line-height: 1.35; color: rgba(255, 255, 255, 0.85);">${desc}</div>
                            ${spellButtonsHtml}
                        </div>`;

                    const updateData = {
                        content: newContent,
                        flavor: item.name,
                        rolls: [],
                        sound: null,
                        flags: {
                            ...(d.flags ?? {}),
                            "mythcraft-hud": {
                                ...(d.flags?.["mythcraft-hud"] ?? {}),
                                isNonAttackSpell: true,
                                isSpellCast: true,
                                itemId: item.id
                            }
                        }
                    };

                    if (CONST.CHAT_MESSAGE_STYLES) updateData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
                    else if (CONST.CHAT_MESSAGE_TYPES) updateData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;

                    message.updateSource(updateData);
                    return;
                }
            }

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
            let context = _getRollContext(initialFlavor, formula, roll.options, roll);
            let flavor = normalizeRollFlavor(context.flavor);

            // If the roll is coming from our ActionHandler, it won't have the rich context.
            // We re-run the context getter here to ensure the title is always correct.
            const handlerContext = window.MythcraftHUD_getRollContext(d.flavor, formula, roll.options, roll);
            if (handlerContext?.flavor) flavor = handlerContext.flavor;

            const chatRollMode = getActiveRollMode(d.rollMode || message.rollMode);
            const isBlind = chatRollMode === "blindroll" || Boolean(d.blind);

            const updateData = {};
            if (chatRollMode === "blindroll") {
                updateData.blind = true;
                updateData.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id ?? u);
            } else if (chatRollMode === "gmroll") {
                updateData.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id ?? u);
                updateData.blind = false;
            } else if (chatRollMode === "selfroll") {
                updateData.whisper = [game.user.id];
                updateData.blind = false;
            } else {
                updateData.whisper = [];
                updateData.blind = false;
            }

            const { isDamage, isHeal, damageType } = checkDamageOrHealing(d, d.rolls, context);
            let buttonHtml = "";
            const typeLabel = damageType ? (damageType.toUpperCase() + ' ') : '';
            if (isHeal) {
                buttonHtml = `<div class="card-action-bar" style="padding: 0 8px 8px 8px;"><button class="apply-healing-btn" data-value="${total}"><i class="fas fa-heart"></i> APPLY HEALING (${total})</button></div>`;
            } else if (isDamage) {
                buttonHtml = `<div class="card-action-bar" style="padding: 0 8px 8px 8px;"><button class="apply-damage-btn" data-value="${total}" data-damage-type="${damageType}"><i class="fas fa-bolt"></i> APPLY ${typeLabel}DAMAGE (${total})</button></div>`;
            }

            // Determine if the roll is a critical success or failure.
            let resultClass = "";
            const d20Term = roll.terms.find(t => t.faces === 20);
            if (d20Term) {
                const result = d20Term.results?.find(r => r.active) || d20Term.results?.[0];
                if (result) {
                    const d20 = result.result;
                    if (d20 === 20) {
                        resultClass = "crit-success";
                    } else if (d20 === 1) {
                        resultClass = "crit-fail";
                    }
                }
            }

            // Ensure the bonus is always available for animation, even on sheet rolls.
            if (!roll.options.mythcraftBonusValue) {
                const bonusTerm = roll.terms.find(t => t instanceof foundry.dice.terms.NumericTerm && !t.options?.flavor);
                if (bonusTerm) {
                    // Correctly parse the bonus value, respecting its sign.
                    // The term's operator is stored separately, so we need to combine them.
                    const sign = (bonusTerm.operator || '+').trim() === '-' ? -1 : 1;
                    const bonusValue = bonusTerm.number * sign;
                    roll.options.mythcraftBonusValue = bonusValue;
                    roll.options.mythcraftBonusText = (bonusValue >= 0 ? `+${bonusValue}` : `${bonusValue}`);
                }
            }

            // Prepare the custom HTML for the chat card.
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

            updateData.content = newContent;
            updateData.flavor = ""; // Clear flavor to avoid duplication.

            // V12+ replaced ChatMessage types with styles. V14 strictly enforces schemas.
            if (CONST.CHAT_MESSAGE_STYLES) {
                updateData.style = CONST.CHAT_MESSAGE_STYLES.OTHER;
            } else if (CONST.CHAT_MESSAGE_TYPES) {
                updateData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;
            }

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

    // Render Theming and Automations headers in Settings Config
    Hooks.on('renderSettingsConfig', (app, html) => {
        const root = html instanceof HTMLElement ? html : (html[0] || html);
        if (!root) return;

        const headerStyle = 'font-size: 1.05rem; font-weight: 700; border-bottom: 1.5px solid rgba(42, 122, 127, 0.7); color: #9bd7e5; margin: 12px 0 6px 0; padding-bottom: 3px; display: flex; align-items: center; gap: 6px; width: 100%;';

        // 1. Theming Header
        const targetTheming = root.querySelector('[data-setting-id="mythcraft-hud.hudScale"]') ||
                              root.querySelector('[name="mythcraft-hud.hudScale"]')?.closest('.form-group');
        if (targetTheming && !root.querySelector('.mythcraft-theming-header')) {
            const themingHeader = document.createElement('h4');
            themingHeader.className = 'mythcraft-theming-header';
            themingHeader.innerHTML = '<i class="fas fa-palette"></i> Theming';
            themingHeader.style.cssText = headerStyle;
            targetTheming.parentNode.insertBefore(themingHeader, targetTheming);
        }

        // 2. Automations Header
        const targetAutomations = root.querySelector('[data-setting-id="mythcraft-hud.spellSPMode"]') ||
                                  root.querySelector('[data-setting-id="mythcraft-hud.movementAPMode"]') ||
                                  root.querySelector('[name="mythcraft-hud.spellSPMode"]')?.closest('.form-group') ||
                                  root.querySelector('[name="mythcraft-hud.movementAPMode"]')?.closest('.form-group');
        if (targetAutomations && !root.querySelector('.mythcraft-automations-header')) {
            const autoHeader = document.createElement('h4');
            autoHeader.className = 'mythcraft-automations-header';
            autoHeader.innerHTML = '<i class="fas fa-robot"></i> Automations';
            autoHeader.style.cssText = headerStyle;
            targetAutomations.parentNode.insertBefore(autoHeader, targetAutomations);
        }
    });

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

    // Listener for Spell Damage / Healing buttons on spell cards
    $(document).on('click', '.roll-spell-damage-btn', async function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const formula = this.dataset.formula;
        const type = this.dataset.damageType;
        const isHeal = this.dataset.isHeal === "true";
        const actorUuid = this.dataset.actorUuid;

        let actor = null;
        if (actorUuid) {
            actor = await fromUuid(actorUuid);
        }
        if (!actor) {
            actor = game.user?.character || canvas?.tokens?.controlled?.[0]?.actor;
        }

        // Resolve @ attributes if present in formula
        let resolvedFormula = formula;
        if (formula && formula.includes("@") && actor) {
            resolvedFormula = formula.replace(/@([a-zA-Z0-9_]+)/g, (match, key) => {
                const val = actor.system?.attributes?.[key]?.value ?? actor.system?.[key]?.value ?? actor.system?.[key] ?? 0;
                return val;
            });
        }

        resolvedFormula = (resolvedFormula || "0").trim();

        // Create Roll instance and evaluate immediately
        const roll = new Roll(resolvedFormula, actor?.getRollData?.() || {});
        await roll.evaluate();

        const typeLabel = (type && type !== "damage") ? type.toUpperCase() : "DAMAGE";
        const flavor = isHeal ? "HEALING ROLL" : `${typeLabel} DAMAGE`;

        const msgEl = this.closest?.("[data-message-id]");
        const parentMsg = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
        let rollMode = parentMsg?.blind ? "blindroll" : (parentMsg?.whisper?.length ? "gmroll" : null);
        rollMode = getActiveRollMode(rollMode);

        const msgData = {
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: flavor,
            flags: {
                "mythcraft-hud": {
                    isDamageRoll: !isHeal,
                    isHealingRoll: isHeal,
                    damageType: type || "damage",
                    processedAP: true // Do not deduct AP on damage rolls
                }
            }
        };
        ChatMessage.applyRollMode(msgData, rollMode);
        await roll.toMessage(msgData, { rollMode });
    });

    // Listeners for Apply Buttons (Damage/Healing)
    $(document).on('click', '.apply-damage-btn', async function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const val = parseInt(this.dataset.value);
        if (isNaN(val)) return;
        const dmgType = this.dataset.damageType || "";
        const targets = canvas.tokens?.controlled ?? [];
        if (!targets.length) return ui.notifications.warn("No tokens selected. Please select one or more tokens on the canvas.");

        for (const t of targets) {
            const actor = t.actor;
            if (!actor) continue;
            if (typeof actor.takeDamage === "function") {
                await actor.takeDamage(val, { type: dmgType });
            } else if (typeof actor.system?.takeDamage === "function") {
                await actor.system.takeDamage(val, { type: dmgType });
            } else {
                const hp = Number(actor.system.hp?.value) || 0;
                const newHp = Math.max(0, hp - val);
                await actor.update({ "system.hp.value": newHp });
                const typeLabel = dmgType ? `${dmgType.charAt(0).toUpperCase() + dmgType.slice(1)} ` : '';
                ui.notifications.info(`Applied ${val} ${typeLabel}damage to ${actor.name} (${hp} \u2192 ${newHp} HP)`);
            }
        }
    });

    $(document).on('click', '.apply-healing-btn', async function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const val = parseInt(this.dataset.value);
        if (isNaN(val)) return;
        const targets = canvas.tokens?.controlled ?? [];
        if (!targets.length) return ui.notifications.warn("No tokens selected. Please select one or more tokens on the canvas.");

        for (const t of targets) {
            const actor = t.actor;
            if (!actor) continue;
            const hp = Number(actor.system.hp?.value) || 0;
            const max = Number(actor.system.hp?.max) || hp;
            const newHp = Math.min(max, hp + val);
            await actor.update({ "system.hp.value": newHp });
            ui.notifications.info(`Applied ${val} healing to ${actor.name} (${hp} \u2192 ${newHp} HP)`);
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
            if ((canvas?.tokens?.controlled?.length ?? 0) === 0) {
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

    // --- COMBAT & TOKEN AP OVERLAY HOOKS ---
    // Update AP visual display when turn changes
    Hooks.on('updateCombat', async (combat, updateData, options, userId) => {
        combat.combatants.forEach(c => {
            if (c.token?.object) updateTokenAP(c.token.object);
        });
    });

    Hooks.on('deleteCombat', async (combat) => {
        resetTurnMovementStride();
        canvas?.tokens?.placeables?.forEach(t => updateTokenAP(t));
    });
});

const turnMovementTracker = new Map();

function resetTurnMovementStride(actorId = null) {
    if (actorId) {
        for (const [key, val] of turnMovementTracker.entries()) {
            if (val.actorId === actorId) {
                turnMovementTracker.delete(key);
            }
        }
    } else {
        turnMovementTracker.clear();
    }
}

function findItemFromChatMessage(msg, actor) {
    if (!actor) return null;

    // 1. Check direct flags or speaker item
    const itemId = msg.flags?.mythcraft?.itemId || 
                   msg.flags?.["mythcraft"]?.itemId || 
                   msg.flags?.mythcraft?.item?._id ||
                   msg.flags?.mythcraft?.item?.id ||
                   msg.speaker?.item || 
                   msg.flags?.item?.id || 
                   (msg.getFlag ? (msg.getFlag('mythcraft', 'itemId') || msg.getFlag('mythcraft', 'item')) : null);

    if (itemId) {
        const idStr = typeof itemId === 'object' ? (itemId.id || itemId._id) : itemId;
        const byId = actor.items.get(idStr);
        if (byId) return byId;
    }

    // 2. Check HTML content for data-item-id
    if (msg.content) {
        const match = msg.content.match(/data-item-id=["']([a-zA-Z0-9]+)["']/i);
        if (match && match[1]) {
            const byContentId = actor.items.get(match[1]);
            if (byContentId) return byContentId;
        }
    }

    // 3. Check flavor text against actor's items
    const flavor = (msg.flavor || msg.rolls?.[0]?.options?.flavor || '').toLowerCase().trim();
    if (flavor && !flavor.includes("initiative")) {
        // Exact match or startsWith
        const exact = actor.items.find(i => i.name && (flavor === i.name.toLowerCase() || flavor.startsWith(i.name.toLowerCase())));
        if (exact) return exact;

        // Substring match only for specific non-generic item names (>= 3 chars)
        const included = actor.items.find(i => i.name && i.name.length >= 3 && flavor.includes(i.name.toLowerCase()));
        if (included) return included;
    }

    // 4. Check roll options item or flavor
    const rollFlavor = (msg.rolls?.[0]?.options?.flavor || '').toLowerCase().trim();
    if (rollFlavor && !rollFlavor.includes("initiative")) {
        const rollItem = actor.items.find(i => i.name && (rollFlavor === i.name.toLowerCase() || (i.name.length >= 3 && rollFlavor.includes(i.name.toLowerCase()))));
        if (rollItem) return rollItem;
    }

    return null;
}

function calculateItemAPC(item, actor) {
    if (!item) return 0;

    // 1. ActionHandler calculation (handles raw formulas, min/max text, and safe attribute references)
    if (ActionHandler && ActionHandler.calculateAPC) {
        try {
            const cost = ActionHandler.calculateAPC(item, actor);
            if (Number.isFinite(cost) && cost > 0) return cost;
        } catch (e) {}
    }

    // 2. Direct properties on item.system
    const directProps = [
        "system.apc.value",
        "system.apCost",
        "system.apCost.value",
        "system.ap",
        "system.ap.value",
        "system.cost",
        "system.cost.value",
        "system.actionCost"
    ];
    for (const prop of directProps) {
        const val = foundry.utils.getProperty(item, prop);
        if (val !== undefined && val !== null && !isNaN(val) && Number(val) > 0) {
            return Number(val);
        }
    }

    // 3. Dynamic formula evaluation
    let formula = item._source?.system?.apcFormula || item.system?.apcFormula || item.system?.apc_formula;
    if (formula && actor) {
        formula = String(formula).trim();
        const minMatch = formula.match(/^(.*?)[,\s]+min\s+(\d+)$/i);
        if (minMatch) formula = `Math.max(${minMatch[1]}, ${minMatch[2]})`;
        const maxMatch = formula.match(/^(.*?)[,\s]+max\s+(\d+)$/i);
        if (maxMatch) formula = `Math.min(${maxMatch[1]}, ${maxMatch[2]})`;

        formula = formula.replace(/@(\w+)/g, (match, code) => {
            const attr = actor.system?.attributes?.[code]?.value ?? actor.system?.[code]?.value ?? actor.system?.[code] ?? 0;
            return Number(attr) || 0;
        });
        formula = formula.replace(/max\(/g, "Math.max(").replace(/min\(/g, "Math.min(");
        try {
            const evalFunc = new Function('return ' + formula);
            const res = Number(evalFunc());
            if (Number.isFinite(res) && res > 0) return res;
        } catch (e) {}
    }

    return 0;
}

function calculateItemSP(item) {
    if (!item) return 0;
    const spProps = [
        "system.spc",
        "system.spc.value",
        "system.spCost",
        "system.spCost.value",
        "system.sp",
        "system.sp.value",
        "system.cost",
        "system.cost.value",
        "system.actionCost"
    ];
    for (const prop of spProps) {
        const val = foundry.utils.getProperty(item, prop);
        if (val !== undefined && val !== null && !isNaN(val) && Number(val) > 0) {
            return Number(val);
        }
    }

    if (ActionHandler && ActionHandler.calculateItemSP) {
        try {
            const cost = ActionHandler.calculateItemSP(item);
            if (Number.isFinite(cost) && cost > 0) return cost;
        } catch (e) {}
    }

    // Fallback: Check description for SP cost pattern
    const desc = (item.system?.description?.value || item.system?.description || "").replace(/<[^>]*>/g, ' ');
    const spMatch = desc.match(/(?:(?:SP(?:\s*Cost)?|Cost):?\s*(\d+)|(\d+)\s*SP\b)/i);
    if (spMatch) {
        const cost = parseInt(spMatch[1] || spMatch[2]);
        if (!isNaN(cost) && cost > 0) return cost;
    }

    return 0;
}

const VALID_DAMAGE_TYPES = [
    "sharp", "blunt", "cold", "corrosive", "fire", "lightning", 
    "toxic", "necrotic", "psychic", "radiant", "sonic", "acid",
    "poison", "holy", "unholy", "force", "bleed", "true",
    "physical", "elemental", "energy", "direct", "damage"
];

function generateSpellEffectButtons(item, actor) {
    if (!item) return "";
    const desc = (item.system?.description?.value || item.system?.description || "");
    const cleanDesc = desc
        .replace(/<\/(?:p|li|div|tr|h\d)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/[ \t]+/g, ' ');

    let buttonsHtml = "";
    const foundFormulas = new Set();
    const actorUuid = actor?.uuid ?? "";

    const createBtn = (formula, type, isHealing = false, customLabel = null) => {
        const rawType = (type || 'damage').toLowerCase();
        const typeLabel = rawType.toUpperCase();
        let label = customLabel;
        if (!label) {
            label = isHealing ? 'ROLL HEAL' : (rawType !== 'damage' ? `ROLL ${typeLabel} DAMAGE` : 'ROLL DAMAGE');
        }
        const icon = isHealing ? 'fa-heart' : 'fa-bolt';
        const btnClass = isHealing ? 'healing' : 'damage';
        const color = isHealing ? '#2ecc71' : '#e74c3c';
        const bg = isHealing ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)';

        return `
            <div class="hud-action-button ${btnClass}" style="margin: 4px 0;">
                <button type="button" class="roll-spell-damage-btn" data-formula="${formula}" data-damage-type="${rawType}" data-is-heal="${isHealing}" data-actor-uuid="${actorUuid}" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: ${bg}; border: 1px solid ${color}; border-radius: 4px; color: #fdfaf3; font-family: inherit; font-size: 0.83rem; font-weight: bold; cursor: pointer; transition: all 0.2s ease;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class="fas ${icon}" style="margin-right: 6px;"></i>${label}</span>
                    <span style="font-family: monospace; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 3px; font-size: 0.82rem; white-space: nowrap; flex-shrink: 0; margin-left: 8px;">${formula}</span>
                </button>
            </div>
        `;
    };

    // 1. Detect base damage formula and damage type from item or description
    let baseDamageType = item.system?.damage?.type || null;
    let baseDamageFormula = item.system?.damage?.formula || null;

    if (!baseDamageFormula) {
        const inlineDmgMatch = cleanDesc.match(/\[\[\s*\/(?:damage|r|roll)\s+(\d+d\d+(?:\s*[+\-]\s*\d+)?)(?:\s+([a-zA-Z]+))?/i);
        if (inlineDmgMatch) {
            baseDamageFormula = inlineDmgMatch[1];
            if (inlineDmgMatch[2] && VALID_DAMAGE_TYPES.includes(inlineDmgMatch[2].toLowerCase())) {
                baseDamageType = inlineDmgMatch[2].toLowerCase();
            }
        }
    }

    if (!baseDamageFormula) {
        const baseDmgMatch = cleanDesc.match(/(?:deal|deals|taking|takes|causing|causes|inflicts?)\s*(?:\[\[(?:\/r\s*)?(\d+d\d+(?:\s*[+\-]\s*\d+)?)\]\]|(\d+d\d+(?:\s*[+\-]\s*\d+)?))\s*([a-zA-Z]+)?\s*damage/i);
        if (baseDmgMatch) {
            baseDamageFormula = baseDmgMatch[1] || baseDmgMatch[2];
            if (baseDmgMatch[3] && VALID_DAMAGE_TYPES.includes(baseDmgMatch[3].toLowerCase())) {
                baseDamageType = baseDmgMatch[3].toLowerCase();
            }
        }
    }
    if (!baseDamageType) {
        for (const dtype of VALID_DAMAGE_TYPES) {
            if (dtype === "damage") continue;
            const regex = new RegExp(`\\b${dtype}\\s+damage\\b`, 'i');
            if (regex.test(cleanDesc)) {
                baseDamageType = dtype;
                break;
            }
        }
    }
    baseDamageType = baseDamageType || "damage";

    // 2. Parse magic power scaling tiers (e.g. Arcane Power 18: +1d10 damage. or total: [[/r 2d10]])
    let baseDiceCount = 1;
    let baseDiceFaces = 10;
    if (baseDamageFormula) {
        const dfMatch = baseDamageFormula.match(/(\d+)d(\d+)/i);
        if (dfMatch) {
            baseDiceCount = parseInt(dfMatch[1], 10);
            baseDiceFaces = parseInt(dfMatch[2], 10);
        }
    }

    const scalingTiers = [];
    let accumulatedDiceCount = baseDiceCount;

    const lines = cleanDesc.split(/[\n•;]+/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        const lineMatch = line.match(/(?:([a-zA-Z]+)\s+)?Power\s+(\d+)\s*:\s*(.*)/i);
        if (!lineMatch) continue;
        const source = (lineMatch[1] || item.system?.magicSource || 'arcane').toLowerCase();
        const powerReq = parseInt(lineMatch[2], 10);
        const text = lineMatch[3];

        const totalMatch = text.match(/total:\s*(?:\[\[(?:\/r\s*)?(\d+d\d+(?:\s*[+\-]\s*\d+)?)\]\]|(\d+d\d+(?:\s*[+\-]\s*\d+)?))/i);
        const plusMatch = text.match(/\+\s*(?:\[\[(?:\/r\s*)?(\d+d\d+)\]\]|(\d+d\d+))\s*damage/i);

        if (totalMatch) {
            const totalFormula = totalMatch[1] || totalMatch[2];
            scalingTiers.push({ source, powerReq, formula: totalFormula, label: `Power ${powerReq}` });
        } else if (plusMatch) {
            const extraDiceStr = plusMatch[1] || plusMatch[2];
            const edMatch = extraDiceStr.match(/(\d+)d(\d+)/i);
            if (edMatch) {
                accumulatedDiceCount += parseInt(edMatch[1], 10);
                scalingTiers.push({ source, powerReq, formula: `${accumulatedDiceCount}d${baseDiceFaces}`, label: `Power ${powerReq}` });
            }
        }
    }

    // 3. Render buttons based on Actor type
    const isCharacter = actor?.type === "character";

    if (scalingTiers.length > 0) {
        if (isCharacter) {
            // Automate scaled damage based on character's power level — EXACTLY ONE BUTTON for character
            const magicSource = (item.system?.magicSource || scalingTiers[0]?.source || "arcane").toLowerCase();
            const currentPower = Number(actor.system?.powerLevel?.[magicSource] ?? 0);

            // Find highest unlocked tier
            const qualifiedTiers = scalingTiers.filter(t => t.powerReq <= currentPower).sort((a, b) => b.powerReq - a.powerReq);
            let activeFormula = baseDamageFormula || (baseDiceCount + "d" + baseDiceFaces);

            if (qualifiedTiers.length > 0) {
                const highest = qualifiedTiers[0];
                activeFormula = highest.formula || activeFormula;
            }

            const typeLabel = baseDamageType !== 'damage' ? `ROLL ${baseDamageType.toUpperCase()} DAMAGE` : 'ROLL DAMAGE';
            buttonsHtml += createBtn(activeFormula, baseDamageType, false, typeLabel);
            return buttonsHtml;
        } else {
            // For NPCs: Give GM multiple buttons for each variation with clean formatting
            if (baseDamageFormula) {
                const typeLabel = baseDamageType !== 'damage' ? `ROLL ${baseDamageType.toUpperCase()} DAMAGE` : 'ROLL DAMAGE';
                buttonsHtml += createBtn(baseDamageFormula, baseDamageType, false, `${typeLabel} (Base)`);
                foundFormulas.add(baseDamageFormula.toLowerCase());
            }
            for (const tier of scalingTiers) {
                if (tier.formula && !foundFormulas.has(tier.formula.toLowerCase())) {
                    const typeLabel = baseDamageType !== 'damage' ? `ROLL ${baseDamageType.toUpperCase()} DAMAGE` : 'ROLL DAMAGE';
                    buttonsHtml += createBtn(tier.formula, baseDamageType, false, `${typeLabel} (${tier.label})`);
                    foundFormulas.add(tier.formula.toLowerCase());
                }
            }
            return buttonsHtml;
        }
    } else if (baseDamageFormula) {
        const typeLabel = baseDamageType !== 'damage' ? `ROLL ${baseDamageType.toUpperCase()} DAMAGE` : 'ROLL DAMAGE';
        buttonsHtml += createBtn(baseDamageFormula, baseDamageType, false, typeLabel);
        foundFormulas.add(baseDamageFormula.toLowerCase());
    }

    // 4. Secondary dice scraper fallback for non-scaling spells (e.g. healing)
    const diceRegex = /\b(\d+d\d+(?:\s*[+\-]\s*(?:\d+|@\w+|[a-zA-Z]+))?)\b/gi;
    let match;
    while ((match = diceRegex.exec(cleanDesc)) !== null) {
        const formula = match[1].trim();
        const formulaKey = formula.toLowerCase();
        if (foundFormulas.has(formulaKey)) continue;

        const matchIndex = match.index;
        const afterText = cleanDesc.slice(matchIndex + match[0].length, matchIndex + match[0].length + 45).toLowerCase();
        const beforeText = cleanDesc.slice(Math.max(0, matchIndex - 35), matchIndex).toLowerCase();

        // Avoid matching "Power ..." as damage
        if (/power\s*\d+/i.test(beforeText) || /power\s*\d+/i.test(afterText)) {
            continue;
        }

        // Check for healing
        if (/heal|healing|restore|regain|hit\s*point|hp\b/.test(afterText) || /heal|healing|restore|regain/.test(beforeText)) {
            foundFormulas.add(formulaKey);
            buttonsHtml += createBtn(formula, "healing", true);
            continue;
        }

        // Check for damage type in afterText or beforeText
        let detectedType = null;
        for (const dtype of VALID_DAMAGE_TYPES) {
            const regex = new RegExp(`(?:^|[^a-zA-Z])${dtype}(?:[^a-zA-Z]|$)`, 'i');
            if (regex.test(afterText) || regex.test(beforeText)) {
                detectedType = dtype;
                break;
            }
        }

        if (detectedType) {
            foundFormulas.add(formulaKey);
            buttonsHtml += createBtn(formula, detectedType, false);
        }
    }

    return buttonsHtml;
}

function getActorSpeed(actor) {
    if (!actor) return 30;
    const speedVal = actor.system.movement?.speed?.value ?? 
                     actor.system.movement?.speed ?? 
                     actor.system.speed?.value ?? 
                     actor.system.speed ?? 
                     actor.system.movement?.walk ?? 
                     actor.system.movement?.value ?? 
                     30;
    const num = Number(speedVal);
    return !isNaN(num) && num > 0 ? num : 30;
}

function measureDistanceBetween(from, to) {
    if (!canvas?.grid) return 0;
    if (from.x === to.x && from.y === to.y) return 0;
    try {
        if (canvas.grid.measurePath) {
            const measured = canvas.grid.measurePath([from, to]);
            if (measured?.distance !== undefined) return Math.round(measured.distance);
        }
        if (canvas.grid.measureDistances) {
            const ray = new Ray(from, to);
            const distances = canvas.grid.measureDistances([{ ray }], { gridSpaces: true });
            if (distances?.length) return Math.round(distances[0]);
        }
        if (canvas.grid.measureDistance) {
            const dist = canvas.grid.measureDistance(from, to, { gridSpaces: true });
            if (Number.isFinite(dist)) return Math.round(dist);
        }
    } catch (e) {
        console.warn("Mythcraft HUD | Error measuring movement distance:", e);
    }
    const gridSize = canvas.grid.sizeX || canvas.grid.size || 100;
    const dx = (to.x - from.x) / gridSize;
    const dy = (to.y - from.y) / gridSize;
    const gridUnits = Math.hypot(dx, dy);
    const distancePerGrid = canvas.scene?.grid?.distance || 5;
    return Math.round(gridUnits * distancePerGrid);
}

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

    // AP is strictly for player Character actors - never show AP on NPCs
    if (token.actor?.type !== 'character') return;

    if (!token.controlled) return;
    // Only show AP above the token when in combat with an active initiative.
    if (!token.inCombat || !game.combat?.combatant) return;

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
