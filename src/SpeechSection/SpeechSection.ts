import { customElement, LitElement, html, property, unsafeCSS } from "lit-element";
import { SpeechSectionService } from "./SpeechSectionService";
import styles from "bundle-text:./SpeechSection.css";

@customElement("speech-section")
export class SpeechSection extends LitElement {

    static styles = unsafeCSS(styles);

    @property() lang: string;
    @property() pitch: number;
    @property() pitchLabel: string = "Pitch";
    @property() rate: number;
    @property() rateLabel: string = "Rate";
    @property() voice: string;
    @property() voiceLabel: string = "Voice";
    @property() volume: number;
    @property() volumeLabel: string = "Volume";

    @property() controls: boolean | string;
    @property() controlPitch: boolean = false;
    @property() controlRate: boolean = false;
    @property() controlVolume: boolean = false;

    service: SpeechSectionService;

    constructor() {
        super();
        this.service = new SpeechSectionService(this);
        this.service.getVoices();  
    }

    firstUpdated() {
        this.service.init();
        this.service.volume = this.volume;
    }

    render() {
        return html`
        <div class="header">
            <div class="trigger"><slot name="trigger">💬</slot></div>
            ${this.controls == "true" ?
                html`
                    <span class="control">
                        <label for="voice">${this.voiceLabel}</label>
                        <select id="voice" @change="${this.service.voiceChangeHandler}">
                            ${this.service.voices.map((v, i) => html`<option value="${i}">${v.name} (${v.lang})</option>`)}
                        </select>
                    </span>
                    ${this.controlVolume ?
                        html`
                        <span class="control">
                            <label for="volume">${this.volumeLabel}</label>
                            <input type="range" id="volume" name="volume"
                                value="1" min="0" max="1" step=".01" @change="${this.service.volumeChangeHandler}">
                        </span>` : ''}
                    ${this.controlRate ?
                        html`
                            <span class="control">
                                <label for="rate">${this.rateLabel}</label>
                                <input type="range" id="rate"
                                    value="1" min="0" max="1" step=".01" @change="${this.service.rateChangeHandler}">
                            </span>` : ''}
                    ${this.controlPitch ?
                        html`
                            <span class="control">
                                <label for="pitch">${this.pitchLabel}</label>
                                <input type="range" id="pitch"
                                    value="1" min="0" max="1" step=".01" @change="${this.service.pitchChangeHandler}">
                            </span>` : ''}
                    ` :
                ''}
        </div>
        <div class="content"><slot name="content"></slot></div>`;
    }
}