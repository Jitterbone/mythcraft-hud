class ConditionTooltip {
    constructor() {
        this.element = null;
        this._create();
    }

    _create() {
        if (document.getElementById('mythcraft-condition-tooltip')) return;

        const tooltipElement = document.createElement('div');
        tooltipElement.id = 'mythcraft-condition-tooltip';
        tooltipElement.classList.add('hidden');
        document.body.appendChild(tooltipElement);
        this.element = tooltipElement;
    }

    show(title, description, targetEl = null) {
        if (!this.element) this._create();
        
        this.element.innerHTML = `
            <div class="tooltip-header">${title}</div>
            <div class="tooltip-body">${description}</div>
        `;

        this.element.classList.remove('hidden');

        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            this.element.style.left = `${rect.right + 10}px`;
            this.element.style.right = 'auto';
            
            let topPos = rect.top;
            const tooltipHeight = this.element.offsetHeight;
            if (topPos + tooltipHeight > window.innerHeight) {
                topPos = Math.max(10, window.innerHeight - tooltipHeight - 10);
            }
            this.element.style.top = `${topPos}px`;
        } else {
            const sidebar = document.getElementById('sidebar');
            let offset = 16;
            if (sidebar && !sidebar.classList.contains('collapsed')) {
                const sidebarRect = sidebar.getBoundingClientRect();
                if (sidebarRect.right >= window.innerWidth - 10) {
                    offset += sidebarRect.width;
                }
            }
            this.element.style.right = `${offset}px`;
            this.element.style.top = `80px`;
            this.element.style.left = 'auto';
        }
    }

    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
    }

    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

export const conditionTooltip = new ConditionTooltip();
