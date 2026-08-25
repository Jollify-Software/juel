import { EventNames } from "../../_Core/Events/EventNames";
import { FilteredList } from "./FilteredList";

export class FilteredListService {

    ele: FilteredList
    activeFilters = {};

    constructor(ele: FilteredList) {
        this.ele = ele;
    }

    updateActiveFilters(filters: JQuery<HTMLElement>) {
        filters.each((index, ele) => {
            let $this = $(ele);
            let what = $this.data('filter');
            let val = $this.val();
            let type = $this.attr('type');
            if (val === '*') {
                val = '**';
            } else if (Array.isArray(val)) {
                val = val.map(x => x === '*' ? '**' : x);
            }
            if (ele.tagName.toLocaleLowerCase() == "input") {
                if ((!type) || type == "text") {
                        val = '*' + val;
                } else if (type == "checkbox") {
                    val = ($this[0] as any).checked;
                }
            }
            if (String(val) != '' && String(val) != '*') {
                this.activeFilters[what] = val;
            }

        });
    }

    applyFilters() {
        let filterKeys = Object.keys(this.activeFilters);

        // An item must match every active filter dimension (not just any one
        // of them), so gather the union of candidate items across dimensions
        // first, then test each candidate against all active filters at once.
        let items = new Set<HTMLElement>();
        for (let what of filterKeys) {
            $(this.ele).find(`[data-filter-${what}]`).each((index, element) => {
                items.add(element);
            });
        }

        items.forEach(element => {
            let matchesAll = filterKeys.every(what => {
                let val = this.activeFilters[what];
                let filterVal = element.getAttribute(`data-filter-${what}`);
                if (filterVal === null) {
                    return true;
                }
                if (val == '**') {
                    return true;
                }
                if (Array.isArray(val)) {
                    return val.indexOf(filterVal) >= 0;
                }
                if (String(val).startsWith('*')) {
                    return filterVal.includes(String(val).replace('*', ''));
                }
                return filterVal == String(val);
            });

            if (matchesAll) {
                $(element).removeClass("hidden").show("slow");
            } else {
                $(element).addClass("hidden").hide("slow");
            }
        });
    }

    init() {
        let filtersPanel = $(document.getElementById(this.ele.filters));
        let filters = filtersPanel.find('[data-filter]');
        this.updateActiveFilters(filters);
        this.applyFilters();
        filters.each((index, el) => {
            let evtName = el.tagName.toUpperCase().startsWith("JUEL") ? EventNames.Changed : "change";
            $(el).on(evtName, (e) => {
                this.updateActiveFilters(filters);
                this.applyFilters();
            });
        });
    }

}