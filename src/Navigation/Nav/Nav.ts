import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Nav.less';
import { classMap } from "lit/directives/class-map";
import { createRef, ref, Ref } from "lit/directives/ref";

@customElement('juel-nav')
export class JuelNav extends LitElement {

  static styles?: CSSResultGroup = unsafeCSS(Styles);

  nav: Ref<HTMLInputElement> = createRef();

  // Property to toggle the hamburger menu
  @property({ type: Boolean })
  open: boolean = false;
  @property({ type: Boolean })
  sticky: boolean = true;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.sticky) {
      this.stickNavbar();
    }
  }
  stickNavbar() {
    document.addEventListener('DOMContentLoaded', () => {
      const navbar = this.nav.value as HTMLElement; // Get the navbar element
      const navbarOffset = navbar.offsetTop; // Get the initial position of the navbar
      
      window.addEventListener('scroll', function () {
        if (window.scrollY > navbarOffset) {
          navbar.classList.add('fixed');
        } else {
          navbar.classList.remove('fixed');
        }
      });
    });
  }

  // Toggle the menu when the hamburger is clicked
  private toggleMenu() {
    this.open = !this.open;
  }

  // Render the component
  render() {
    let menuClass = { open: this.open };

    return html`
      <nav ${ref(this.nav)}>
        <div class="logo"><slot name="title"></slot></div>
        <div class="menu-toggle ${classMap(menuClass)}" @click="${this.toggleMenu}">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <ul class="menu ${classMap(menuClass)}">
          <slot></slot>
        </ul>
      </nav>
    `;
  }

}