import { customElement, property } from "lit/decorators";
import { Voice, VoiceTime } from "vexflow";
import { CommandBase } from "../_Base/CommandBase";
import { JuelMusicStave } from "./Stave";

@customElement("juel-music-voice")
export class JuelMusicVoice extends CommandBase {
    
    @property({ type: Number }) beats: number;
    @property({ type: Number }) value: number;
    
    voice: Voice;

    constructor() {
        super();
        this.beats = 4;
        this.value = 4;
    }

    firstUpdated() {
        let stave: JuelMusicStave
        if (this.parentElement.nodeName == "JUEL-MUSIC-STAVE") {
            stave = this.parentElement as JuelMusicStave;
        } else {
            return;
        }

        stave.voices = [];
        let time: VoiceTime = {
            num_beats: this.beats,
            beat_value: this.value
        };
        this.voice = new Voice(time);
        stave.voices.push(this.voice);
    }

    renderVoices() {
        let stave: JuelMusicStave
        if (this.parentElement.nodeName == "JUEL-MUSIC-STAVE") {
            stave = this.parentElement as JuelMusicStave;
        } else {
            return;
        }
        stave.renderVoices();
    }
}
