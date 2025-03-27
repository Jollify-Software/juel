import { DeviceSize } from "../../_Core/DeviceSize";
import { Orientation } from "../../_Core/Orientation";

export class ScreenSizeDetector {
    public currentDeviceSize: DeviceSize;
    public currentOrientation: Orientation;
    private resizeListeners: (() => void)[] = [];
    private orientationListeners: (() => void)[] = [];

    constructor() {
        this.currentDeviceSize = this.getDeviceSize();
        this.currentOrientation = this.getOrientation();
        window.addEventListener('resize', this.updateDeviceSize.bind(this));
        window.addEventListener('orientationchange', this.updateOrientation.bind(this));
    }

    private getDeviceSize(): DeviceSize {
        const width = window.innerWidth;
        if (width < 576) return DeviceSize.XSmall;
        if (width >= 576 && width < 768) return DeviceSize.Small;
        if (width >= 768 && width < 992) return DeviceSize.Medium;
        if (width >= 992 && width < 1200) return DeviceSize.Large;
        return DeviceSize.XLarge;
    }

    private getOrientation(): Orientation {
        return window.innerWidth > window.innerHeight ? Orientation.Landscape : Orientation.Portrait;
    }

    private updateDeviceSize(): void {
        this.currentDeviceSize = this.getDeviceSize();
        this.currentOrientation = this.getOrientation();
        this.resizeListeners.forEach(listener => listener());
    }

    private updateOrientation(): void {
        this.currentOrientation = this.getOrientation();
        this.orientationListeners.forEach(listener => listener());
    }

    public addResizeListener(listener: () => void): void {
        this.resizeListeners.push(listener);
    }

    public removeResizeListener(listener: () => void): void {
        this.resizeListeners = this.resizeListeners.filter(l => l !== listener);
    }

    public addOrientationListener(listener: () => void): void {
        this.orientationListeners.push(listener);
    }

    public removeOrientationListener(listener: () => void): void {
        this.orientationListeners = this.orientationListeners.filter(l => l !== listener);
    }
}