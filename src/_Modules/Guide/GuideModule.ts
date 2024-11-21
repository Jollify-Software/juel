import { VisualGuide } from "./Guide";
import { Options } from "./Options";
import { Step } from "./Step";

export module GuideModule {
    var guide: VisualGuide;
    export var start = (steps?: Step[], options?: Options) => {
        if (guide) {
            guide.start();
        } else {
        guide = new VisualGuide(steps, options);
        guide.start();
        }
      }

      export var end = () => {
        guide.end();
      }
}