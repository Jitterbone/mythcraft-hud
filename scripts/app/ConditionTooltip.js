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

    show(title, description) {
        if (!this.element) this._create();
        
        // Dynamically adjust position based on sidebar
        const sidebar = document.getElementById('sidebar');
        let offset = 16; // Default offset from the right edge
        if (sidebar && !sidebar.classList.contains('collapsed')) {
            const sidebarRect = sidebar.getBoundingClientRect();
            // Check if the sidebar is positioned on the right edge of the viewport
            if (sidebarRect.right >= window.innerWidth - 10) {
                offset += sidebarRect.width;
            }
        }
        this.element.style.right = `${offset}px`;
        
        this.element.innerHTML = `
            <div class="tooltip-header">${title}</div>
            <div class="tooltip-body">${description}</div>
        `;
        this.element.classList.remove('hidden');
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
