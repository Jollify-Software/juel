import { AudioModule } from "./AudioModule";
import { IconsModule } from "./IconsModule";

export module JuelModule {
    export const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop as string),
      });

    export var audio = AudioModule;
    export var icon = IconsModule;
}