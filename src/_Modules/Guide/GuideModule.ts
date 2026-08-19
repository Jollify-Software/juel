import { VisualGuide } from "./Guide";
import { Options } from "./Options";
import { Step } from "./Step";

export module GuideModule {
    var guide: VisualGuide | null = null;

    export var start = (steps: Step[] = [], options?: Options) => {
        // Always build a fresh guide for the steps just given — reusing a
        // stale instance here meant a second start() with different steps
        // silently ran the *first* call's steps instead. End whatever was
        // still showing first, so back-to-back start() calls don't leave
        // two overlays stacked on top of each other.
        guide?.end();
        guide = new VisualGuide(steps, options);
        guide.start();
    }

    export var end = () => {
        guide?.end();
    }
}
