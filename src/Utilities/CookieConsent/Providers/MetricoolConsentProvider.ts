export class MetricoolConsentProvider {
    loadScript(key) {
        if (window['beTracker']) return; // Prevent multiple loads

        let script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://tracker.metricool.com/resources/be.js";
    
        script.onload = function () {
            // Manually initialise tracking once the script is loaded
            if (window['beTracker'] && typeof window['beTracker'].t === "function") {
                window['beTracker'].t({ hash: "a6e17ac212770553cde0fa2146e9f06e" });
            }
        };
    
        document.head.appendChild(script);
    }
}