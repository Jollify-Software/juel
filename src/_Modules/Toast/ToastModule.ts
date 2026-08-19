import { Toast } from "./Toast";
import { ToastOptions } from "./ToastOptions";

export module ToastModule {
    // A single shared instance, not one per call — Toast.initContainer()
    // only skips re-creating #toast-container when *this instance* already
    // has one, so `new Toast()` on every call was producing a separate,
    // identically-positioned container per toast instead of stacking them
    // in one. Built lazily on first use rather than at module load: juel.js
    // is typically loaded from <head>, before document.body exists, and
    // Toast's constructor appends its container straight to document.body.
    var instance: Toast | null = null;
    function getInstance(): Toast {
        if (!instance) {
            instance = new Toast();
        }
        return instance;
    }

    export var show = (options: ToastOptions) => {
        getInstance().show(options);
    }
    export var into = (message: string) => {
        getInstance().show({
            message: message,
            type: "info",
        });
    }
    export var success = (message: string) => {
      getInstance().show({
        message: message,
        type: "success",
        duration: 5000, // 5 seconds
      });
    }
    export var warning = (message: string) => {
      getInstance().show({
        message: message,
        type: "warning",
      });
    }
     export var error = (message: string) => {
      getInstance().show({
        message: message,
        type: "error",
      });
    }
}
