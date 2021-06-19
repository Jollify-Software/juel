import { customElement, html, LitElement } from "lit-element";
import { ArgInfo } from "./ArgInfo";
import { ParticleArgsStrategy } from "./ParticleArgsStrategy";
import { ParticleGroup } from "./ParticleGroup";
import Proton from "proton-engine";
import RAFManager from "raf-manager";
import { OperationProcessor } from "../_Core/OperationProcessor";

@customElement("juel-particle-system")
export class JuelParticleSystem extends LitElement {
    argStrategy: ParticleArgsStrategy;
    groups: ParticleGroup[]

    operationProcessor: OperationProcessor;

    proton = null;
    renderer;
    emitters = [];

    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    constructor() {
        super();
        this.argStrategy = new ParticleArgsStrategy();
        this.operationProcessor = new OperationProcessor();
        this.style.display = 'absolute';

        RAFManager.add(this.frame.bind(this));
    }

    updated() {
        
        if (!this.canvas) {
            this.canvas = this.querySelector('canvas');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        if (!this.context) {
            this.context = this.canvas.getContext("2d");
        }
        this.play();
    }

    play() {
        if (!this.proton) {
            this.proton = new Proton();
        }
        if (this.canvas && this.groups) {
            
            for (let g of this.groups) {
                let emitter = new Proton.Emitter();
                if (g.args) {
                    for (let i = 0; i < g.args.length; i++) {
                        let a = this.argStrategy.process(g.args[i]);
                        if (g.args[i].type == 'rate') {
                            emitter.rate = a;
                        } else {
                            emitter.addInitialize(a);
                        }
                    }
                    if (g.behaviour) {
                        for (let i = 0; i < g.behaviour.length; i++) {
                            let a = this.argStrategy.process(g.behaviour[i]);
                            emitter.addBehaviour(a);
                        }
                    }
                }
                emitter.p.x = this.canvas.width / 2;
                    emitter.p.y = this.canvas.height / 2;
                    console.log(emitter.p)
                    emitter.emit();
                    this.emitters.push(emitter);
                    this.proton.addEmitter(emitter);
                    console.log(emitter);
            }
            this.renderer = new Proton.CanvasRenderer(this.canvas);
            this.renderer.onProtonUpdate = () => {
                this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            };
            this.proton.addRenderer(this.renderer);
            RAFManager.start();
        }
    }

    stop() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        RAFManager.stop();
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        RAFManager.stop();
        this.proton = null;
        this.emitters = [];
    }

    frame() {
        if (this.proton) {
            if (this.groups && this.emitters) {
                for (let i = 0;i<this.groups.length;i++) {
                    if (this.groups[i].update) {
                        for (let u of this.groups[i].update) {
                            this.operationProcessor.process(u, this.emitters[i]);
                        }
                    }
                }
            }
            this.proton.update();
        }
        
    }

    createRenderRoot() {
        return this;
    }

    render() {
        return html`<canvas width="800" height="800"></canvas>`;
    }
}