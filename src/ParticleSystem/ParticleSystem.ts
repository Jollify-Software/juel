import { customElement, html, LitElement } from "lit-element";
import { ArgInfo } from "./ArgInfo";
import { ParticleArgsStrategy } from "./ParticleArgsStrategy";
import { ParticleGroup } from "./ParticleGroup";
import Proton from "proton-engine";
import RAFManager from "raf-manager";

@customElement("juel-particle-system")
export class JuelParticleSystem extends LitElement {
    argStrategy: ParticleArgsStrategy;
    groups: ParticleGroup[]

    proton = new Proton();
    renderer;
    emitters = [];

    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    constructor() {
        super();
        this.argStrategy = new ParticleArgsStrategy();
    }

    updated() {
        this.canvas = this.querySelector('canvas');
        if (this.canvas && this.groups) {
            this.context = this.canvas.getContext("2d");
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
                /*emitter.rate = new Proton.Rate(
                    new Proton.Span(10, 20),
                    new Proton.Span(0.1, 0.25)
                  );
                  emitter.addInitialize(new Proton.Mass(1));
                  emitter.addInitialize(new Proton.Radius(1, 12));
                  emitter.addInitialize(new Proton.Life(2, 4));
                  emitter.addInitialize(
                    new Proton.Velocity(
                      new Proton.Span(2, 4),
                      new Proton.Span(-30, 30),
                      "polar"
                    )
                  );
                  emitter.addBehaviour(new Proton.RandomDrift(30, 30, 0.05));
                  emitter.addBehaviour(
                    new Proton.Color("ff0000", "random", Infinity, Proton.easeOutQuart)
                  );
                emitter.addBehaviour(new Proton.Scale(1, 0.7));*/
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
                this.context.fillStyle = "rgba(0, 0, 0, 0.1)";
                this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            };
            this.proton.addRenderer(this.renderer);

            RAFManager.add(() => {
                this.emitters[0].rotation += 1.5;
                this.proton.update();
            });
        }
    }

    createRenderRoot() {
        return this;
    }

    render() {
        return html`<canvas width="800" height="800"><canvas>`;
    }
}