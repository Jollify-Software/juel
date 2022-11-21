import bind from "bind-decorator";
import { customElement, property } from "lit/decorators";
import { Stave, Voice } from "vexflow";
import { CommandBase } from "../_Base/CommandBase";
import { JuelMusic } from "./Music";

@customElement("juel-music-stave")
export class JuelMusicStave extends CommandBase {
    @property() clef: string;
    @property() signature: string;

    stave: Stave;
    voices: Voice[];

    constructor() {
        super();
        this.clef = "treble";
        this.signature = "4/4";
        this.voices = [];
    }

    firstUpdated() {
        let music: JuelMusic;
        if (this.parentElement.nodeName == "JUEL-MUSIC") {
            music = this.parentElement as JuelMusic;
        } else {
            return;
        }

        this.stave = new Stave(0, 0, music.width);
        this.stave.addClef(this.clef);
        this.stave.addTimeSignature(this.signature);
        this.stave.setContext(music.context);
        this.stave.draw();
        music.staves.push(this.stave);

        setTimeout(this.renderVoices, 500);
    }

    @bind
    renderVoices() {
        if (this.voices.length > 0) {
            let music: JuelMusic;
        if (this.parentElement.nodeName == "JUEL-MUSIC") {
            music = this.parentElement as JuelMusic;
        } else {
            return;
        }
        console.log(this.voices)
        music.formatter.joinVoices(this.voices).format(this.voices, music.width - 250);
        for (let v of this.voices) {
            v.draw(music.context, this.stave);
        }
        }
    }
}