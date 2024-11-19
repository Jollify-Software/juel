import Toast from "./Toast";
import { ToastOptions } from "./ToastOptions";

export module ToastModule {
    export var show = (options: ToastOptions) => {
        Toast.show(options);
    }
    export var into = (message: string) => {
        Toast.show({
            message: message,
            type: "info",
        });
    }
    export var success = (message: string) => {
      Toast.show({
        message: message,
        type: "success",
        duration: 5000, // 5 seconds
      });
    }
    export var warning = (message: string) => {
      Toast.show({
        message: message,
        type: "warning",
      });
    }
     export var error = (message: string) => {
      Toast.show({
        message: message,
        type: "error",
      });
    }
}