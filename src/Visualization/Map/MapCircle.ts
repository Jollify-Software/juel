import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import { PropertyValueMap } from "lit";
import { ArrayConverter } from "../../_Converters/ArrayConverter";
import { JuelMap } from "./Map";
import L from "leaflet";
import { JuelMapObject } from "./JuelMapObject";

@customElement("juel-map-circle")
export class JuelMapCircle extends JuelMapObject {

    @property({ converter: ArrayConverter() }) points: number[];

    ready(map: L.Map): void {
        let options: L.MarkerOptions = {};
        var circle = L.circle(this.points as any, {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 500
        }).addTo(map);
        this.bindPopup(circle);
    }
}