import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from "bundle-text:./BreadcrumbItem.less";

@customElement('juel-breadcrumb-item')
export class JuelBreadcrumbItem extends LitElement {
  static styles = unsafeCSS(Styles);

  @property({ type: String }) href: string = '';
  @property({ type: Boolean, reflect: true }) active: boolean = false;

  render() {
    return html`
      ${this.active
        ? html`<span><slot></slot></span>`
        : html`<a href="${this.href}"><slot></slot></a>`}
    `;
  }
}