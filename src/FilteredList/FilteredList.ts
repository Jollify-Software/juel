import { LitElement, html } from "lit";
import { property, customElement } from "lit/decorators";
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

    createRenderRoot() {
        return this;
    }

}