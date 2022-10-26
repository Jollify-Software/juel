import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";

export class ListBase extends JuelComponent {

    static selectedClass = "selected";
    static ValueKey = "value";

    @property() data: any[];
    @property({ type: Boolean }) multiselect: boolean;

    selectedIndexes: number[];
    selectedData: any[];

    constructor() {
        super();
        this.multiselect = false;
        this.selectedIndexes = [];
        this.selectedData = [];
    }

    setData(data: any[]) {
        this.data = data;
    }

    getData() {
        return this.data;
    }

    getSelectedData() {
        return this.selectedData;
    }

    setSelectedIndexes(indexes: number[]) {
        for (let i of indexes) {
            this.selectItem(i);
        }
    }

    getSelectedIndexes() {
        return this.selectedIndexes;
    }

    selectItem(index: number) {
        let el = this.shadowRoot.querySelector(`[data-index="${index}"]`);
        if (el) {
            let $el = $(el);
            let value = $el.data(ListBase.ValueKey);
            if (!this.multiselect) {
                $el.siblings().each((i, e) => {
                    $(e).removeClass(ListBase.selectedClass)
                        .find(".juel-appear").hide("slow");
                });
                this.selectedIndexes = [];
                this.selectedData = [];
            }
            if ($el.hasClass(ListBase.selectedClass)) {
                $el.removeClass(ListBase.selectedClass);
                $el.find(".juel-appear").hide("slow");
                this.selectedIndexes = this.selectedIndexes.filter(i => i != index);
                if (value)
                    this.selectedData = this.selectedData.filter(val => val != value);
            }
            else {
                $el.addClass(ListBase.selectedClass);
                $el.find(".juel-appear").show("slow");
                this.selectedIndexes.push(index);
                if (value)
                    this.selectedData.push(value);
            }
        }
    }
}