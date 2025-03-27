import { DeviceSize } from "../../_Core/DeviceSize";
import { ScreenSizeDetector } from "./ScreenSizeDetector";

export module DeviceModule {
    var detector: ScreenSizeDetector = new ScreenSizeDetector();
    export var getDeviceSize = (): DeviceSize => {
        return detector.currentDeviceSize;
    }
    export var getOrientation = (): number => {
        return detector.currentOrientation;
    }
    export var addResizeListener = (listener: () => void): void => {
        detector.addResizeListener(listener);
    }
    export var removeResizeListener = (listener: () => void): void => {
        detector.removeResizeListener(listener);
    }
    export var addOrientationListener = (listener: () => void): void => {
        detector.addOrientationListener(listener);
    }
    export var removeOrientationListener = (listener: () => void): void => {
        detector.removeOrientationListener(listener);
    }
}