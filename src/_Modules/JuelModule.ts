import { AudioModule } from "./AudioModule";
import { DeviceModule } from "./Device/DeviceModule";
import { GuideModule } from "./Guide/GuideModule";
import { IconsModule } from "./Icons/IconsModule";
import { MessageBoxModule } from "./MessageBox/MessageBoxModule";
import { ThemeModule } from "./Theme/ThemeModule";
import { TipsModule } from "./Tips/TipsModule";
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

    export var theme = ThemeModule;

    /** The page's tooltips: on once juel.js loads; `juel.tips.disable()` turns them off. */
    export var tips = TipsModule;
}