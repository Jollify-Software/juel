import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { ArrayConverter } from "../_Converters/ArrayConverter";
import { PropertyValueMap } from "lit";
import { JuelMap } from "./Map";
import L from "leaflet";
import { JuelMapObject } from "./JuelMapObject";

@customElement("juel-map-marker")
export class JuelMapMarker extends JuelMapObject {

    @property({ converter: ArrayConverter() }) points: number[];

    marker: L.Marker;

    ready(map: L.Map): void {
        let options: L.MarkerOptions = {};
        this.marker = L.marker(this.points as any).addTo(map);
        this.bindPopup(this.marker);
    }
}