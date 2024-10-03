import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { html, PropertyValueMap, unsafeCSS } from "lit";
import { when } from "lit/directives/when";
import { classMap } from "lit/directives/class-map";
import Styles from "bundle-text:./Media.less";

@customElement("juel-media")
export class JuelMedia extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property()
    src: string;
    @property({ type: Boolean })
    background: boolean;

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.src) {
            let img = new Image();
            img.src = img.src;
        }
    }

    protected render(): unknown {
        let classes = { background: this.background};
        return html`<div id="container" class="${classMap(classes)}">
        ${when(this.background, () => html`<video class="background" autoplay muted loop src="${this.src}" >`)}
        </div>`;
    }
}