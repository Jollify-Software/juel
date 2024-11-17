import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./ScrollTop.less';
import { RippleInitialiser } from "../../_Utils/RippleModule";
import { createRef, ref } from "lit/directives/ref";

@customElement('juel-scroll-top')
export class JuelScrollTop extends LitElement {

    static styles: CSSResultGroup = unsafeCSS(Styles);

  // Property to control button visibility
  @property({ type: Boolean })
  visible: boolean = false;

  ripple: RippleInitialiser

  buttonRef = createRef();

  // Listen for scroll events when the component is connected to the DOM
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('scroll', this.handleScroll);
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.ripple = new RippleInitialiser(this.buttonRef.value as HTMLElement, this.shadowRoot);
  }

  // Clean up event listeners when the component is disconnected
  disconnectedCallback() {
    window.removeEventListener('scroll', this.handleScroll);
    this.ripple.removeRipples(this.buttonRef.value as HTMLElement);
    super.disconnectedCallback();
  }

  // Handle scroll events to toggle visibility of the button
  private handleScroll = () => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    this.visible = scrollTop > 200; // Show button if scrolled more than 200px
  };

  // Scroll to the top of the page smoothly
  private scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // Render the component
  render() {
    return html`
      <button ${ref(this.buttonRef)}
        class="${this.visible ? 'visible' : ''}"
        @click="${this.scrollToTop}"
        title="Scroll to top"
      >
        ↑
      </button>
    `;
  }
}