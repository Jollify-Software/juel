export class MetricoolConsentProvider {
    loadScript(key) {
        if (window['beTracker']) return; // Prevent multiple loads

        let script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://tracker.metricool.com/resources/be.js";
    
        script.onload = function () {
            console.log("Metricol on load")
            // Manually initialise tracking once the script is loaded
            if (window['beTracker'] && typeof window['beTracker'].t === "function") {
                console.log("Metricool hash");
                window['beTracker'].t({ hash: key });
            }
        };
    
        document.head.appendChild(script);
    }
}