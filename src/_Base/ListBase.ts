import { property, state } from "lit/decorators";
import { Dispatch } from "../_Core/DispatchFunction";
import { ChangedEventArgs } from "../_Core/Events/ChangedEventArgs";
import { EventNames } from "../_Core/Events/EventNames";
import { GetDisplayKnownProperty } from "../_Core/KnownProperties";
import { JuelDataComponent } from "./JuelDataComponent";
import { ItemBase } from "./ItemBase";
import { RippleEffect } from "../_Utils/RippleEffect";
import { PropertyValueMap } from "lit";

export class ListBase extends JuelDataComponent {

    static selectedClass = "selected";
    static appearClass = "juel-appear";
    static ValueKey = "value";

    @property({ type: Boolean }) multiselect: boolean;
    @property({ type: Boolean }) input: boolean;

    @state()
    protected placeholderIndex: number;
    
    selectedIndexes: number[];
    itemsClickEvent: boolean;
    selectedData: any[];

    IdPrefix = "item";

    // TODO: Use @queryAssignedElements({ selector: 'juel-item' }) items!: NodeListOf<ItemBase>;
    // https://lit.dev/docs/components/shadow-dom/#query-assigned-nodes
    items: ItemBase[] = [];

    constructor() {
        super();
        this.multiselect = false;
        this.placeholderIndex = null;
        this.selectedIndexes = [];
        this.selectedData = [];
        this.itemsClickEvent = true;
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties);
    }

    addItem(item: ItemBase) {
        if (this.items.includes(item) == false) {
            this.items.push(item);
            let index = this.items.indexOf(item);
            if (!item.id) {
                item.id = `${this.IdPrefix}-${index}`;
            }
            item.setAttribute("data-index", index.toString());
            if (this.itemsClickEvent) {
                let elForRipple: HTMLElement;
                if (item.title) {
                    let title = item.shadowRoot.querySelector(".title") as HTMLElement;
                    elForRipple = title;
                    if (title) title.onclick = (e: MouseEvent) => {
                        this.handleClick(e);
                        this.selectItem(index);
                    }
                } else {
                    item.onclick = (e: MouseEvent) => {
                        this.handleClick(e);
                        this.selectItem(index);
                    }
                    elForRipple = item;
                }
            }
        }
    }

    //#region " Listeners "

    handleClick(e: MouseEvent) {
        RippleEffect.createRipple(e);
    }

    //#endregion

    getItems() {
        return this.items;
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
                if (typeof val == "object" && this.textField && this.textField in val) {
                    return val[this.textField];
                } else if (typeof val == "object") {
                    return GetDisplayKnownProperty(val);
                } else {
                    return val;
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
        let items = this.getItems();
        let el = items.find(x => x.matches(`[data-index="${index}"]`));
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
                this.onItemDeselected(index, el as HTMLElement);
            }
            else {
                this.onItemSelected(index, el as HTMLElement);
            }
            //this.requestUpdate();
        }
    }

    onItemSelected(index: number, el: HTMLElement) {
        let $el = $(el);
            let value = $el.data(ListBase.ValueKey);
        $el.addClass(ListBase.selectedClass);
                let slotted = this.getSlottedItem(el as HTMLElement);
                if (slotted) {
                    $(slotted).find(`.${ListBase.appearClass}`).show("slow");
                }
                this.selectedIndexes.push(index);
                if (value) {
                    this.selectedData.push(value);
                }
        let args: ChangedEventArgs = {
            index: index,
            value: value ? value : slotted ? slotted.textContent : el.textContent
        };
        Dispatch(this, EventNames.Selected, args);
    }

    onItemDeselected(index: number, el: HTMLElement) {
        let $el = $(el);
            let value = $el.data(ListBase.ValueKey);
        $el.removeClass(ListBase.selectedClass);
                let slotted = this.getSlottedItem(el as HTMLElement);
                if (slotted) {
                    $(slotted).find(`.${ListBase.appearClass}`).hide("slow");
                }
                this.selectedIndexes = this.selectedIndexes.filter(i => i != index);
                if (value) {
                    this.selectedData = this.selectedData.filter(val => val != value);
                }
        let args: ChangedEventArgs = {
            index: index,
            value: value ? value : slotted ? slotted.textContent : el.textContent
        };
        Dispatch(this, EventNames.Deselected, args);
    }

    slotChange(e: Event) {
    }
}