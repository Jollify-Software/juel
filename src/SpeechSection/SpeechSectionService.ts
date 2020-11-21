import { SpeechSection } from "./SpeechSection";

export class SpeechSectionService {

    ele: SpeechSection;
    voices: SpeechSynthesisVoice[];
    voiceIndex: number = 0;
    volume: number;
    rate: number;
    pitch: number;

    constructor(ele: SpeechSection) {
        this.ele = ele;
        this.voiceChangeHandler = this.voiceChangeHandler.bind(this);
        this.volumeChangeHandler = this.volumeChangeHandler.bind(this);
        this.rateChangeHandler = this.rateChangeHandler.bind(this);
        this.pitchChangeHandler = this.pitchChangeHandler.bind(this);
    }

    getVoices() {
        this.voices = window.speechSynthesis.getVoices();
    }

    voiceChangeHandler(e: Event) {
        this.voiceIndex = (e.target as any).value;
    }

    volumeChangeHandler(e: Event) {
        this.volume = (e.target as any).value;
    }

    rateChangeHandler(e: Event) {
        this.rate = (e.target as any).value;
    }

    pitchChangeHandler(e: Event) {
        this.pitch = (e.target as any).value;
    }

    initExternalControl () {
        let con = $(this.ele.controls as string);
        con.find('[data-control="voice"]').each((index, element) => {
            let options = this.voices.map((v, voiceIndex) => {
                let opt = document.createElement('option');
                opt.value = voiceIndex.toString();
                opt.text = `${v.name} (${v.lang})`;
                return opt;
            });
            $(element).append(options);
        }).change(this.voiceChangeHandler as any)
            .on("selectmenuchange", this.voiceChangeHandler as any);
        // Volume
        con.find('[data-control="volume"]')
            .on("slidechange", (e, ui) => {
                (e.target as any).value = ui.value;
                this.volumeChangeHandler(e as any);
            });
        // Rate
        con.find('[data-control="rate"]')
            .on("slidechange", (e, ui) => {
                (e.target as any).value = ui.value;
                this.rateChangeHandler(e as any);
            });
        // Pitch
        con.find('[data-control="pitch"]')
            .on("slidechange", (e, ui) => {
                (e.target as any).value = ui.value / 100;
                this.pitchChangeHandler(e as any);
            });
    }

    init() {
        let $ele = $(this.ele);
        if (this.ele.controls != "true" && this.ele.controls != "false") {
            this.initExternalControl();
        }
        $(this.ele.shadowRoot).find('.trigger').click((e) => {
            // TODO
            let text = $ele.find('[slot="content"').text();
            // As in 🐄's
            let udder = new SpeechSynthesisUtterance(text);
            if (this.voices) {
                udder.voice = this.voices[this.voiceIndex];
            }
            if (this.volume) {
                udder.volume = this.volume;
            }
            if (this.rate) {
                udder.rate = this.rate;
            }
            if (this.pitch) {
                udder.pitch = this.pitch;
            }
            window.speechSynthesis.speak(udder);
        });
    }
}