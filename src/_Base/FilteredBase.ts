import { property } from "lit/decorators";
import { FilteredItemBase } from "./FilteredItemBase";
import { ListBase } from "./ListBase";
import { html } from "lit";
import { map } from "lit/directives/map";
import { toTitle } from "../_Utils/ToTitle";
import { choose } from "lit/directives/choose";
import { when } from "lit/directives/when";

export class FilteredBase extends ListBase {

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

    /**
     *
     */
    constructor() {
        super();
        this.all = "true";
    }

    getFilters() {
        let items = this.getItems() as FilteredItemBase[];
        if (items) {
        let filters = {};
        for (let item of items) {
            for (let key in item.filter) {
                let ray: any[];
                if (key in filters) {
                    ray = filters[key];
                } else {
                    ray = [];
                    filters[key] = ray;
                }
                if (!ray.includes(item.filter[key])) {
                    ray.push(item.filter[key]);
                }
            }
        }
        console.log(filters);
        return filters;
    }
    return null;
    }

    filterItems(name: string, value: any) {
        console.log(`Filter: ${name} - ${value}`)
        let items = this.getItems() as FilteredItemBase[];
        for (let item of items) {
            item.performFilter(name, value);
        }
    }

    renderStringFiltersAsButtons(key: string, values: string[]) {
        return html`${when(this.all && this.all != "false",
            () => html`<juel-button label="${this.all == "true" ? "All" : this.all}" @button-clicked=${() => this.filterItems(key, '*')}></juel-button>`)}
            ${map(values,
            value => html`<juel-button label="${toTitle(value)}" @button-clicked=${() => this.filterItems(key, value)}></juel-button>`)}`;
    }

    renderStringFiltersAsSelect(key: string, values: string[]) {
        return html`<juel-select>${map(values,
            value => html`<juel-item @click=${() => this.filterItems(key, value)}>${toTitle(value)}</juel-item>`)}
            </juel-select>`;
    }

    renderFilters() {
        let filters = this.getFilters();
        if (filters) {
            let keys = Object.keys(filters);
            let types = keys.map(x => typeof filters[x][0])
            return html`<ul id-"filters">${map(keys, (key, i) => {
                let values = filters[key];
                let type = types[i];
                return html`<li>${toTitle(key)}<span class="filter-options">${choose(type, [
                    [ 'string', () => html`${when(types.filter(x => x == type).length >= 2, () => this.renderStringFiltersAsSelect(key, values), () => this.renderStringFiltersAsButtons(key, values))}` ],
                    [ 'number', () => html`` ],
                    [ 'boolean', () => html`<juel-toggle @toggled=${e => this.filterItems(key, e.detail.value)}></juel-toggle>` ]
                ])}</span></li>`;
            })}</ul>`;
        }
    }

}