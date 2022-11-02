import { property, state } from "lit/decorators";
import { Dispatch } from "../_Core/DispatchFunction";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { EventNames } from "../_Core/Events/EventNames";
import { GetDisplayKnownProperty } from "../_Core/KnownProperties";
import { JuelDataComponent } from "./JuelDataComponent";

export class ListBase extends JuelDataComponent {

    static selectedClass = "selected";
    static appearClass = "juel-appear";
    static ValueKey = "value";

    @property({ type: Boolean }) multiselect: boolean;
    @property({ type: Boolean }) input: boolean;

    @state()
    protected placeholderIndex: number;
    selectedIndexes: number[];
    selectedData: any[];

    constructor() {
        super();
        this.multiselect = false;
        this.placeholderIndex = null;
        this.selectedIndexes = [];
        this.selectedData = [];
    }

    getPlaceholder() {
        if (this.placeholderIndex != null) {
            if (this.selectedData && this.selectedData.length > 0) {
                let val: any;
                if (this.multiselect && this.selectedData.length > this.placeholderIndex) {
                    val = this.selectedData[this.placeholderIndex];
                } else {
                    val = this.selectItem[0];
                }
                if (this.textField && this.textField in val) {
                    return val[this.textField];
                } else {
                    return GetDisplayKnownProperty(val);
                }
            } else {
                let el = this.getElementAtIndex(this.placeholderIndex);
                if (el) {
                    let slotted = this.getSlottedItem(el);
                    if (slotted) {
                        return slotted.textContent;
                    }   
                }
            }
        }
    }

    createFormInput() {
        let sel = document.createElement('select');

        let options = (this.data).map(item => {
            let opt = document.createElement('option');
            opt.textContent = item;
            opt.value = item;
            return opt;
        });

        for (let opt of options) {
            sel.append(opt);
        }
        return sel;
    }

    search(term: string) {
        this.selectedIndexes = [];
        this.selectedData = [];
        super.search(term);
    }

    getSelectedData() {
        return this.selectedData;
    }

    getElementAtIndex(index: number): HTMLElement {
        let el = this.shadowRoot.querySelector(`[data-index="${index}"]`);
        return el as HTMLElement;
    }

    setSelectedIndexes(indexes: number[]) {
        for (let i of indexes) {
            this.selectItem(i);
        }
    }

    getSelectedIndexes() {
        return this.selectedIndexes;
    }

    getSlottedItem(el: HTMLElement) {
        let slot = el.querySelector("slot");
        if (slot) {
            let slotted = this.querySelector(`[slot="${slot.name}"]`);
            return slotted;
        }
        return null;
    }

    selectItem(index: number) {
        let el = this.shadowRoot.querySelector(`[data-index="${index}"]`);
        if (el) {
            let $el = $(el);
            let value = $el.data(ListBase.ValueKey);
            if ((!value) && this.data && this.data.length > index) {
                value = this.data[index];
            }
            if (!this.multiselect) {
                $el.siblings().each((i, e) => {
                    $(e).removeClass(ListBase.selectedClass);
                    let slotted = this.getSlottedItem(e as HTMLElement);
                    if (slotted) {
                        $(slotted).find(`.${ListBase.appearClass}`).hide("slow");
                    }
                });
                this.selectedIndexes = [];
                this.selectedData = [];
            }
            if ($el.hasClass(ListBase.selectedClass)) {
                $el.removeClass(ListBase.selectedClass);
                let slotted = this.getSlottedItem(el as HTMLElement);
                if (slotted) {
                    $(slotted).find(`.${ListBase.appearClass}`).hide("slow");
                }
                this.selectedIndexes = this.selectedIndexes.filter(i => i != index);
                if (value) {
                    this.selectedData = this.selectedData.filter(val => val != value);
                }
                this.onItemDeselected(index, el as HTMLElement);
                let args: ChangedEventArgs = {
                    index: index,
                    value: value ? value : slotted ? slotted.textContent : el.textContent
                };
                Dispatch(this, EventNames.Deselected, args);
            }
            else {
                $el.addClass(ListBase.selectedClass);
                let slotted = this.getSlottedItem(el as HTMLElement);
                if (slotted) {
                    $(slotted).find(`.${ListBase.appearClass}`).show("slow");
                }
                this.selectedIndexes.push(index);
                if (value) {
                    this.selectedData.push(value);
                }
                this.onItemSelected(index, el as HTMLElement);
                let args: ChangedEventArgs = {
                    index: index,
                    value: value ? value : slotted ? slotted.textContent : el.textContent
                };
                Dispatch(this, EventNames.Selected, args);
            }
            this.requestUpdate();
        }
    }

    onItemSelected(index: number, el: HTMLElement) {

    }

    onItemDeselected(index: number, el: HTMLElement) {

    }
}