import { html, LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import style from 'bundle-text:./Progress.less';
import { choose } from "lit/directives/choose";

@customElement("juel-progress")
export class JuelProgress extends LitElement {
    
    static styles = unsafeCSS(style);

    @property() type: string;
    @property() label: string;
    @property({ type: Number }) value: number;
    @property({ type: Number}) stroke: number;
    @property({ type: Number}) size: number;
    @property() indeterminate: string;
    @property({ type: Boolean }) alternate: boolean;

    interval: number;

    radius: number;
    circumference: number;
    dash: number;

    constructor() {
        super();
        this.type = "line";
        this.value = 0;
        this.stroke = 20;
        this.size = 250;
        this.radius = (this.size - this.stroke) / 2;
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        if (this.type == "ring") {
            this.setCircleProperties();
        }
    }

    protected updated(_changedProperties: Map<string | number | symbol, unknown>): void {
        if (_changedProperties.has("indeterminate")) {
            this.style.setProperty("--indeterminate", this.indeterminate);
        }
        if (_changedProperties.has("size") || _changedProperties.has("stroke") ||
            (_changedProperties.has("type") && this.type == "ring")) {
            this.setCircleProperties();
        }

        if (_changedProperties.has("value") && this.value <= 100) {
            if (this.type == "ring") {
                this.dash = (this.value * this.circumference) / 100;
                this.style.setProperty("--progress", this.dash.toString());
            } else {
                this.style.setProperty("--progress", `${Math.min(this.value, 100)}%`);
            }
        }
    }

    private setCircleProperties() {
        this.radius = (this.size - this.stroke) / 2;
        this.circumference = this.radius * Math.PI * 2;
        this.dash = (this.value * this.circumference) / 100;
        this.style.setProperty("--progress", this.dash.toString());
        this.style.setProperty("--circumference", this.circumference.toString());
    }

    render() {
        let klass = 'bar';
        if (this.type == "block") {
            klass += ' block';
        }
        if (this.indeterminate || this.indeterminate == '') {
            klass += ' indeterminate';
        }
        if (this.alternate) {
            klass += ' alternate';
        }
        return html`${choose(this.type, [
            [ "line", () => html`<div class="progress"><div class="${klass}"></div></div>` ],
            [ "block", () => html`<div class="progress"><div class="${klass}"></div></div>` ],
            [ "ring", () => html`<svg class="progress" width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}">
                <circle cx="${this.size / 2}" cy="${this.size / 2}" r="${this.radius}" stroke-width="${this.stroke}px"/>
                <circle class="${klass}" cx="${this.size / 2}" cy="${this.size / 2}" r="${this.radius}" stroke-width="${this.stroke}px"/>
                <text fill="black" font-size="40px" x="50%" y="50%" dy="20px" text-anchor="middle">${this.label}</text></svg` ]
        ])}`;
    }
}