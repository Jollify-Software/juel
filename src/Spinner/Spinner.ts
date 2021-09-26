import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import { ArrayRange } from "../_Utils/ArrayRange";
import Styles from 'bundle-text:./Spinner.less';
import Hammer from 'hammerjs';
import { MathUtil } from "../_Utils/MathUtil";

@customElement("juel-spinner")
export class JuelSpinner extends LitElement {

    static styles = unsafeCSS(Styles);

    @property({ type: String }) value = "0";
    @property({ type: Number }) min = 0;
    @property({ type: Number }) max = 10;
    @property({ type: Number }) step = 1;
    @property({ type: Array }) items: any[];

    pos: number = 0;

    constructor() {
        super();
        if (!('Hammer' in window)) {
            window['Hammer'] = Hammer;
        }
    }

    setTransition(el: HTMLElement) {
        el.style.transition = 'margin .73s';
    }

    firstUpdated() {
        let items = this.shadowRoot.getElementById('items');
        let mc = new Hammer(this.shadowRoot.getElementById('container'));
        mc.get('pan').set({
            direction: Hammer.DIRECTION_VERTICAL
        });
        mc.on('pan', (e) => {
            let margin = MathUtil.clamp(this.pos + e.deltaY * -1, -(((items.childElementCount - 1) * 100) + 50), 50);
            items.style.marginTop = `${margin}px`;
            items.style.transition = null;
        });
        mc.on('panend', (e) => {
            this.pos = MathUtil.clamp(this.pos + Math.round((e.deltaY * -1) / 100) * 100, -((items.childElementCount - 1) * 100), 0);
            items.style.marginTop = `${this.pos}px`;
            this.setTransition(items);

            let index = this.pos < 0 ? this.pos / -100 : 0;
            let ray = (this.items ? this.items : ArrayRange(this.min, this.max, this.step));
            this.value = ray[index];
        });
    }

    increase() {
        let items = this.shadowRoot.getElementById('items');
        this.pos = MathUtil.clamp(this.pos + 100, -((items.childElementCount - 1) * 100), 0);
        items.style.marginTop = `${this.pos}px`;
            this.setTransition(items);
    }

    decrease() {
        let items = this.shadowRoot.getElementById('items');
        this.pos = MathUtil.clamp(this.pos + -100, -((items.childElementCount - 1) * 100), 0);
        items.style.marginTop = `${this.pos}px`;
            this.setTransition(items);
    }

    render() {

        return html`
            <button id="increase" @click="${this.increase}"></button>
            <div id="container">
            <div id="items">
                ${
                    (this.items ? this.items : ArrayRange(this.min, this.max, this.step))
                    .map((item, index) => {
                        return html`<h1>${item}</h1>`;
                    })
                }
            </div>
            </div>
            <button id="decrease" @click="${this.decrease}"></button>
        `;
    }

}