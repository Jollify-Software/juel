// juel.demo (SHOW-ME-PLAN SM0): play a demo with the ghost hand, or coach the
// person through it. One at a time: starting one stops the one before.
//
//   const run = juel.demo.play({ title: 'Split a heading into letters', steps: [
//       { click: 'h1', say: 'Click the heading.' },
//       { choose: '.split-menu', item: 'Letters', say: 'Split it into letters.' },
//       { drag: 'h1 .char-3', to: { dx: 0, dy: -40 }, say: 'Drag one letter up.' },
//   ] });
//   const { result } = await run.finished;
//
// The README beside this file has every step and option.
import { DemoOptions, DemoRun } from "./DemoRunner";
import { DemoScript, DemoStepInput, toDemoSteps } from "./DemoScript";

export namespace DemoModule {
    var current: DemoRun | null = null;

    /** Plays `script` with the ghost hand. Returns the run (pause, step, stop, `finished`). */
    export var play = (script: DemoScript | DemoStepInput[], options: DemoOptions = {}) => {
        current?.stop();
        current = new DemoRun(script, { ...options, mode: "play" }).start();
        return current;
    }

    /** Coaches the person through `script`: each step ringed, waiting for them to do it. */
    export var coach = (script: DemoScript | DemoStepInput[], options: DemoOptions = {}) => {
        current?.stop();
        current = new DemoRun(script, { ...options, mode: "coach" }).start();
        return current;
    }

    /** Stops the demo playing, if any. */
    export var stop = () => {
        current?.stop();
    }

    /** The demo playing (or held at its end), if any. */
    export var active = () => current && !(current.ended && !document.querySelector("juel-demo-bar")) ? current : null;

    /** Checks a script without playing it: throws on the first mistake (a step with two actions, say). */
    export var check = (script: DemoScript | DemoStepInput[]) => {
        toDemoSteps(script);
        return true;
    }
}
