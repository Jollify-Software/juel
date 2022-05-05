import { LitElement, PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("juel-image-preload")
export class JuelImagePreload extends LitElement {
    @property() type: string
    @property() exclude: string[];

    constructor() {
        super();
        this.type = "all";
    }

    firstUpdated(): void {
        if (this.type == "css" || this.type == "all") {
            let regex = /(?<=url\().+(?=\))/g;
            let styles: HTMLStyleElement[] = Array.prototype.slice.call(document.head.getElementsByTagName('style'));
            styles = styles.concat(Array.prototype.slice.call(document.body.getElementsByTagName('style')));
            styles = styles.filter(el => el.id != 'juel-styles');
            for (let el of styles) {
                el.textContent.match(regex).forEach(match => {
                    let img = new Image();
                    img.src = match;
                })
            }
        }
        if (this.type == 'element' || this.type == 'all') {
            let els: HTMLImageElement[] = Array.prototype.slice.call(document.body.getElementsByTagName('img'));
            for (let el of els) {
                let img = new Image();
                img.src = el.src;
            }
        }
    }
}