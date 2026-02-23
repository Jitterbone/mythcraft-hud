/**
 * Handles actions for the Mythcraft HUD
 * Integrates attack config, spell casting, and feature interactions
 */
export class ActionHandler {
    
    // Helper: Calculate AP Cost for weapons/spells
    static calculateAPC(item, actor) {
        let formula = item.system.apcFormula;
        if (!formula) return 3; // Default fallback
        
        // Replace @attribute references with actual values
        formula = formula.replace(/@(\w+)/g, (match, code) => {
            return this.getAttributeValue(actor, code) || 0;
        });
        
        // Allow Math functions
        formula = formula.replace(/max\(/g, "Math.max(");
        formula = formula.replace(/min\(/g, "Math.min(");
        
       try {
            const evalFunc = new Function('return ' + formula);
            return evalFunc();
        } catch (error) {
            console.error(`Mythcraft HUD: Error calculating APC for ${item.name}: ${error.message}. Formula: ${formula}`);
            // Provide user-friendly feedback
            ui.notifications.error(`Invalid AP Cost formula for ${item.name}. See console for details.`);
            return 3; // Fallback value
        }
    }

    // Helper: Get attribute value from actor

    static getAttributeValue(actor, attributeKey) {
        if (!attributeKey) return 0;
        const attributes = actor.system.attributes || {};
        const key = attributeKey.toLowerCase();
        if (attributes[key] !== undefined) return attributes[key];

        // Common alias map
        const aliasMap = {
            con: ['end','stamina'], end: ['con','stamina'],
            awa: ['awr','per','perception'], awr: ['awa','per','perception'],
            dex: ['agi','agility'], agi: ['dex','agility'],
            lck: ['luck'], luck: ['lck']
        };

        const aliases = aliasMap[key] || [];
        for (const a of aliases) {
            if (attributes[a] !== undefined) return attributes[a];
        }

        // Fallback: try fuzzy match by key inclusion
        for (const k of Object.keys(attributes)) {
            if (k.toLowerCase().includes(key) || key.includes(k.toLowerCase())) return attributes[k];
        }

        return 0;
    }

    // Helper: Scrape damage/effect info from description
    static scrapeEffect(text) {
        if (!text) return null;
        
        const healRegex = /(?:regain|restore|heal)s?\s+(?:(?:\d+)\s*[\(\[])?\s*(\d+d\d+(?:\s*[+\-]\s*(?:\d+|[a-zA-Z]+))?|\d+)\s*[)\]]?/i;
        const healMatch = text.match(healRegex);
        if (healMatch) return { formula: healMatch[1], type: "healing" };

        const dmgRegex = /(?:(?:deal|take|hit)s?(?::| for)?\s+)?(?:(?:\d+)\s*[\(\[])?\s*(\d+d\d+(?:\s*[+\-]\s*(?:\d+|[a-zA-Z@\.]+))?)\s*[)\]]?\s+(\w+)(?:\s+damage)?/i;
        const dmgMatch = text.match(dmgRegex);
        if (dmgMatch) return { formula: dmgMatch[1], type: dmgMatch[2] };
        
        return null;
    }

    // ===== WEAPON ACTIONS =====

    static async showModifierDialog(weaponId, actor) {
        const item = actor.items.get(weaponId);
        if (!item) return;

        // Prepare Card Data
        const attrKey = (item.system.attr || "str").toLowerCase();
        const attrVal = this.getAttributeValue(actor, attrKey);
        const attackBonus = (attrVal >= 0 ? "+" : "") + attrVal;
        const apCost = this.calculateAPC(item, actor);
        const damageFormula = item.system.damage?.formula || "0";

        const content = `
            <div class="tac-card">
                <div class="tac-zone-1"><img src="${item.img}"></div>
                <div class="tac-zone-2">
                    <div class="tac-row-top">
                        <span>${item.name}</span>
                        <span>Atk: ${attackBonus}</span>
                    </div>
                    <div class="tac-row-bot">
                        <span><span class="tac-attr">${attrKey.toUpperCase()}</span> <span class="tac-cost">${apCost} AP</span></span>
                        <span class="tac-dmg">${damageFormula}</span>
                    </div>
                </div>
                <div class="tac-zone-3" title="Toggle Description"><i class="fas fa-info-circle"></i></div>
            </div>
            <div class="tac-desc" style="display:none; padding: 5px 5px 10px 5px; font-size: 0.85em; color: #ccc; border-bottom: 1px solid #3a7a7f; margin-bottom: 8px;">
                ${item.system.description?.value || "No description available."}
            </div>
            <form class="tac-grid">
                <div class="form-group">
                    <label class="tac-label-ta">Tactical Advantage (+)</label>
                    <input type="number" name="ta" value="0" min="0" style="text-align: center;">
                </div>
                <div class="form-group">
                    <label class="tac-label-td">Tactical Disadvantage (-)</label>
                    <input type="number" name="td" value="0" min="0" style="text-align: center;">
                </div>
                <div class="form-group tac-full-width tac-ap-section">
                    <label>Reduce AP Cost</label>
                    <input type="number" name="apReduce" value="0" min="0" style="text-align: center; width: 50%; margin: 0 auto; display: block;">
                </div>
                <div class="form-group tac-full-width" style="border-top: 1px solid #3a7a7f; padding-top: 8px; margin-top: 4px;">
                    <label>Additional Damage Dice (e.g. 1d6)</label>
                    <input type="text" name="extraDice" placeholder="Formula" style="text-align: center;">
                </div>
                <div class="form-group tac-full-width">
                    <label>Additional Damage Type</label>
                    <select name="extraType" style="text-align: center; width: 100%;">
                        <option value="">None</option>
                        <optgroup label="Physical Damage">
                            <option value="blunt">Blunt</option>
                            <option value="sharp">Sharp</option>
                        </optgroup>
                        <optgroup label="Elemental Damage">
                            <option value="cold">Cold</option>
                            <option value="corrosive">Corrosive</option>
                            <option value="fire">Fire</option>
                            <option value="lightning">Lightning</option>
                            <option value="toxic">Toxic</option>
                        </optgroup>
                        <optgroup label="Energy Damage">
                            <option value="necrotic">Necrotic</option>
                            <option value="psychic">Psychic</option>
                            <option value="radiant">Radiant</option>
                            <option value="sonic">Sonic</option>
                        </optgroup>
                    </select>
                </div>
            </form>
        `;

        new Dialog({
            title: `Tactical Modifiers: ${item.name}`,
            content: content,
            buttons: {
                roll: {
                    label: "<i class='fas fa-dice-d20'></i> Roll Attack",
                    callback: (html) => {
                        const options = {
                            ta: parseInt(html.find('[name="ta"]').val()) || 0,
                            td: parseInt(html.find('[name="td"]').val()) || 0,
                            apReduce: parseInt(html.find('[name="apReduce"]').val()) || 0,
                            extraDice: html.find('[name="extraDice"]').val(),
                            extraType: html.find('[name="extraType"]').val()
                        };
                        this.configureAttack(weaponId, actor, options);
                    }
                }
            },
            default: "roll"
        }, {
            classes: ["dialog", "myth-hud-dialog"],
            width: 500,
            height: "auto",
            render: (html) => {
                html.find('.tac-zone-3').click(() => {
                    html.find('.tac-desc').slideToggle(200);
                });
            }
        }).render(true);
    }

    static async configureAttack(weaponId, actor, options = {}) {
        const item = actor.items.get(weaponId);
        if (!item) return ui.notifications.warn("Weapon not found!");
        
        console.log(`Mythcraft HUD: Configuring attack with - ${item.name}`);
        
        // Get weapon stats
        const attrKey = (item.system.attr || "str").toLowerCase();
        const attrVal = this.getAttributeValue(actor, attrKey);
        
        let apCost = this.calculateAPC(item, actor);
        if (options.apReduce) {
            apCost = Math.max(0, apCost - options.apReduce);
        }
        
        // Check AP availability
        const currentAP = actor.system.ap?.value || 0;
        if (actor.inCombat) {
            if (apCost > currentAP) {
                return ui.notifications.error(`Not enough AP! Need ${apCost}, have ${currentAP}.`);
            }
            const newAP = Math.max(0, currentAP - apCost);
            await actor.update({ "system.ap.value": newAP });
        }

        // Roll the weapon attack
        await this.executeUnifiedAction(weaponId, actor, options);
    }


    static async executeSpellCast(spellId, actor) {
        const item = actor.items.get(spellId);
        if (!item) return ui.notifications.warn("Spell not found!");

        const spCost = getProperty(item, "system.spc") || 0;
        const apCost = this.calculateAPC(item, actor);
        const currentSP = getProperty(actor, "system.sp.value") || 0;
        const currentAP = actor.system.ap?.value || 0;

        // Check resource availability
        if (spCost > currentSP) {
            return ui.notifications.error(`Not enough SP! Need ${spCost}, have ${currentSP}.`);
        }

        if (actor.inCombat && apCost > currentAP) {
            return ui.notifications.error(`Not enough AP! Need ${apCost}, have ${currentAP}.`);
        }

        console.log(`Mythcraft HUD: Casting spell - ${item.name}`);
        
        // Auto-deduct resources
        if (spCost > 0) {
            const newSP = Math.max(0, currentSP - spCost);
            await actor.update({ "system.sp.value": newSP });
        }
        if (apCost > 0 && actor.inCombat) {
            const newAP = Math.max(0, currentAP - apCost);
            await actor.update({ "system.ap.value": newAP });
        }

        // Roll the spell with cost data passed for the chat card
        await this.executeUnifiedAction(spellId, actor, { spCost, apCost });
    }

    // ===== NPC SPELL CAST (Fast mode, doesn't close dialog) =====

    static async executeNPCSpell(spellId, actor) {
        const item = actor.items.get(spellId);
        if (!item) return ui.notifications.warn("Spell not found!");

        // NPC Fast-Cast: Bypass resource subtraction
        // Allows GM to roll spells rapidly without tracking monster resources manually
        console.log(`Mythcraft HUD: NPC casting spell (Fast-Cast) - ${item.name}`);
        await this.executeUnifiedAction(spellId, actor);
    }

    // ===== FEATURE/ACTION INTERACTIONS =====

    static async useFeature(featureId, actor) {
        const item = actor.items.get(featureId);
        if (!item) return ui.notifications.warn("Feature not found!");

        console.log(`Mythcraft HUD: Using feature - ${item.name}`);
        await this.executeUnifiedAction(featureId, actor);
    }

    // ===== UNIFIED EXECUTION CORE =====

    static async executeUnifiedAction(itemId, actor, options = {}) {
        const item = actor.items.get(itemId);
        if (!item) return;

        const desc = item.system.description?.value || "";
        const isSpell = item.type === "spell";
        const isWeapon = item.type === "weapon" || (actor.type === "npc" && desc.includes("Weapon"));
        let extraHtml = "";
        
        // 1. Attack Detection
        let shouldRoll = false;
        let bonus = "";

        const attackRegex = /(?:[Aa]ttack:?\s*|1d20\s*)([+-]?\s*\d+)/i;
        const attackMatch = desc.match(attackRegex);
        
        if (attackMatch) {
            shouldRoll = true;
            bonus = attackMatch[1].replace(/\s/g, '');
        } else if (item.type === "weapon") {
            shouldRoll = true;
            const attrKey = (item.system.attr || "str").toLowerCase();
            const attrVal = this.getAttributeValue(actor, attrKey);
            bonus = (attrVal >= 0 ? "+" : "") + attrVal;
        } else if (item.type === "spell") {
            const attackPhrases = /make a(?:n)?\s+(?:magic\s+)?attack|magic\s+attack\s+against/i;
            if (attackPhrases.test(desc)) {
                shouldRoll = true;
                const defaultAttr = actor.system.sp?.attribute || "int";
                const attrKey = (item.system.attr || defaultAttr).toLowerCase();
                const attrVal = this.getAttributeValue(actor, attrKey);
                bonus = (attrVal >= 0 ? "+" : "") + attrVal;
            }
        }

        // Apply Tactical Modifiers to the roll formula
        let roll = null;
        let isCrit = false;
        if (shouldRoll) {
            if (bonus !== "") {
                const ta = options.ta || 0;
                const td = options.td || 0;
                const modBonus = parseInt(bonus) + ta - td;
                const modBonusStr = (modBonus >= 0 ? "+" : "") + modBonus;
                roll = new Roll(`1d20${modBonusStr}`);
            } else {
                roll = new Roll(`1d20`);
            }
        }

        // NPC Feature Blind Roll Enforcement
        if (actor.type === "npc" && (item.type === "feature" || item.type === "action")) {
            options.rollMode = "blindroll";
        }

        if (roll) {
            await roll.evaluate();
            
            // Detect Crit for Damage Automation
            const d20Term = roll.terms.find(t => t.faces === 20);
            if (d20Term) {
                const result = d20Term.results.find(r => r.active) || d20Term.results[0];
                const d20 = (typeof result === 'object') ? result.result : result;
                if (d20 === 20) isCrit = true;
            }

            // Note: Critical logic is now handled inside createProfessionalChatCard
                
            // Target & Hit Logic
            const targets = game.user.targets;
            if (targets.size > 0) {
                const target = Array.from(targets)[0];
                const targetActor = target.actor;
                const targetAR = targetActor?.system?.defenses?.ar ?? 10;
                const isHit = roll.total >= targetAR;
                
                extraHtml += `
                <div class="myth-hud-target-info" style="margin-top: 4px; padding: 4px; border-top: 1px solid #3a7a7f; font-size: 0.9em;">
                    <div>Target: <strong>${target.name}</strong></div>
                    <div class="secret" style="color: #ccc;">
                        AR: ${targetAR} <span style="font-weight:bold; color:${isHit ? '#2ecc71' : '#e74c3c'}">
                            [${isHit ? "HIT" : "MISS"}]
                        </span>
                    </div>
                </div>`;
            }
        }

        if (desc) extraHtml += `<div class="card-desc">${desc}</div>`;

        // 3. Secondary Effect Scraping (Smart Pre-processor)
        // Finds patterns like "5 (1d6+2) fire" or "1d6 healing"
        
        // Helper to generate the new button HTML
        const createDamageBtn = async (formula, type) => {
            const isHealing = type.toLowerCase() === 'healing';
            // Prompt 1: Strict Prefix Logic
            const command = isHealing ? `/heal ${formula}` : `/damage ${formula} type=${type}`;
            const damageString = `[[${command}]]`;
            
            let enriched = await TextEditor.enrichHTML(damageString, { async: true, rollData: actor.getRollData() });
            
            // Prompt 1: Label Sync
            const label = isHealing ? 'ROLL HEAL' : 'ROLL DAMAGE';
            const icon = isHealing ? 'fa-heart' : 'fa-bolt';
            
            // Prompt 2: Professional "Native" Button UI (Inject structure)
            enriched = enriched.replace(/(<a [^>]+>)(.*?)(<\/a>)/, `$1<div class="action-label"><i class="fas ${icon}"></i> ${label}</div><div class="action-formula">$2</div>$3`);
            
            // Prompt 2: Container Style (.hud-action-button)
            return `<div class="hud-action-button ${isHealing ? 'healing' : 'damage'}">${enriched}</div>`;
        };

        // Helper to calculate Mythcraft Crit Formula: Max(Normal) + Dice + Luck
        const getCritFormula = async (baseFormula) => {
            try {
                // 1. Maximize normal damage
                const maxRoll = new Roll(baseFormula, actor.getRollData());
                await maxRoll.evaluate({maximize: true});
                const maxTotal = maxRoll.total;
                
                // 2. Get dice terms
                const diceTerms = maxRoll.terms.filter(t => t.faces);
                const diceFormula = diceTerms.map(t => t.formula || `${t.number}d${t.faces}${(t.modifiers || []).join("")}`).join(" + ");
                
                // 3. Add Luck
                const luck = this.getAttributeValue(actor, 'luck');
                
                return `${maxTotal} + ${diceFormula} + ${luck}`;
            } catch (e) {
                return baseFormula;
            }
        };

        // Primary Damage Button
        const primaryDmg = item.system.damage?.formula;
        if (primaryDmg) {
            const primaryType = item.system.damage?.type || "Damage";
            let finalDamageFormula = primaryDmg;

            if (options.extraDice) {
                finalDamageFormula += ` + ${options.extraDice}`;
            }
            
            // Apply Crit Logic
            if (isCrit && isWeapon) {
                finalDamageFormula = await getCritFormula(finalDamageFormula);
            }

            extraHtml += await createDamageBtn(finalDamageFormula, primaryType);
        } else {
            // Fallback to scraper if system field is empty
            const healGlobalRegex = /(?:regain|restore|heal)s?\s+(?:(?:\d+)\s*[\(\[])?\s*(\d+d\d+(?:\s*[+\-]\s*(?:\d+|[a-zA-Z]+))?|\d+)\s*[)\]]?/gi;
            let hMatch;
            while ((hMatch = healGlobalRegex.exec(desc)) !== null) {
                const formula = hMatch[1];
                extraHtml += await createDamageBtn(formula, "healing");
            }

            const dmgGlobalRegex = /(?:(?:deal|take|hit)s?(?::| for)?\s+)?(?:(?:\d+)\s*[\(\[])?\s*(\d+d\d+(?:\s*[+\-]\s*(?:\d+|[a-zA-Z@\.]+))?)\s*[)\]]?\s+(\w+)(?:\s+damage)?/gi;
            let dMatch;
            while ((dMatch = dmgGlobalRegex.exec(desc)) !== null) {
                let formula = dMatch[1];
                let type = dMatch[2];
                
                if (isCrit && isWeapon) {
                    formula = await getCritFormula(formula);
                }

                if (type.toLowerCase() === "damage") type = "Damage";
                if (type.toLowerCase() !== "healing" && type.toLowerCase() !== "hp") {
                     extraHtml += await createDamageBtn(formula, type);
                }
            }
        }

        // Add Additional Damage Button if provided
        if (options.extraDice && !primaryDmg) {
            const type = options.extraType || "Extra";
            let formula = options.extraDice;
            if (isCrit && isWeapon) {
                formula = await getCritFormula(formula);
            }
            extraHtml += await createDamageBtn(formula, type);
        }

        // Send to standardized chat card
        await this.createProfessionalChatCard({
            actor: actor,
            title: item.name,
            roll: roll,
            label: "ATTACK ROLL",
            icon: item.img,
            extraHtml: extraHtml,
            isSpell: isSpell,
            spCost: options.spCost || 0,
            apCost: options.apCost || 0
        });
    }

    // ===== SKILL ROLLS =====

    static async createProfessionalChatCard(data) {
        const { actor, title, roll, label, icon, description, extraHtml, isSpell, spCost, apCost } = data;
        
        let resultClass = "";
        let resultLabel = label || "Result";
        
        // Check for d20 crit/fail
        if (roll) {
            const d20Term = roll.terms.find(t => t.faces === 20);
            if (d20Term) {
                // Find active result for advantage/disadvantage support
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

        const cardClass = isSpell ? "mythcraft-statblock spell-card" : "mythcraft-statblock";
        let content = `<div class="${cardClass}">`;
        
        // Header
        content += `<div class="card-header">`;
        if (icon) content += `<img src="${icon}" style="border: 1px solid #a8d5e2; border-radius: 4px; height: 32px; width: 32px; object-fit: cover; margin-right: 8px;" /> `;
        content += `${title}</div>`;
        
        // Resource Summary (Spells)
        if (isSpell) {
            content += `<div class="spell-resource-row">`;
            if (spCost > 0) {
                content += `<span class="sp-spent">SP Spent: <strong>${spCost}</strong></span>`;
                content += `<button class="myth-hud-refund-btn" data-actor-uuid="${actor.uuid}" data-sp-cost="${spCost}"><i class="fas fa-undo"></i> Refund SP</button>`;
            }
            if (apCost > 0) {
                 content += `<span class="ap-spent">AP Cost: <strong>${apCost}</strong></span>`;
            }
            content += `</div>`;
        }

        // Description (Scrollable for spells)
        if (description) {
            const descClass = isSpell ? "card-desc scrollable" : "card-desc";
            content += `<div class="${descClass}">${description}</div>`;
        }

        // Roll Result
        if (roll) {
            content += `
                <div class="roll-result ${resultClass}">
                    <div class="roll-label" style="color: #d3c4a3;">${resultLabel}</div>
                    <div class="roll-value">${roll.total}</div>
                    <div class="roll-formula">${roll.formula}</div>
                </div>`;
        }

        // Extra HTML (Targets, Buttons, etc)
        if (extraHtml) content += extraHtml;
        
        content += `</div>`;

        if (roll && game.dice3d) game.dice3d.showForRoll(roll);

        const muteDice = game.settings.get('mythcraft-hud', 'disableDiceSounds');

        return ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: content,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            sound: (roll && !muteDice) ? CONFIG.sounds.dice : null
        });
    }

    static async createChatCard(actor, title, roll, label = "Result") {
        return this.createProfessionalChatCard({
            actor,
            title,
            roll,
            label
        });
    }

    static async rollSkill(skillId, actor) {
        const skill = actor.system.skills?.[skillId];
        if (!skill) return ui.notifications.warn("Skill not found!");

        const skillName = skill.label || (skillId.charAt(0).toUpperCase() + skillId.slice(1));
        console.log(`Mythcraft HUD: Rolling ${skillName}`);

        // Get the numeric bonus value from the skill object
        const bonus = skill.total ?? skill.mod ?? skill.bonus ?? 0;

        // Construct roll formula: 1d20 + skill bonus
        const formula = `1d20 + ${bonus}`;
        const roll = new Roll(formula, actor.getRollData());
        
        await roll.evaluate();
        
        // Use createProfessionalChatCard directly for consistent styling
        await this.createProfessionalChatCard({
            actor: actor,
            title: `${skillName} Check`,
            roll: roll,
            label: "SKILL CHECK",
            isSpell: false
        });
    }

    // ===== SAVE ROLLS =====

    static async rollSave(saveId, actor) {
        const save = actor.system.saves?.[saveId];
        if (save === undefined) return ui.notifications.warn("Save not found!");

        const saveName = saveId.charAt(0).toUpperCase() + saveId.slice(1);
        console.log(`Mythcraft HUD: Rolling ${saveName} save`);

        // Construct roll formula: 1d20 + save bonus
        const formula = `1d20 + ${save}`;
        const roll = new Roll(formula, actor.getRollData());
        
        await roll.evaluate();
        
        // Use createProfessionalChatCard directly for consistent styling
        await this.createProfessionalChatCard({
            actor: actor,
            title: `${saveName} Save`,
            roll: roll,
            label: "SAVE CHECK",
            isSpell: false
        });
    }

    // ===== ATTRIBUTE ROLLS =====

    static async rollAttribute(attrId, actor) {
        const attr = this.getAttributeValue(actor, attrId);
        const attrName = (attrId || '').toUpperCase();
        console.log(`Mythcraft HUD: Rolling ${attrName} check`);

        // Construct roll formula: 1d20 + attribute value
        const formula = `1d20 + ${attr}`;
        const roll = new Roll(formula, actor.getRollData());
        
        await roll.evaluate();
        
        // Use createProfessionalChatCard directly for consistent styling
        await this.createProfessionalChatCard({
            actor: actor,
            title: `${attrName} Check`,
            roll: roll,
            label: "ATTRIBUTE CHECK",
            isSpell: false
        });
    }

    // ===== GATEWAY METHODS (called from HUD) =====

    static async rollWeapon(weaponId, actor) {
        await this.configureAttack(weaponId, actor);
    }

    static async castSpell(spellId, actor) {
        await this.executeSpellCast(spellId, actor);
    }

    static async useAction(actionId, actor) {
        await this.useFeature(actionId, actor);
    }

    static async refundSP(actorUuid, spCost) {
        const actor = await fromUuid(actorUuid);
        if (!actor) return ui.notifications.warn("Actor not found for refund.");
        
        const currentSP = getProperty(actor, "system.sp.value") || 0;
        const maxSP = getProperty(actor, "system.sp.max") || 0;
        
        const newSP = Math.min(maxSP, currentSP + spCost);
        await actor.update({ "system.sp.value": newSP });
        
        ui.notifications.info(`Refunded ${spCost} SP to ${actor.name}.`);
    }

    static async rollDamage(formula, type, actorUuid) {
        const actor = await fromUuid(actorUuid);
        
        // Resolve @ attributes
        let resolvedFormula = formula;
        if (formula.includes("@")) {
            resolvedFormula = formula.replace(/@([a-zA-Z0-9_]+)/g, (match, key) => {
                return this.getAttributeValue(actor, key);
            });
        }

        const content = `[[/damage ${resolvedFormula} ${type}]]`;
        await ui.chat.processMessage(content);
    }

    // ===== SHEET INTERCEPTION =====

    static registerHooks() {
        // Hook into preCreateChatMessage to intercept sheet rolls
        Hooks.on('preCreateChatMessage', (doc, data, options, userId) => {
            // 1. Avoid infinite loops from our own messages
            if (data.content && (data.content.includes("myth-hud-chat-card") || data.content.includes("mythcraft-statblock"))) return;

            // 2. Attempt to identify Item rolls from the system
            // We check for flags that link to an Item and Actor
            const flags = data.flags?.mythcraft || {};
            const itemId = flags.itemId || flags.item?._id;
            
            const speaker = data.speaker || {};
            const actor = ChatMessage.getSpeakerActor(speaker);

            // If we found an item ID, try to find the actor and item
            if (itemId && actor) {
                    const item = actor.items.get(itemId);
                    if (item) {
                        // Redirect to HUD logic
                        this.handleSheetRoll(item, actor);
                        return false; // Cancel the original chat message
                    }
            }

            // 3. Attempt to identify Skill/Save/Attribute rolls from sheet
            if (actor) {
                if (flags.skillId) {
                    this.rollSkill(flags.skillId, actor);
                    return false;
                }
                if (flags.saveId) {
                    this.rollSave(flags.saveId, actor);
                    return false;
                }
                if (flags.attrId || flags.attribute) {
                    this.rollAttribute(flags.attrId || flags.attribute, actor);
                    return false;
                }
            }
        });

        // Also hook generic item roll if supported by the system
        Hooks.on('mythcraft.preRollItem', (item) => {
            if (item.actor) {
                this.handleSheetRoll(item, item.actor);
                return false;
            }
        });
    }

    static async handleSheetRoll(item, actor) {
        if (!item || !actor) return;
        console.log(`Mythcraft HUD | Intercepting sheet roll for ${item.name}`);
        
        const type = item.type;
        if (type === "weapon") return this.configureAttack(item.id, actor);
        if (type === "spell") return this.executeSpellCast(item.id, actor);
        return this.useFeature(item.id, actor);
    }
}