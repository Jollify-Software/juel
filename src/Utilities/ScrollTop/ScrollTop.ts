import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./ScrollTop.less';
import { RippleEffect } from "../../_Utils/RippleEffect";
import { createRef, ref } from "lit/directives/ref";

@customElement('juel-scroll-top')
export class JuelScrollTop extends LitElement {

    static styles: CSSResultGroup = unsafeCSS(Styles);

  // Property to control button visibility
  @property({ type: Boolean })
  visible: boolean = false;

  // Listen for scroll events when the component is connected to the DOM
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('scroll', this.handleScroll);
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    RippleEffect.init(this.shadowRoot);
  }

  // Clean up event listeners when the component is disconnected
  disconnectedCallback() {
    window.removeEventListener('scroll', this.handleScroll);
    super.disconnectedCallback();
  }

  // Handle scroll events to toggle visibility of the button
  private handleScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    this.visible = scrollTop > 200; // Show button if scrolled more than 200px
  };

  // Scroll to the top of the page smoothly
  private handleClick(e: MouseEvent) {
    RippleEffect.createRipple(e);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Render the component
  render() {
    return html`
      <button
        class="${this.visible ? 'visible' : ''}"
        @click="${this.handleClick}"
        title="Scroll to top"
      >
        ↑
      </button>
    `;
  }
}