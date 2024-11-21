import { Toast } from "./Toast";
import { ToastOptions } from "./ToastOptions";

export module ToastModule {
    export var show = (options: ToastOptions) => {
        new Toast().show(options);
    }
    export var into = (message: string) => {
        new Toast().show({
            message: message,
            type: "info",
        });
    }
    export var success = (message: string) => {
      new Toast().show({
        message: message,
        type: "success",
        duration: 5000, // 5 seconds
      });
    }
    export var warning = (message: string) => {
      new Toast().show({
        message: message,
        type: "warning",
      });
    }
     export var error = (message: string) => {
      new Toast().show({
        message: message,
        type: "error",
      });
    }
}