import { ActionHandler } from '../actions/ActionHandler.js';

/**
 * Scrapes actor data for the HUD - Mythcraft Specific
 */
export class DataScraper {
    static getActorData(actor) {
        let weapons = [];
        let spells = [];
        let talents = []; 
        let features = [];
        let actions = [];
        let reactions = [];
        let multiattack = null;
        const isNPC = actor.type === "npc";
        // Actor Type Detection: Primary check is already done via actor.type
        const system = actor.system;

        // Helper to enrich item data for the 3-column layout
        const enrichItemData = (i) => {
            const itemSystem = i.system;
            // Dynamic Attribute Pathing: Check for spell attribute or default to STR/INT logic
            const defaultAttr = i.type === "spell" ? (system.sp?.attribute || "int") : "str";
            const attrKey = (itemSystem.attr || defaultAttr).toLowerCase();
            const attrVal = system.attributes?.[attrKey] ?? 0;
            
            i.system.attrKey = attrKey.toUpperCase();
            i.system.attrVal = attrVal;
            i.system.apCost = ActionHandler.calculateAPC(i, actor);
            
            // Damage calculation logic
            let rawDmg = itemSystem.damage?.formula || "";
            if (rawDmg && rawDmg !== "0") {
                i.system.resolvedDmg = rawDmg.includes(attrKey) ? rawDmg : `${rawDmg} + ${attrVal}`;
            } else {
                i.system.resolvedDmg = "";
            }

            // Recalculate attack label based on the resolved attribute
            i.system.attackLabel = `${attrVal >= 0 ? "+" : ""}${attrVal}`;

            // Spell Preview Logic
            if (i.type === "spell") {
                const desc = itemSystem.description?.value || "";
                let previewLabel = "Utility";
                let previewClass = "utility";
                
                const healRegex = /(?:regain|restore|heal)s?\s+(\d+d\d+(?:\s*\+\s*\d+)?|\d+)/i;
                const dmgRegex = /(?:deal|take)s?\s+(\d+d\d+(?:\s*\+\s*\d+)?)\s+(\w+)\s+damage/i;
                
                if (healRegex.test(desc)) {
                    previewLabel = "Healing";
                    previewClass = "healing";
                } else if (dmgRegex.test(desc)) {
                    previewLabel = "Damage";
                    previewClass = "damage";
                }
                
                i.system.previewLabel = previewLabel;
                i.system.previewClass = previewClass;
            }
        };

        // First Pass: Collection & Categorization
        actor.items.forEach(i => {
            const type = i.type;
            const itemSystem = i.system;

            // Weapons & Spells
            if (type === "spell") { 
                enrichItemData(i);
                spells.push(i); 
            } else if (type === "weapon") {
                enrichItemData(i);
                weapons.push(i);
                // Action Consolidation: Weapons are also Actions
                actions.push(i);
            } else {
                // Categorize other items based on NPC/PC status
                // Dynamic Categorization logic
                const name = i.name.toLowerCase();
                const cat = itemSystem.category?.toLowerCase() || "";
                
                if (isNPC) {
                    // NPC CATEGORIZATION
                    if (name === "multiattack" || name === "multi attack" || name === "multi-attack") {
                        multiattack = i;
                    } else if (cat === "reaction" || type === "reaction") {
                        reactions.push(i);
                    } else if (cat === "passive" || type === "passive" || type === "feature") {
                        features.push(i);
                    } else if (cat === "action" || ["action", "talent", "background", "profession"].includes(type)) {
                        actions.push(i);
                    }
                } else {
                    // PC CATEGORIZATION
                    if (type === "talent") {
                        talents.push(i);
                    } else if (cat === "reaction" || type === "reaction") {
                        reactions.push(i);
                    } else if (cat === "passive" || type === "passive" || type === "feature" || type === "background" || type === "lineage" || type === "profession") {
                        features.push(i);
                    } else if (cat === "action" || type === "action") {
                        actions.push(i);
                    }
                }
            }
        });

        // Multiattack Parsing & Dynamic Linker
        // State Management: Flag actions appearing in Multiattack
        if (multiattack) {
            let maDesc = multiattack.system.description?.value || "";
            let infoBlocks = "";
            const processedActions = new Set();

            // Combine all potential rollable items for scanning
            // We prioritize Actions and Weapons, but also check Spells and Features
            const candidates = [...actions, ...spells, ...features];

            // Sort by length descending to prevent partial matches (e.g. matching "Bite" inside "Mega Bite")
            const sortedCandidates = candidates.sort((a, b) => b.name.length - a.name.length);
            
            sortedCandidates.forEach(item => {
                // Dynamic Linker: Scan Multiattack description for item names
                const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                
                // Smart Boundary Detection: Only apply \b if the name starts/ends with a word character
                const startBoundary = /^\w/.test(item.name) ? "\\b" : "";
                const endBoundary = /\w$/.test(item.name) ? "\\b" : "";
                const regex = new RegExp(`${startBoundary}${escapedName}${endBoundary}`, 'gi');
                
                if (regex.test(maDesc) && !processedActions.has(item.id)) {
                    processedActions.add(item.id);
                    item.inMultiattack = true;
                    item.embedded = true; // Flag as embedded for redundancy filter

                    // Determine button class based on type
                    let btnClass = "feature-btn";
                    if (item.type === "weapon") btnClass = "weapon-btn";
                    else if (item.type === "spell") btnClass = "spell-btn";

                    // Strip HTML from description for tooltip
                    const plainDesc = (item.system.description?.value || "").replace(/<[^>]*>?/gm, '');

                    // String-to-Button Injection
                    const btnHtml = `<span class="injected-group"><button class="hud-action-btn injected-btn ${btnClass}" data-item-id="${item.id}" title="${plainDesc}">${item.name}</button><button class="info-toggle-btn injected-info" data-target="info-${item.id}"><i class="fas fa-info-circle"></i></button></span>`;
                    
                    maDesc = maDesc.replace(regex, btnHtml);

                    // Nested Info Toggles
                    infoBlocks += `<div id="info-${item.id}" class="hud-item-description" style="display:none; margin-top: 4px; border-left: 3px solid #174345;"><strong>${item.name}:</strong> ${item.system.description?.value || ""}</div>`;
                }
            });
            
            // Update the description to include the injected buttons and appended info blocks
            multiattack.processedDesc = maDesc + infoBlocks;
        }

        // Sort lists
        weapons.sort((a, b) => a.name.localeCompare(b.name));
        spells.sort((a, b) => a.name.localeCompare(b.name));
        features.sort((a, b) => a.name.localeCompare(b.name));
        actions.sort((a, b) => a.name.localeCompare(b.name));

        const hasFeatures = talents.length > 0 || features.length > 0 || actions.length > 0 || reactions.length > 0;

        return { isNPC, weapons, spells, talents, features, actions, reactions, multiattack, hasFeatures };
    }
}