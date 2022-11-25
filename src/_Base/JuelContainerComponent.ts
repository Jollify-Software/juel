import bind from "bind-decorator";
import { PropertyValueMap } from "lit";
import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";

export class JuelContainerComponent extends JuelComponent {

    @property({ type: Number }) position;

    itemsCount: number;

    itemsContainerClass: string;
    itemsContainer: HTMLElement;
    itemsResolver: (value: unknown) => void;

    constructor() {
        super();
        this.itemsContainerClass = "items";
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.itemsContainer = this.shadowRoot.querySelector(`.${this.itemsContainerClass}`);
        new Promise(resolve => {
            this.itemsResolver = resolve
        })
        .then(() => this.selectItem(0));
        //setTimeout(() => this.selectItem(0));
    }

    selectItem(index: number) {
        console.log("Select item" + index)
        let el = this.shadowRoot.querySelector(`[data-index="${index}"]`);
        console.log(el)
        if (el) {
            this.position = index;
            let $el = $(el);
            $el.siblings().removeClass("active");
            el.classList.add("active");
            let w = $el.outerWidth();
            if (w > 0) {
                this.style.setProperty('--item-width', w.toString());
            }
            let h = $el.outerHeight();
            if (h > 0) {
                this.style.setProperty('--item-height', h.toString());
            }
        }
    }

    itemsForSlot(e: Event, titleSlotName: string, titleIsNext: boolean = false, ...exclude: string[]) {
        let slot = e.target as HTMLSlotElement;
        // If slot is a slot
        if (this.itemsContainer && slot.nodeName == "SLOT") {
            let titleSelector: string;
            if (titleSlotName) {
                titleSelector = `[slot="${titleSlotName}"]`;
                if (!exclude) {
                    exclude = [titleSelector];
                }
            }
            let position: number = -1;
            let items = slot.assignedElements() as HTMLElement[];
            if (exclude && exclude.length > 0) {
                for (let selector of exclude) {
                    items = items.filter(el => el.matches(selector) == false);
                }
            }
            if (items && items.length > 0) {
                if (this.hasUpdated) {
                    //$(this.itemsContainer).children().slice(1).remove();
                }
                this.itemsCount = items.length;
                items.forEach((el, index) => {
                    position++;
                    let id = `item-${index}`;
                    let klass = "item";
                    let hasTitle = false;
                    let titleElId = `${id}-${titleSlotName}`;
                    let titleEl = titleIsNext ? el.nextElementSibling : el.previousElementSibling as HTMLElement;
                    if (titleEl && titleEl.matches(titleSelector)) {
                        hasTitle = true;
                        titleEl.setAttribute('slot', titleElId);
                    }
                    el.setAttribute('slot', id);
                    el.classList.add("item");
                    el.setAttribute('draggable', 'false');
                    el.setAttribute('ondragstart', "event.preventDefault();")

                    let item = document.createElement("div");
                    item.className = klass;
                    item.setAttribute("data-index", position.toString());
                    item.draggable = false;
                    let i = position;
                    item.onclick = () => {
                        this.selectItem(i);
                    }
                    if (hasTitle) {
                        let itemTitle = document.createElement("div");
                        itemTitle.className = titleSlotName;
                        let titleSlot = document.createElement("slot");
                        titleSlot.name = titleElId;
                        itemTitle.append(titleSlot);
                        item.append(itemTitle);
                    } else if (el.dataset[titleSlotName]) {
                        let itemTitle = document.createElement("div");
                        itemTitle.className = titleSlotName;
                        itemTitle.textContent = el.dataset[titleSlotName];
                        item.append(itemTitle);
                    }
                    let itemSlot = document.createElement("slot");
                    itemSlot.name = id;
                    let itemContent = document.createElement("div");
                    itemContent.classList.add("item-content");
                    itemContent.append(itemSlot);
                    item.append(itemContent);

                    this.itemsContainer.append(item);
                });
                this.itemsResolver(items);
            }
        }
    }

}