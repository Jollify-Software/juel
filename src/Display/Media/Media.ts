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

    index: number;

    attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
        if (name == "src") {
            if (value && value.includes(" ")) {
                let splity = value.split(" ");
                this.index = Math.floor(Math.random() * splity.length);
            }
        }
        super.attributeChangedCallback(name, _old, value);
    }

    getSrc(): string {
        if (this.src.includes(" ")) {
            let splity = this.src.split(" ");
            return splity[this.index];
        }
        return this.src;
    }

    protected render(): unknown {
        let splity: string[];
        if (this.src.includes(" ")) {
            splity = this.src.split(" ");
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
            splity = this.src.split(" ");
            styles = {
                'background-image': splity.map((str) => `url(${str})`).join(', '),
                'background-blend-mode': `${this.blend}`
            };
        }

        return html`<div id="container" class="${classMap(classes)}">
        ${choose(this.sourceType.type, [
            ["video", () => when(this.background, () => html`<video autoplay muted loop src="${this.getSrc()}" >`,
                () => html`<video controls src="${this.src}" >`)],
            ["audio", () => when(this.background, () => html`<audio autoplay muted loop src="${this.getSrc()}" >`,
                () => html`<audio controls src="${this.src}" >`)],
            ["image", () => when(splity && this.blend, () => html`<div style="${styleMap(styles)}"></div>`,
                () => html`<img src="${this.getSrc()}" >`)
            ]
        ])}
        </div>`;
    }
}