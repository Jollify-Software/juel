import { customElement, property } from "lit/decorators";
import { JuelMapObject } from "./JuelMapObject";
import L from "leaflet";

@customElement("juel-map-json")
export class JuelMapJson extends JuelMapObject {

    @property() src: string;

    map: L.Map;

    ready(map: L.Map): void {
        if (this.src) {
            this.map = map;
            fetch(this.src).then((response: Response) => {
                response.json().then(data => {
                    this.createJson(data);
                });
            });
        }
    }

    createJson(data: any) {
        let options: L.GeoJSONOptions = { style: {} };
        this.extendStyles(options.style);
        let json = L.geoJSON(data as any, options).addTo(this.map)
        let center = json.getBounds().getCenter();
        this.map.setView(center);
    }

}