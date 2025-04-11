import { IConsentProvider } from "./IConsentProvider";

export class GoogleAnalyticsConsentProvider implements IConsentProvider {
    loadScript(key: string) : void {
        if (window['gtag']) return; // Prevent multiple loads

        let script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${key}`;
        
        script.onload = function () {
            // Now manually initialise Google Analytics
            window['dataLayer'] = window['dataLayer'] || [];
            function gtag(...arg){window['dataLayer'].push(arguments);}
            window['gtag'] = gtag;
    
            gtag("js", new Date());
            gtag("config", key);
        };
    
        document.head.appendChild(script);
    }
}