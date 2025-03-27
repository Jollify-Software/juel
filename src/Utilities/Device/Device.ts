import { inherit } from "hammerjs";
import { LitElement } from "lit";
import { customElement } from "lit/decorators";
import { DeviceSize } from "../../_Core/DeviceSize";
import { Orientation } from "../../_Core/Orientation";
import { DeviceModule } from "../../_Modules/Device/DeviceModule";
import { bind } from "../../_Utils/Bind";
import { JuelComponent } from "../../_Base/JuelComponent";
import { DeviceEvents } from "./DeviceEvents";

@customElement("juel-device")
export class JuelDevice extends JuelComponent {

    deviceSize: DeviceSize;
    orientation: Orientation;

    connectedCallback(): void {
        super.connectedCallback();
        DeviceModule.addResizeListener(this.resize);
        DeviceModule.addOrientationListener(this.orientationChange);
        this.deviceSize = DeviceModule.getDeviceSize();
        this.orientation = DeviceModule.getOrientation();
    }

    @bind
    resize() {
        if (this.deviceSize !== DeviceModule.getDeviceSize()) {
            this.deviceSize = DeviceModule.getDeviceSize();
            this.fire(DeviceEvents.DeviceSizeChanged, this.deviceSize);
        }
    }

    @bind
    orientationChange() {
        if (this.orientation !== DeviceModule.getOrientation()) {
            this.orientation = DeviceModule.getOrientation();
            this.fire(DeviceEvents.OrientationChanged, this.orientation);
        }
    }
}