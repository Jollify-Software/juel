import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";
import { IsMobile } from "../_Utils/IsMobile";
import { createFloating } from "../_Utils/dom/createFloating";

export class CollapsibleBase extends JuelComponent {
    @property({ type: String, attribute: 'collapse-mode' })
    collapseMode: 'floating' | 'push' = 'push';
  
    @property({ type: String })
    trigger: 'mouseenter' | 'click' = 'mouseenter';

    private floatingInstance: ReturnType<typeof createFloating> | null = null;
    
    /**
     *
     */
    constructor() {
        super();
        
        if (IsMobile()) {
          this.collapseMode = 'push';
          this.trigger = 'click';
        }
    }

    getTriggerElement(): HTMLElement {
        return this;
    }

    getCollapseElement(): HTMLElement {
        return null;
    }

    firstUpdated() {
        this.setupEventListeners();
    
        if (this.collapseMode === 'floating') {
          this.floatingInstance = createFloating(this.getTriggerElement(), this.getCollapseElement(), {
            placement: 'bottom',
          });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanupEventListeners();
    
        if (this.floatingInstance) {
          this.floatingInstance.destroy();
        }
      }

      private setupEventListeners() {
        if (this.trigger === 'mouseenter') {
          this.getTriggerElement().addEventListener('mouseenter', this.showItems);
          this.getTriggerElement().addEventListener('mouseleave', this.hideItems);
        } else if (this.trigger === 'click') {
            this.getTriggerElement().addEventListener('click', this.toggleItems);
        }
      }
    
      private cleanupEventListeners() {
        if (this.trigger === 'mouseenter') {
          this.getTriggerElement().removeEventListener('mouseenter', this.showItems);
          this.getTriggerElement().removeEventListener('mouseleave', this.hideItems);
        } else if (this.trigger === 'click') {
          this.getTriggerElement().removeEventListener('click', this.toggleItems);
        }
      }

      private showItems = () => {
        if (this.collapseMode === 'floating') {
          this.getCollapseElement().style.visibility = 'visible';
        } else if (this.collapseMode === 'push') {
          this.getCollapseElement().style.maxHeight = `${this.getCollapseElement().scrollHeight}px`;
        }
      };
    
      private hideItems = () => {
        if (this.collapseMode === 'floating') {
          this.getCollapseElement().style.visibility = 'hidden';
        } else if (this.collapseMode === 'push') {
          this.getCollapseElement().style.maxHeight = '0';
        }
      };
    
      private toggleItems = () => {
        if (this.getCollapseElement().style.maxHeight === '0px' || !this.getCollapseElement().style.maxHeight) {
          this.showItems();
        } else {
          this.hideItems();
        }
      };
}