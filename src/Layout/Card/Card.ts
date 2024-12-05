import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators";
import Styles from 'bundle-text:./Card.less';

@customElement("juel-card")
export class JuelCard extends LitElement {
    static styles = unsafeCSS(Styles);

    render() {
        return html`
        <div class="image"><slot name="image"></slot></div>
        <div class="title"><slot name="title"></slot></div>
        <div class="body"><slot></slot></div>`;
    }    
}