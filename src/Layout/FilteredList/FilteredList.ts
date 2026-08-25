import { LitElement, html } from "lit";
import { property, customElement } from "lit/decorators";
import { FilteredListService } from "./FilteredListService";
import { DomReady } from "../../_Utils/DomReady";

@customElement("filtered-list")
export class FilteredList extends LitElement {

    @property()
    filters: string = "filters";
    // TODO: For

    service: FilteredListService;

    constructor() {
        super()
        this.service = new FilteredListService(this);
    }

    firstUpdated() {
        DomReady().then(() => this.service.init());
    }

    createRenderRoot() {
        return this;
    }

}