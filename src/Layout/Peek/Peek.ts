import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Peek.less';

@customElement('juel-peek')
export class JuelPeek extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  @property({ type: String }) direction: 'left' | 'right' | 'up' | 'down' = 'right';
  @property({ type: Boolean }) expanded: boolean = false;

  private toggleExpansion() {
    this.expanded = !this.expanded;
  }

  render() {
    return html`
      <div
        class="container"
        @click=${this.toggleExpansion}
        @mouseover=${this.toggleExpansion}
        @mouseout=${this.toggleExpansion}
      >
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