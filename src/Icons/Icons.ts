import { html, LitElement, PropertyValueMap } from "lit";
import { customElement, property } from "lit/decorators";
import { map } from "lit/directives/map";
import { unsafeHTML } from "lit/directives/unsafe-html";
import { ArrayConverter } from "../_Converters/ArrayConverter";

declare var juel: any;

@customElement("juel-icons")
export class JuelIcons extends LitElement {

    @property({ converter: ArrayConverter() }) icons: string[];

    createRenderRoot() {
        return this;
    }

    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.classList.add("hidden");
    }

    render() {
        return html`${map(this.icons, name => unsafeHTML(juel.icon.get(name)))}`
    }
}