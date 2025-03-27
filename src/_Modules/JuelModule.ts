import { AudioModule } from "./AudioModule";
import { DeviceModule } from "./Device/DeviceModule";
import { VisualGuide } from "./Guide/Guide";
import { GuideModule } from "./Guide/GuideModule";
import { Options } from "./Guide/Options";
import { Step } from "./Guide/Step";
import { IconsModule } from "./Icons/IconsModule";
import { MessageBoxModule } from "./MessageBox/MessageBoxModule";
import { ToastModule } from "./Toast/ToastModule";

export module JuelModule {
    export const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop as string),
      });

    export var audio = AudioModule;
    export var icon = IconsModule;
    export var messageBox = MessageBoxModule;
    export var toast = ToastModule;

    export var guide = GuideModule;

    export var device = DeviceModule;
}