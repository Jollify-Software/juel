import { JuelMap } from "../Map";
import { IMapProvider } from "./IMapProvider";

declare var L: any;

export class LeafletProvider implements IMapProvider {
    
    static CssUrl = "https://unpkg.com/leaflet/dist/leaflet.css";
    static ScriptUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

    map: L.Map;

    getMap() {
        return this.map;
    }

    async init(element: JuelMap) {
        if (!document.head.querySelector('#leaflet-styles')) {
        let style = $(`<link id="leaflet-styles" rel="stylesheet" href="${LeafletProvider.CssUrl}"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossorigin=""/>`);
        document.head.append(style[0]);
        }
        if (!('L' in window)) {
        await import(LeafletProvider.ScriptUrl);
        element.resolveReady(1);
        } else {
            element.resolveReady(1);
        }

        this.map = L.map(element).setView([51.505, -0.09], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

    }

}