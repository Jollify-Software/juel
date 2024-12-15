import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Nav.less';
import { classMap } from "lit/directives/class-map";

@customElement('juel-nav')
export class JuelNav extends LitElement {

  static styles?: CSSResultGroup = unsafeCSS(Styles);

  // Property to toggle the hamburger menu
  @property({ type: Boolean })
  open: boolean = false;


  // Toggle the menu when the hamburger is clicked
  private toggleMenu() {
    this.open = !this.open;
  }

  // Render the component
  render() {
    let menuClass = { open: this.open };

    return html`
      <nav>
        <div class="logo"><slot name="logo"></slot></div>
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