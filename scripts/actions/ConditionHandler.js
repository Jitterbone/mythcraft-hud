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
    if (existing) {
        token.removeChild(existing);
        existing.destroy({ children: true });
    }

    const statuses = [...(token.actor?.statuses ?? [])];
    if (statuses.length === 0) return;

    // Create a PIXI container as a child of the token
    const container = new PIXI.Container();
    container.name = "mythcraft-radial";

    const tokenRadius = Math.max(token.w, token.h) / 2;
    const orbitRadius = tokenRadius + 4;
    const centerX = token.w / 2;
    const centerY = token.h / 2;
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
        Hooks.on('renderTokenHUD', this.handleRenderTokenHUD.bind(this));
        Hooks.on("renderActiveEffectConfig", this.handleRenderActiveEffectConfig.bind(this));

        // PIXI-based radial condition visual hooks
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

        Hooks.on("canvasPan", () => {
            conditionTooltip.hide();
        });
    }

    handleRenderActiveEffectConfig(app, html, data) {
        const effect = app.document || app.object;
        if (!effect || !effect.statuses) return;
        const statusId = [...effect.statuses][0];
        if (!statusId) return;
        const condition = MythcraftConditions.find(c => c.id === statusId);
        if (!condition) return;
        $(html).find('input[name="img"]').val(condition.img);
        $(html).find(".effect-icon img").attr("src", condition.img);
    }

    handleRenderTokenHUD(app, html, data) {
        const actor = app.object?.actor;
        if (!actor) return;

        const activeStatuses = actor.statuses;
        const effectControls = $(html).find('.effect-control');

        effectControls.each((i, el) => {
            const icon = $(el);
            const statusId = icon.data('status-id');
            const condition = MythcraftConditions.find(c => c.id === statusId) || CONFIG.statusEffects?.find(c => c.id === statusId);

            if (!condition) return;

            if (activeStatuses.has(statusId)) {
                icon.addClass('mythcraft-active');
            }

            icon.off('click.mythcraft-hud contextmenu.mythcraft-hud mouseenter.mythcraft-hud mouseleave.mythcraft-hud');

            icon.on('click.mythcraft-hud', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (actor.toggleStatusEffect) {
                    await actor.toggleStatusEffect(statusId);
                } else if (app.object.document?.toggleActiveEffect) {
                    await app.object.document.toggleActiveEffect(condition);
                } else if (app.object.toggleEffect) {
                    await app.object.toggleEffect(condition);
                }
            });

            icon.on('contextmenu.mythcraft-hud', (event) => event.preventDefault());

            icon.on('mouseenter.mythcraft-hud', (event) => {
                if (condition) {
                    conditionTooltip.show(condition.label, condition.description, event.currentTarget);
                }
            });

            icon.on('mouseleave.mythcraft-hud', () => {
                conditionTooltip.hide();
            });
        });
    }
}
