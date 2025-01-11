import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import { html, PropertyValueMap, unsafeCSS } from "lit";
import { when } from "lit/directives/when";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import Styles from "bundle-text:./Media.less";
import { isMediaSource, MediaSourceType } from "../../_Utils/String/isMediaSource";
import { choose } from "lit/directives/choose";

@customElement("juel-media")
export class JuelMedia extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property()
    src: string;
    @property()
    blend: string = 'unset';
    @property({ type: Boolean })
    background: boolean;

    sourceType: MediaSourceType;

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        
    }

    protected render(): unknown {
        if (this.src.includes(" ")) {
            let splity = this.src.split(" ");
            this.sourceType = isMediaSource(splity[0]);
        } else {
            this.sourceType = isMediaSource(this.src);
        }
        console.log(this.sourceType);
        if (this.src) {
            let img = new Image();
            img.src = img.src;
        }

        let classes = { background: this.background};
        let styles;
        if (this.src.includes(' ') && this.blend) {
            let splity = this.src.split(" ");
            styles = {
                'background-image': splity.map((str) => `url(${str})`).join(', '),
                'background-blend-mode': `${this.blend}`
            };
        }

        return html`<div id="container" class="${classMap(classes)}">
        ${choose(this.sourceType.type, [
            ["video", () => when(this.background, () => html`<video autoplay muted loop src="${this.src}" >`,
                () => html`<video controls src="${this.src}" >`)],
            ["audio", () => when(this.background, () => html`<audio autoplay muted loop src="${this.src}" >`,
                () => html`<audio controls src="${this.src}" >`)],
            ["image", () => when(this.src.includes(' '), () => html`<div style="${styleMap(styles)}"></div>`,
                () => html`<img src="${this.src}" >`)
            ]
        ])}
        </div>`;
    }
}