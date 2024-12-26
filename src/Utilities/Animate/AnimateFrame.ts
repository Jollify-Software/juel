import { LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { CommandBase } from "../../_Base/CommandBase";
import { MillisecondConverter } from "../../_Converters/MillisecondConverter";
import { DOMStringMapConverter } from "../../_Converters/DOMStringMapConvertor";
import { JuelAnimate } from "./Animate";
import { AnimationFrame } from "./AnimationFrame";

@customElement("juel-animate-frame")
export class JuelAnimateFrame extends CommandBase {
    
    @property({ converter: DOMStringMapConverter }) properties: object;
    @property({ converter: MillisecondConverter(1000), type: Number }) duration: number;
    @property({ converter: MillisecondConverter(undefined), type: Number }) delay: number;
    @property() easing: string;

    /**
     *
     */
    constructor() {
        super();
        this.duration = 1000;
    }
    
    protected updated(_changedProperties: PropertyValues): void {
        if (this.properties) {
            let frame: AnimationFrame = {
                properties: {}
            };
            if (this.duration) frame.duration = this.duration;
            if (this.delay) frame.delay = this.delay;
            if (this.easing) frame.easing = this.easing;
            frame.properties = this.properties;
    
            let animation = this.parentElement as JuelAnimate;
            if (!('addFrame' in animation)) {
                console.error("Animation frame must be placed within a <juel-animate> component.");
            } else {
                animation.addFrame(frame);
            }
        }
    }
}