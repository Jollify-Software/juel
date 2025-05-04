import { property } from "lit/decorators";
import { FilteredItemBase } from "./FilteredItemBase";
import { ListBase } from "./ListBase";
import { html } from "lit";
import { map } from "lit/directives/map";
import { toTitle } from "../_Utils/ToTitle";
import { choose } from "lit/directives/choose";
import { when } from "lit/directives/when";
import { JuelComponent } from "./JuelComponent";
import { parseDataset } from "../_Utils/data/parseDataset";

export class FilteredBase extends JuelComponent {

    @property()
    /**
     * Specifies if filters should be rendered or not.  
     * Can also specify a CSS selector for external filters.
     * 
     * Either: "true" | "false" | Selector
     */
    filters: string
    @property()
    /**
     * Specifies if an 'all' option should be displayed on generated filters.  
     * Also acts as the label for the 'all' option.
     * 
     * Either: "true" | "false" | Label
     */
    all: string;

    items: HTMLElement[];

    filterObjects: object = null;

    /**
     *
     */
    constructor() {
        super();
        this.all = "true";
    }

    getFilters(items: HTMLElement[]) {
        if (items) {
        let filters = {};
        for (let item of items) {
            let filter: object;
            if ('filter' in item) {
                filter = item['filter'] as object;
            } else {
                filter = parseDataset(item, 'filter');
            }
            if (!filter) {
                continue;
            }
            for (let key in filter) {
                let ray: any[];
                if (key in filters) {
                    ray = filters[key];
                } else {
                    ray = [];
                    filters[key] = ray;
                }
                if (!ray.includes(filter[key])) {
                    ray.push(filter[key]);
                }
            }
        }
        console.log(filters);
        this.filterObjects = filters;
    }
    }

    handleSlotChange(e: Event) {
        let slot = e.target as HTMLSlotElement;
        this.items = slot.assignedElements({ flatten: true }) as HTMLElement[];
        this.getFilters(this.items);
        this.requestUpdate();
    }

    filterItems(name: string, value: any) {
        console.log(`Filter: ${name} - ${value}`)
        if (this.items == null) {
            return;
        }
        for (let item of this.items) {
            if (item.hasAttribute(`data-filter-${name}`)) {
                let filter = item.getAttribute(`data-filter-${name}`);
                if (value == true && filter == null) {
                    $(item).hide('slow');
                    continue;
                } else if (filter == null) {
                    continue;
                }

                if (value == '*') {
                    $(item).show('slow');
                } else if (value == true && filter == "true") {
                    $(item).show('slow');
                } else if (filter == value) {
                    $(item).show('slow');
                } else {
                    $(item).hide('slow');
                }
            }
        }
    }

    renderStringFiltersAsButtons(key: string, values: string[]) {
        let part = `filter-${key}-button`;
        return html`${when(this.all && this.all != "false",
            () => html`<juel-button part="${part}" label="${this.all == "true" ? "All" : this.all}" @button-clicked=${() => this.filterItems(key, '*')}></juel-button>`)}
            ${map(values,
            value => html`<juel-button part="${part}" label="${toTitle(value)}" @button-clicked=${() => this.filterItems(key, value)}></juel-button>`)}`;
    }

    renderStringFiltersAsSelect(key: string, values: string[]) {
        let part = `filter-${key}-select`;
        return html`<juel-select part="${part}">${map(values,
            value => html`<juel-select-option @click=${() => this.filterItems(key, value)}>${toTitle(value)}</juel-select-option>`)}
            </juel-select>`;
    }

    renderFilters() {
        console.log(this.filters, this.filterObjects);
        if (this.filters && this.filters != "false" && this.filterObjects) {
            let keys = Object.keys(this.filterObjects);
            let types = keys.map(x => typeof this.filterObjects[x][0])
            return html`<ul id="filters" part="filters">${map(keys, (key, i) => {
                let values = this.filterObjects[key];
                let type = types[i];
                return html`<li><span part="filter-text filter-${key}-text">${toTitle(key)}</span><span class="filter-options">${choose(type, [
                    [ 'string', () => html`${when(types.filter(x => x == type).length >= 2, () => this.renderStringFiltersAsSelect(key, values), () => this.renderStringFiltersAsButtons(key, values))}` ],
                    [ 'number', () => html`` ],
                    [ 'boolean', () => html`<juel-toggle checked="true" part="filter-${key}-toggle" @toggled=${e => this.filterItems(key, e.detail.value)}></juel-toggle>` ]
                ])}</span></li>`;
            })}</ul>`;
        }
    }

}