import { html, LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Loading.less';
import { MillisecondConverter } from "../_Converters/MillisecondConverter";

@customElement("juel-loading")
export class JuelLoading extends LitElement {
    
    static styles = unsafeCSS(style);

    @property({ type: Boolean }) visible: boolean;
    @property({ type: Boolean }) screen: boolean;
    @property({ converter: MillisecondConverter(500) }) timeout: number;
    @property({ attribute: false }) promise: Promise<any>;

    constructor() {
        super();
        this.visible = true;
    }

    firstUpdated() {
        if (this.timeout) {
            setTimeout(() => this.visible = false, this.timeout);
        }
    }

    protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (_changedProperties.has("promise")) {
            this.promise.then(() => this.visible = false);
        }
    }

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
            <slot></slot>
        </div>`;
    }

}