import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { ArrayConverter, MultiArrayConvertor } from "../_Converters/ArrayConverter";
import { PropertyValueMap } from "lit";
import { JuelMap } from "./Map";
import L from "leaflet";
import { JuelMapObject } from "./JuelMapObject";

@customElement("juel-map-polygon")
export class JuelMapPolygon extends JuelMapObject {

    @property({ converter: MultiArrayConvertor() }) points: number[][];

    ready(map: L.Map): void {
        let options: L.PolylineOptions = {};
        this.extendStyles(options);
        var polygon = L.polygon(this.points as any, options).addTo(map);
        this.bindPopup(polygon);
    }

}