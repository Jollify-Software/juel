import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import anime, { AnimeInstance, AnimeParams } from "animejs";
import { AnimationFrame } from "./AnimationFrame";
import { CommandBase } from "../../_Base/CommandBase";
import { Events } from "./Events";
import bind from "bind-decorator";
import { CommandComponent } from "../../_Base/CommandComponent";

@customElement("juel-animate")
export class JuelAnimate extends CommandComponent {

    @property() selector: string;
    @property() easing: string;
    @property({ type: Boolean }) auto: boolean;
    @property({ type: Boolean }) loop: boolean;

    frames: AnimationFrame[];
    propertyFrames: {[id: string]: AnimationFrame[]};
    compiledAnimation: AnimeInstance;

    constructor() {
        super();
        this.auto = false;
        this.loop = false;
    }

    firstLoad(): void {
        this.compile();
    }

    addFrame(frame: AnimationFrame) {
        if (!this.frames) {
            this.frames = [];
        }
        this.frames.push(frame);
    }

    compile() {
        let args: AnimeParams = {
            targets: this.selector,
            autoplay: this.auto,
            loop: this.loop
        };
        if (this.easing) {
            args.easing = this.easing;
        }
        if (this.frames) {
            args.keyframes = this.frames.map(f => {
                let obj = Object.assign({}, f.properties);
                if (f.delay) obj.delay = f.delay;
                if (f.duration) obj.duration = f.duration;
                if (f.easing) obj.easing = f.easing;
                return obj;
            });
        }
        this.compiledAnimation = anime(args);

        this.compiledAnimation.complete = this.onFinished;
    }
    
    @bind
    onFinished() {
        let evt = new CustomEvent(Events.animationEnd, {
            detail: {
                element: this
            }
        });
        this.dispatchEvent(evt);
    }

    play() {
        console.log(this.compiledAnimation)
        let evt = new CustomEvent(Events.animationStart, {
            detail: {
                element: this
            }
        });
        this.dispatchEvent(evt);
        this.compiledAnimation.play();
    }

    stop() {
        let evt = new CustomEvent(Events.animationStop, {
            detail: {
                element: this
            }
        });
        this.dispatchEvent(evt);
        this.compiledAnimation.restart();
        this.compiledAnimation.pause();
    }

}