import { LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { MapService } from "./MapService";

@customElement("juel-map")
export class JuelMap extends LitElement {

    service: MapService;

    @property() provider;
    @property() key;
    
    constructor() {
        super();
        this.service = new MapService();
    }

    protected firstUpdated(_changedProperties: Map<string | number | symbol, unknown>): void {
        if (this.key) {
            var script = document.head.querySelector('#bing-maps') as HTMLScriptElement;
            if (!script) {
                document.createElement("script")
                script.async = true;
                script.defer = true;
                if (this.provider && this.provider == "bing") {
                    script.id = "bing-maps";
                    script.src = `https://www.bing.com/api/maps/mapcontrol?callback=InitMap&key=${this.key}`;
                }
                document.head.append(script);
                this.service.init(this);
            }
        }
    }

    protected createRenderRoot(): Element | ShadowRoot {
        return this;
    }
}