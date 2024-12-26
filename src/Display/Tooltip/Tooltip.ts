import { LitElement, html, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { computePosition, autoUpdate, offset, shift } from '@floating-ui/dom';
import tooltipStyles from 'bundle-text:./Tooltip.less';

@customElement("juel-tooltip")
export class Tooltip extends LitElement {

    static styles = unsafeCSS(tooltipStyles);
 
    @property({ type: Boolean }) visible = false;
    @property() text: string;

    private tooltipRef!: HTMLElement;
    private triggerRef!: HTMLElement;
    private cleanup?: () => void;
  
    firstUpdated() {
      this.tooltipRef = this.shadowRoot!.querySelector('.tooltip')!;
      this.triggerRef = this.shadowRoot!.querySelector('.trigger')!;
  
      // Attach event listeners to show/hide the tooltip
      this.triggerRef.addEventListener('mouseenter', () => this.showTooltip());
      this.triggerRef.addEventListener('mouseleave', () => this.hideTooltip());
      this.triggerRef.addEventListener('focus', () => this.showTooltip());
      this.triggerRef.addEventListener('blur', () => this.hideTooltip());
    }
  
    private async showTooltip() {
      this.visible = true;
  
      // Dynamically position the tooltip
      this.cleanup = autoUpdate(this.triggerRef, this.tooltipRef, () => {
        computePosition(this.triggerRef, this.tooltipRef, {
          middleware: [offset(8), shift()],
        }).then(({ x, y }) => {
          Object.assign(this.tooltipRef.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
        });
      });
    }
  
    private hideTooltip() {
      this.visible = false;
      if (this.cleanup) {
        this.cleanup();
        this.cleanup = undefined;
      }
    }
  
    render() {
      return html`
        <div class="trigger">
          <slot></slot>
        </div>
        <div class="tooltip" ?visible="${this.visible}">
          <slot name="tip">${this.text}</slot>
        </div>
      `;
    }
}