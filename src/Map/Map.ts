import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { MapService } from "./MapService";
import { JuelComponent } from "../_Base/JuelComponent";
import { MapModeType } from "./MapModeType";
import { DOMStringMapConverter } from "../_Converters/DOMStringMapConvertor";
import Styles from "bundle-text:./Map.less";
import { ArrayConverter } from "../_Converters/ArrayConverter";
import { JuelAsyncComponent } from "../_Base/JuelAsyncComponent";

@customElement("juel-map")
export class JuelMap extends JuelAsyncComponent {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    service: MapService;

    @property() provider: string = "leaflet";
    @property() zoom: number = 13;
    @property() mode: MapModeType; 
    @property({ converter: DOMStringMapConverter }) parameters: object;
    @property({ converter: ArrayConverter(';') }) places: string[];
    
    connectedCallback(): void {
        super.connectedCallback();
        this.service = new MapService(this);
    }

    getMap() {
        return this.service.getMap();
    }

    protected createRenderRoot(): HTMLElement | DocumentFragment {
        return this;
    }
}