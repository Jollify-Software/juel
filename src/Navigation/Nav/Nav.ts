import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Nav.less';
import { classMap } from "lit/directives/class-map";
import { createRef, ref, Ref } from "lit/directives/ref";
import { DomReady } from "../../_Utils/DomReady";

/**
 * A site or app navigation bar. Slot the links (or `<li>`s) in; `slot="title"`
 * for a brand/logo. Below 768px the links fold behind a menu button.
 *
 * `direction="vertical"` makes it a sidebar: title on top, links stacked,
 * filling the height it's given (and never sticky). It still folds to the
 * top bar and menu button on a narrow screen. Links marked
 * `aria-current="page"` (juel-router does this) are highlighted.
 *
 * Parts: `nav`, `title`, `toggle`, `menu`.
 */
@customElement('juel-nav')
export class JuelNav extends LitElement {

  static styles?: CSSResultGroup = unsafeCSS(Styles);

  nav: Ref<HTMLInputElement> = createRef();

  // Property to toggle the hamburger menu
  @property({ type: Boolean })
  open: boolean = false;
  @property({ type: Boolean })
  sticky: boolean = true;
  /** `horizontal` (a top bar, the default) or `vertical` (a sidebar). */
  @property({ type: String, reflect: true })
  direction: 'horizontal' | 'vertical' = 'horizontal';

  private readonly _boundHandleScroll = this._handleScroll.bind(this);
  private _navbarOffset = 0;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.sticky && this.direction !== 'vertical') {
      this.stickNavbar();
    }
  }

  disconnectedCallback(): void {
    window.removeEventListener('scroll', this._boundHandleScroll);
    super.disconnectedCallback();
  }

  stickNavbar() {
    // DOMContentLoaded may already have fired by the time this runs (e.g. a
    // script loaded normally, or the nav added to the page after load) — a
    // raw addEventListener('DOMContentLoaded', ...) would then never fire.
    DomReady().then(() => {
      const navbar = this.nav.value as HTMLElement;
      this._navbarOffset = navbar.offsetTop;
      window.addEventListener('scroll', this._boundHandleScroll);
    });
  }

  private _handleScroll() {
    const navbar = this.nav.value as HTMLElement;
    if (this.direction !== 'vertical' && window.scrollY > this._navbarOffset) {
      navbar.classList.add('fixed');
    } else {
      navbar.classList.remove('fixed');
    }
  }

  // Toggle the menu when the hamburger is clicked
  private toggleMenu() {
    this.open = !this.open;
  }

  private _onToggleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggleMenu();
    }
  }

  // Close the mobile menu once a nav item has been chosen, so it doesn't
  // stay open covering the page after navigating.
  private _onMenuClick() {
    if (this.open) {
      this.open = false;
    }
  }

  // Render the component
  render() {
    let menuClass = { open: this.open };

    return html`
      <nav ${ref(this.nav)} part="nav">
        <div class="logo" part="title"><slot name="title"></slot></div>
        <div
          part="toggle"
          class="menu-toggle ${classMap(menuClass)}"
          role="button"
          tabindex="0"
          aria-expanded="${this.open}"
          aria-label="Toggle menu"
          @click="${this.toggleMenu}"
          @keydown="${this._onToggleKeydown}">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <ul part="menu" class="menu ${classMap(menuClass)}" @click="${this._onMenuClick}">
          <slot></slot>
        </ul>
      </nav>
    `;
  }

}