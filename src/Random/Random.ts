import { LitElement } from "lit";
import { property, customElement } from "lit/decorators";

@customElement("juel-random")
export class JuelRandom extends LitElement {
    @property() selector: string;
    @property() attr: string;
    @property() values: string;
    @property() trigger: string;

    constructor() {
        super();
        this.attr = "src";
        this.trigger = "load"
    }

    createRenderRoot() {
        return this;
    }

    firstUpdated() {
        setTimeout(() => {
            if (this.selector && this.values) {
                let el = document.querySelector(this.selector);
                switch (this.trigger) {
                    case "load":
                        this.setValue(el as HTMLElement);
                        break;
                    default:
                        let interval: number;
                        if (this.trigger.endsWith('s')) {
                            interval = parseFloat(this.trigger.replace('s', '')) * 1000;
                        }
                        if (interval) {
                            setInterval(() => {
                                this.setValue(el as HTMLElement);
                            }, interval);
                        }
                        break;
                }
            }
        });
    }

    setValue(el: HTMLElement) {
        if (this.attr in el) {
            let splitty = this.values.split(' ');
            el[this.attr] = splitty[Math.floor(Math.random() * splitty.length)];
        }
    }
}