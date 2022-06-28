import { CSSResultGroup, html, LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { choose } from "lit/directives/choose";
import { createRef, ref, Ref } from "lit/directives/ref";
import styles from "bundle-text:./Random.less";

@customElement("juel-random")
export class JuelRandom extends LitElement {
    
    static styles = unsafeCSS(styles);

    @property() type: string;
    @property() values: string;
    @property() trigger: string;

    @property() value: string;

    elementRef: Ref<HTMLElement> = createRef();

    constructor() {
        super();
        this.type = "img"
        this.trigger = "load"
    }

    firstUpdated() {
            if (this.values) {
                switch (this.trigger) {
                    case "load":
                        this.setValue();
                        break;
                    default:
                        let interval: number;
                        if (this.trigger.endsWith('s')) {
                            interval = parseFloat(this.trigger.replace('s', '')) * 1000;
                        }
                        if (interval) {
                            setInterval(() => {
                                this.setValue();
                            }, interval);
                        }
                        break;
                }
            }
    }

    setValue() {
            let splitty = this.values.split(' ');
            this.value = splitty[Math.floor(Math.random() * splitty.length)];
            /*let p = el.parentElement;
            if (p.nodeName == "AUDIO" || p.nodeName == "VIDEO") {
                (<HTMLAudioElement>p).load();
                if (p.hasAttribute("autoplay")) {
                    (<HTMLAudioElement>p).play();
                }
            }*/
    }

    protected updated(): void {
        if (this.elementRef.value) {
            let el = this.elementRef.value;
            (<HTMLAudioElement>el).load();
            if (el.hasAttribute("autoplay")) {
                (<HTMLAudioElement>el).play();
            }
        }
    }

    render() {
        return html`${choose(this.type, [
            [ 'img', () => html`<img src="${this.value}" />` ],
            [ 'video', () => html`<video ${ref(this.elementRef)} autoplay loop muted><source src="${this.value}"></video>` ]
        ])}`
    }
}