import { LitElement, customElement, property, html } from "lit-element";
import { FilteredListService } from "./FilteredListService";

@customElement("filtered-list")
export class FilteredList extends LitElement {

    @property()
    filters: string = "filters";

    service: FilteredListService;

    constructor() {
        super()
        this.service = new FilteredListService(this);
    }

    firstUpdated() {
        this.service.init();
    }

    render() {
        return html`<slot name="items"></slot>`;
    }

}