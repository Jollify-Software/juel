import { LitElement, html, css, CSSResultGroup, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import Styles from 'bundle-text:./Breadcrumb.less';

@customElement('juel-breadcrumb')
export class JuelBreadcrumb extends LitElement {
  static styles?: CSSResultGroup = unsafeCSS(Styles);

  render() {
    return html`
      <nav aria-label="breadcrumb">
        <slot></slot>
      </nav>
    `;
  }
}