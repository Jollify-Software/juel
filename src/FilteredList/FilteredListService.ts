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
        let elementsToShow: HTMLElement[] = [];
        let elementsToHide: HTMLElement[] = [];

        console.log(this.activeFilters)

        for (let what in this.activeFilters) {
            let val = this.activeFilters[what];
            let items = $(this.ele).find(`[data-filter-${what}`);
            items.each(function (index, element) {
                let filterVal = element.getAttribute(`data-filter-${what}`);

                if ((Array.isArray(val) && val.indexOf(filterVal) >= 0) ||
                    (filterVal == String(val))) {
                    elementsToShow.push(element);
                } else if (String(val).startsWith('*') && filterVal.includes(String(val).replace('*', ''))) {
                    elementsToShow.push(element);
                } else {
                    elementsToHide.push(element);
                }
            });
        }

        elementsToHide = elementsToHide.filter(x => elementsToShow.indexOf(x) < 0)
        $(elementsToHide).hide("slow");
        $(elementsToShow).show("slow");
    }

    init() {
        let filtersPanel = $(document.getElementById(this.ele.filters));
        let filters = filtersPanel.find('[data-filter]');
        this.updateActiveFilters(filters);
        this.applyFilters();
        filters.change((e) => {
            this.updateActiveFilters(filters);
            this.applyFilters();
        });
    }

}