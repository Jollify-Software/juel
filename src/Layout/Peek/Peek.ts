import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Peek.less';

@customElement('juel-peek')
export class JuelPeek extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property({ type: String }) direction: 'left' | 'right' | 'up' | 'down' = 'down';

    firstUpdated() {
      // Attach event handlers after the component is rendered
      const header = this.shadowRoot?.querySelector('.header');
      const content = this.shadowRoot?.querySelector('.content');
  
      if (header && content) {
        $(header).on('click mouseover', () => {
          const slideOptions/*: AnimationOptions*/ = {
            down: { direction: 'down' },
            up: { direction: 'up' },
            left: { direction: 'left' },
            right: { direction: 'right' },
          };
  
          $(content).stop(true, true).slideToggle(300, slideOptions[this.direction] as any);
        });
      }
    }
  
    render() {
      return html`
        <div>
          <div class="header">
            <slot name="header">Header</slot>
          </div>
          <div class="content">
            <slot name="content">Content</slot>
          </div>
        </div>
      `;
    }
}