import { html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Progress.less';

@customElement("juel-progress")
export class JuelProgress extends LitElement {
    
    static styles = unsafeCSS(style);

    @property() type: string;
    @property({ type: Number }) value: number

    constructor() {
        super();
        this.type = "line";
        this.value = 0;
    }

    protected updated(_changedProperties: Map<string | number | symbol, unknown>): void {
        const circle = this.shadowRoot.querySelector('.progress-ring__circle') as SVGCircleElement;
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference.toString();

        const offset = circumference - this.value / 100 * circumference;
        circle.style.strokeDashoffset = offset.toString();
    }

    render() {
        return html`${
            this.type == "ring" ? html`
            <svg class="progress-ring" height="120" width="120">
                <circle class="progress-ring__circle" stroke-width="1" fill="transparent" r="58" cx="60" cy="60"/>
            </svg>` : ``
        }`;
    }
}