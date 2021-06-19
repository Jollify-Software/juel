import { ArgInfo } from "./ArgInfo";
import Proton from "proton-engine";

// http://drawcall.github.io/Proton/
export class ParticleArgsStrategy {
    process(arg: ArgInfo) {
        let args = arg.args.map(a => {
            if (typeof a === 'object' && a !== null && 'type' in a) {
                return this.process(a as ArgInfo);
            } else {
                return a;
            }
        });
        let ctr;
        switch (arg.type) {
            case "mass":
                ctr = Proton.Mass;
                break;
            case "radius":
                ctr = Proton.Radius;
                break;
            case "life":
                ctr = Proton.Life;
                break;
            case "span":
                ctr = Proton.Span;
                break;
            case "scale":
                ctr = Proton.Scale;
                break;
            case "rate":                
                ctr = Proton.Rate;
                break;
            case "randomDrift":
                ctr = Proton.RandomDrift;
                break;
            case "velocity":
                ctr = Proton.Velocity;
                break;
            case "alpha":
                ctr = Proton.Alpha;
                break;
            case "color":
            case "colour":
                ctr = Proton.Color;
                break;
        }
        if (ctr) {
            return new (Function.prototype.bind.apply(
                ctr, [ 0, args].flat())
            );
        }
    }
}