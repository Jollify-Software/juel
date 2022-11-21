import { customElement, property } from "lit/decorators";
import { StaveNote, StaveNoteStruct, Stem } from "vexflow";
import { CommandBase } from "../_Base/CommandBase";
import { ArrayConverter } from "../_Converters/ArrayConverter";
import { JuelMusic } from "./Music";
import { JuelMusicVoice } from "./Voice";

@customElement("juel-music-note")
export class JuelMusicNote extends CommandBase {

    @property({ converter: ArrayConverter() }) keys: string[];
    @property() duration: string;
    @property() stem: string;

    note: StaveNote;

    constructor() {
        super();
        this.duration = "q";
    }

    firstUpdated() {
        let voice: JuelMusicVoice;
        if (this.parentElement.nodeName == "JUEL-MUSIC-VOICE") {
            voice = this.parentElement as JuelMusicVoice;
        } else {
            return;
        }

        let struct: StaveNoteStruct = {};
        if (this.keys)
            struct.keys = this.keys;
        if (this.duration)
            struct.duration = this.duration;
        if (this.stem)
            struct.stem_direction = this.stem == "up" ? Stem.UP : Stem.DOWN;

        this.note = new StaveNote(struct);
        voice.voice.addTickable(this.note);
    }

}