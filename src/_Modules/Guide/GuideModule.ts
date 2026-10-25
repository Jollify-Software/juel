import { GuideOptions, VisualGuide } from "./Guide";
import { GuideStepInput, isSeen, resetSeen as forget } from "./GuideStep";

export module GuideModule {
    var guide: VisualGuide | null = null;

    /**
     * Starts a guide through `steps` (`{ target, title, html, placement, wait }`,
     * or today's `{ selector, title, description }`), ending any guide still
     * showing first. Returns the guide.
     */
    export var start = (steps: GuideStepInput[] = [], options?: GuideOptions) => {
        // Always build a fresh guide for the steps just given, and end the one
        // still showing first, so back-to-back calls never stack two overlays.
        guide?.end();
        guide = new VisualGuide(steps, options);
        guide.start();
        return guide;
    }

    /** Ends the guide that is showing, as skipped. */
    export var end = () => {
        guide?.end();
    }

    /** Whether the guide remembered under `storageKey` has been seen on this browser. */
    export var seen = (storageKey: string) => isSeen(storageKey);

    /** Forgets that the guide under `storageKey` was seen. */
    export var resetSeen = (storageKey: string) => forget(storageKey);
}
