import { conditionTooltip } from '../app/ConditionTooltip.js';
import { mcConditions as MythcraftConditions } from '../data/ConditionData.js';

const _conditionTextureCache = new Map();

function getConditionTexture(imgPath) {
    if (_conditionTextureCache.has(imgPath)) {
        return _conditionTextureCache.get(imgPath);
    }
    const texture = PIXI.Texture.from(imgPath);
    _conditionTextureCache.set(imgPath, texture);
    return texture;
}

const _radialDebounce = new Map();

function debouncedRadial(token) {
    if (_radialDebounce.has(token.id)) {
        clearTimeout(_radialDebounce.get(token.id));
    }
    _radialDebounce.set(token.id, setTimeout(() => {
        renderRadialConditions(token);
        _radialDebounce.delete(token.id);
    }, 50));
}

function renderRadialConditions(token) {
    // Remove existing radial container if present
    const existing = token.children.find(c => c.name === "mythcraft-radial");
    if (existing) token.removeChild(existing);

    const statuses = [...(token.actor?.statuses ?? [])];
    if (statuses.length === 0) return;

    // Create a PIXI container as a child of the token
    const container = new PIXI.Container();
    container.name = "mythcraft-radial";

    const total = statuses.length;
    const tokenRadius = Math.max(token.w, token.h) / 2;
    const orbitRadius = tokenRadius + 4;
    const centerX = token.w / 2;
    const centerY = token.h / 2;
    // Icon size in canvas units
    const iconSize = 10;
    const ANGLE_STEP = 32;

    statuses.forEach((statusId, index) => {
        const condition = MythcraftConditions.find(c => c.id === statusId);
        if (!condition) return;

        const angleDeg = (ANGLE_STEP * index) - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        const x = centerX + orbitRadius * Math.cos(angleRad);
        const y = centerY + orbitRadius * Math.sin(angleRad);

        // Create icon sprite from texture
        const texture = getConditionTexture(condition.img);
        const sprite = new PIXI.Sprite(texture);
        sprite.width = iconSize;
        sprite.height = iconSize;
        // Anchor to center of sprite
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;

        container.addChild(sprite);
    });

    token.addChild(container);
}

export class ConditionHandler {
    constructor() {
        this.init();
    }

    init() {
        Hooks.on('preCreateActiveEffect', this.handlePreCreateActiveEffect.bind(this));
        Hooks.on('createActiveEffect', this.handleCreateActiveEffect.bind(this));
        Hooks.on('deleteActiveEffect', this.handleDeleteActiveEffect.bind(this));
        Hooks.on('updateActiveEffect', this.handleUpdateActiveEffect.bind(this));
        Hooks.on('updateCombat', this.handleUpdateCombat.bind(this));
        Hooks.on('updateActor', this.handleUpdateActor.bind(this));
        Hooks.on('renderTokenHUD', this.handleRenderTokenHUD.bind(this));
        Hooks.on("renderActiveEffectConfig", this.handleRenderActiveEffectConfig.bind(this));

        // PIXI-based radial condition hooks
        Hooks.on("createActiveEffect", (effect) => {
            const token = effect.parent?.getActiveTokens?.()?.[0];
            if (token) debouncedRadial(token);
        });

        Hooks.on("deleteActiveEffect", (effect) => {
            const token = effect.parent?.getActiveTokens?.()?.[0];
            if (token) debouncedRadial(token);
        });

        Hooks.on("updateActor", (actor) => {
            actor.getActiveTokens().forEach(t => debouncedRadial(t));
        });

        Hooks.on("refreshToken", (token) => {
            if (token.effects) token.effects.visible = false;
            debouncedRadial(token);
        });
    }

    handleRenderActiveEffectConfig(app, html, data) {
        const effect = app.object;
        const statusId = [...(effect.statuses ?? [])][0];
        if (!statusId) return;
        const condition = MythcraftConditions.find(c => c.id === statusId);
        if (!condition) return;
        $(html).find('input[name="img"]').val(condition.img);
        $(html).find(".effect-icon img").attr("src", condition.img);
    }

    isMythcraftCondition(effect) {
        if (!effect) return false;
        // In V13+, the statuses set is the primary way to identify a status effect
        const effectStatuses = effect.statuses;
        if (!effectStatuses || effectStatuses.size === 0) return false;

        const statusId = effectStatuses.values().next().value; // Get the first status ID
        return CONFIG.statusEffects.some(se => se.id === statusId && se.flags?.['mythcraft-hud']);
    }

    handlePreCreateActiveEffect(effect, data, options, userId) {
        // Get the statuses from either the effect or data
        const statuses = effect.statuses || data.statuses || [];
        const statusArray = Array.isArray(statuses) ? statuses : [...(statuses ?? [])];
        
        if (statusArray.length === 0) return;

        const statusId = statusArray[0];
        const condition = CONFIG.statusEffects.find(c => c.id === statusId);
        
        if (!condition) return;
        if (!condition.flags?.['mythcraft-hud']) return;

        // Ensure statuses are properly set as an array
        effect.updateSource({ 
            statuses: [statusId],
            description: condition.description || effect.description || "",
            img: condition.img,
            icon: condition.img
        });
    }

    handleRenderTokenHUD(app, html, data) {
        const actor = app.object?.actor;
        if (!actor) return;

        const activeStatuses = actor.statuses;
        const effectControls = $(html).find('.effect-control');

        effectControls.each((i, el) => {
            const icon = $(el);
            const statusId = icon.data('status-id');
            const condition = CONFIG.statusEffects.find(c => c.id === statusId);

            if (!condition?.flags?.['mythcraft-hud']) return;

            if (activeStatuses.has(statusId)) {
                icon.addClass('mythcraft-active');
            }

            icon.off('click.mythcraft-hud contextmenu.mythcraft-hud mouseenter.mythcraft-hud mouseleave.mythcraft-hud');

            icon.on('click.mythcraft-hud', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                // Standard approach for Foundry V11+
                if (actor.toggleStatusEffect) {
                    await actor.toggleStatusEffect(statusId);
                } else if (app.object.document?.toggleActiveEffect) {
                    await app.object.document.toggleActiveEffect(condition);
                } else if (app.object.toggleEffect) { // Backwards compatibility
                    await app.object.toggleEffect(condition);
                }
            });

            icon.on('contextmenu.mythcraft-hud', (event) => event.preventDefault());

            icon.on('mouseenter.mythcraft-hud', () => {
                if (condition) {
                    conditionTooltip.show(condition.label, condition.description);
                }
            });

            icon.on('mouseleave.mythcraft-hud', () => {
                conditionTooltip.hide();
            });
        });
    }

    async handleCreateActiveEffect(effect, options, userId) {
        if (game.userId !== userId) return;
        if (!this.isMythcraftCondition(effect)) return;

        const actor = effect.parent;
        if (!actor) return;

        const conditionId = effect.statuses.values().next().value;
        if (!conditionId) return;

        if (conditionId === 'rallied') {
            await this.suppressConditions(actor, ['demoralized', 'frightened', 'shaken'], true);
        }

        if (['demoralized', 'frightened', 'shaken'].includes(conditionId)) {
            if (actor.statuses.has('rallied')) {
                await effect.update({ disabled: true });
            }
        }
    }

    async handleDeleteActiveEffect(effect, options, userId) {
        if (game.userId !== userId) return;
        if (!this.isMythcraftCondition(effect)) return;

        const actor = effect.parent;
        if (!actor) return;

        const conditionId = effect.statuses.values().next().value;
        if (!conditionId) return;

        if (conditionId === 'rallied') {
            await this.suppressConditions(actor, ['demoralized', 'frightened', 'shaken'], false);
        }
    }

    async handleUpdateActiveEffect(effect, changes, options, userId) {
        if (game.userId !== userId) return;
        if (!this.isMythcraftCondition(effect)) return;

        if (changes.disabled !== undefined) {
            const actor = effect.parent;
            const conditionId = effect.statuses.values().next().value;
            if (conditionId === 'rallied') {
                await this.suppressConditions(actor, ['demoralized', 'frightened', 'shaken'], !changes.disabled);
            }
        }
    }

    async handleUpdateCombat(combat, round, options, userId) {
        if (game.userId !== userId || !combat.combatant) return;

        const actor = combat.combatant.actor;
        if (!actor) return;

        if (round.turn === undefined && round.round === undefined) return;

        const dazed = actor.statuses.has('dazed');
        if (dazed) {
            const currentAP = actor.system.ap.value;
            if (currentAP > 3) {
                await actor.update({ 'system.ap.value': 3 });
            }
        }

        const stunned = actor.statuses.has('stunned');
        if (stunned) {
            const currentAP = actor.system.ap.value;
            if (currentAP > 1) {
                await actor.update({ 'system.ap.value': 1 });
            }
        }

        const prevTurn = (combat.turn === 0) ? combat.turns.length - 1 : combat.turn - 1;
        const prevCombatant = combat.turns[prevTurn];
        if (!prevCombatant || !prevCombatant.actor) return;

        const prevActor = prevCombatant.actor;

        if (prevActor.statuses.has('bleeding')) {
            const effect = prevActor.effects.find(e => e.statuses.has('bleeding'));
            const damage = effect?.flags['mythcraft-hud']?.bleedingValue || '1d4';
            await this.applyDamage(prevActor, damage, 'physical');
        }

        if (prevActor.statuses.has('burning')) {
            const effect = prevActor.effects.find(e => e.statuses.has('burning'));
            const damage = effect?.flags['mythcraft-hud']?.burningValue || '1d4';
            await this.applyDamage(prevActor, damage, 'fire');
        }
    }

    async handleUpdateActor(actor, changes, options, userId) {
        if (game.userId !== userId) return;

        if (changes.system?.hp?.value !== undefined || changes.system?.hp?.max !== undefined) {
            const maxHp = actor.system.hp.max;
            const currentHp = actor.system.hp.value;
            const isBloodied = maxHp > 0 && currentHp <= (maxHp / 2);
            const hasBloodied = actor.statuses.has('bloodied');

            if (isBloodied && !hasBloodied) {
                if (actor.toggleStatusEffect) {
                    await actor.toggleStatusEffect('bloodied', { active: true });
                } else {
                    const condition = CONFIG.statusEffects.find(se => se.id === 'bloodied');
                    if (condition) {
                        const effectData = {
                            name: condition.label || condition.name || 'Bloodied',
                            img: condition.img,
                            icon: condition.img || condition.img,
                            statuses: [condition.id],
                            changes: condition.changes ?? [],
                            flags: condition.flags || {}
                        };
                        await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
                    }
                }
            } else if (!isBloodied && hasBloodied) {
                if (actor.toggleStatusEffect) {
                    await actor.toggleStatusEffect('bloodied', { active: false });
                } else {
                    const effectToRemove = actor.effects.find(e => e.statuses.has('bloodied'));
                    if (effectToRemove) {
                        await effectToRemove.delete();
                    }
                }
            }
        }
    }

    async suppressConditions(actor, conditionIds, disabled) {
        for (const id of conditionIds) {
            const effect = actor.effects.find(e => e.statuses.has(id));
            if (effect && effect.disabled !== disabled) {
                await effect.update({ disabled });
            }
        }
    }

    async applyDamage(actor, formula, type) {
        const roll = new Roll(formula);
        await roll.roll();

        const currentHp = actor.system.hp.value;
        const newHp = Math.max(0, currentHp - roll.total);
        await actor.update({ 'system.hp.value': newHp });

        ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: `${actor.name} takes ${roll.total} ${type} damage.`
        });
    }
}
