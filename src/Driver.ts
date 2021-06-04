import "./JuelGlobal";
import Driver from "driver.js";
import Styles from "bundle-text:driver.js/dist/driver.min.css";
import { removeNulls } from "./_Utils/RemoveFunctions";

module GuideModule {
    let g: Driver;
    var createDriver = (options: any = null) => {
        if (options) {
            if (options.dotNet) {
                let obj: DotNet.DotNetObject = options.dotNet;
                options.onHighlightStarted = () => obj.invokeMethod("OnHighlightStarted")
                options.onHighlighted = () => obj.invokeMethod("OnHighlighted")
                options.onDeselected = () => obj.invokeMethod("OnDeselected")
                options.onReset = () => obj.invokeMethod("OnReset")
                options.onNext = () => obj.invokeMethod("OnNext")
                options.onPrevious = () => obj.invokeMethod("OnPrevious")
            }
            g = new Driver(options);
        } else {
            g = new Driver();
        }
    }

    export var highlight = (arg: any, options: any = null) => {
        setTimeout(() => {
            removeNulls(arg);
            createDriver(options);
            g.highlight(arg);
        });
    }
    export var step = (arg: any, options: any = null) => {
        setTimeout(() => {
            arg.forEach(obj => removeNulls(obj));
            createDriver(options);
            g.defineSteps(arg);
            g.start();
        });
    }
    export var reset = () => {
        g.reset();
    }
    export var next = () => {
        g.moveNext();
    }
    export var previous = () => {
        g.movePrevious();
    }
}

(<any>window).juel.guide = GuideModule;

$(function () {
    let style = document.createElement("style");
    style.id = "driver-styles";
    style.textContent = Styles;
    document.head.append(style);
})