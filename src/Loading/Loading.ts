import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Loading.less';

@customElement("juel-loading")
export class JuelLoading extends LitElement {
    
    static styles = unsafeCSS(style);

    @property() src: string;
    @property({ type: Boolean }) visible: boolean;
    @property({ type: Boolean }) screen: boolean;

    render() {
        let c = "loading";
        if (this.screen == true) {
            c += " fixed";
        }
        if (this.visible == false) {
            c += " hidden";
        }
        return html`
        <div class="${c}">
            <div class="circle"></div>
            ${this.src ? html`<img src="${this.src}" alt="">` : ``}
        </div>`;
    }

}