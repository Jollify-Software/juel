import bind from "bind-decorator";
import { PropertyValueMap } from "lit";
import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";

export class JuelContainerComponent extends JuelComponent {

    @property({ type: Number }) position;

    selectedIndex: number;

    itemsCount: number;
    itemsDraggable: boolean;

    itemsContainerClass: string;
    itemsContainer: HTMLElement;
    titlesContainer: HTMLElement;
    titlesContainerClass: string;

    titleAttrName: string;
    titleSlotSelector: string;
    titleDataSelector: string;
    titleIsNext: boolean;

    hasAddedItems: boolean;
    shouldToggleActive: boolean;

    constructor() {
        super();
        this.itemsContainerClass = "items";
        this.titlesContainerClass = "titles";
        this.titleAttrName = "title";
        this.titleIsNext = false;
        this.hasAddedItems = false;
        this.itemsDraggable = true;
        this.shouldToggleActive = true;
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.titleSlotSelector = `[slot="${this.titleAttrName}"]`;
        this.titleDataSelector = `[data-${this.titleAttrName}]`;
        this.itemsContainer = this.shadowRoot.querySelector(`.${this.itemsContainerClass}`);
        this.titlesContainer = this.shadowRoot.querySelector(`.${this.titlesContainerClass}`);

        this.readyPromise = new Promise(resolve => {
            setTimeout(() => {
             this.requestUpdate();
              resolve('');
            });
          });
    }

    itemsCreated() {
        this.selectItem(0);
    }

    selectItem(index: number) {
        let el = this.itemsContainer.querySelector(`[data-index="${index}"]`);
        if (el) {
            this.selectedIndex = index;
            let $el = $(el);
            if (this.shouldToggleActive && el.classList.contains("active")) {
                el.classList.remove("active");
            } else {
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
        // If we have a title container, then select the title
        if (this.titlesContainer) {
            let el = this.titlesContainer.querySelector(`[data-index="${index}"]`);
            if (el) {
                let $el = $(el);
                $el.siblings().removeClass("active").removeClass("open");
                el.classList.add("active");
                if (el.classList.contains("group")) {
                    el.classList.add("open");
                }
            }
        }
    }

    isItem(el: HTMLElement, level: number) {
        if ((el.hasAttribute(`data-${this.titleAttrName}`) ||
            (el.hasAttribute("slot") == false && level == 0)) &&
            ([ 'TEMPLATE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].every(h => h != el.nodeName))) {
            return true;
        } else {
            let titleEl = this.titleIsNext ?
                el.nextElementSibling :
                el.previousElementSibling as HTMLElement;
            if (titleEl && titleEl.matches(this.titleSlotSelector)) {
                return true;
            }
        }
        return false;
    }

    itemifyChildren(children: HTMLElement[], level: number = 0, idStr: string, posStr: string, titlesContainer: HTMLElement = null) {
        let position: number = -1;
        // Only itemift the children that are items
        children = children.filter(el => this.isItem(el, level));
        // If there are any children
        if (children && children.length > 0) {
            if (this.hasUpdated) {
                //$(this.itemsContainer).children().slice(1).remove();
            }
            // TODO: Items count for level
            this.itemsCount = children.length;
            children.forEach((el, index) => {
                position++;
                let id = idStr ? `${idStr}-${position}` : `item-${position}`;
                let nposStr = posStr ? `${posStr}-${position}` : `${position}`;
                let klass = "item";
                let hasTitle = false;
                let titleElId = `${id}-${this.titleAttrName}`;
                let titleEl = this.titleIsNext ?
                    el.nextElementSibling :
                    el.previousElementSibling as HTMLElement;
                if (titleEl && titleEl.matches(this.titleSlotSelector)) {
                    hasTitle = true;
                    titleEl.setAttribute('slot', titleElId);
                }
                el.setAttribute('slot', id);
                el.classList.add("item");
                if (this.itemsDraggable == false) {
                    el.setAttribute('draggable', 'false');
                    el.setAttribute('ondragstart', "event.preventDefault();")
                }
                // If element is nested then flatten the DOM tree by removing and adding to 'this' element
                if (level > 0) {
                    el.remove();
                    this.append(el);
                    if (titlesContainer) {
                        titlesContainer.classList.add("group");
                    }
                }

                let item = document.createElement("div");
                item.className = klass;
                item.setAttribute("data-index", nposStr);
                item.draggable = false;
                let i = position;
                // If we have a title container then we want the event to go on the title el
                if (!titlesContainer) {
                    item.onclick = () => {
                        this.selectItem(i);
                    }
                }

                let itemTitle = document.createElement("div");
                itemTitle.className = this.titleAttrName;
                if (hasTitle) {
                    let titleSlot = document.createElement("slot");
                    titleSlot.name = titleElId;
                    itemTitle.append(titleSlot);
                    if (this.itemsContainer.nodeName == "UL") {
                        this.itemsContainer.append(itemTitle);
                    } else if (titlesContainer) {
                        itemTitle.setAttribute("data-index", nposStr);
                        itemTitle.onclick = () => {
                            this.selectItem(i);
                        }
                        this.titlesContainer.append(itemTitle);
                    } else {
                        item.append(itemTitle);
                    }
                } else if (el.dataset[this.titleAttrName]) {
                    itemTitle.textContent = el.dataset[this.titleAttrName];
                    if (titlesContainer) {
                        itemTitle.setAttribute("data-index", nposStr);
                        itemTitle.onclick = () => {
                            this.selectItem(i);
                        }
                        titlesContainer.append(itemTitle);
                    } else {
                        item.append(itemTitle);
                    }
                }
                let itemSlot = document.createElement("slot");
                itemSlot.name = id;
                let itemContent = document.createElement("div");
                itemContent.classList.add("item-content");
                itemContent.append(itemSlot);
                item.append(itemContent);

                this.itemifyChildren(Array.prototype.slice.call(el.children), level + 1, id, nposStr, itemTitle)

                this.itemsContainer.append(item);
            });
        }
    }

    itemsForSlot(e: Event) {
        let slot = e.target as HTMLSlotElement;
        setTimeout(() => {
        // If slot is a slot
        if (this.itemsContainer && slot.nodeName == "SLOT" &&
            this.hasAddedItems == false) {
            let children = slot.assignedElements() as HTMLElement[];
            this.hasAddedItems = true;
            if (this.titlesContainer) {
                this.itemifyChildren(children, 0, null, null, this.titlesContainer);
            } else {
                this.itemifyChildren(children, 0, null, null);
            }
            this.itemsCreated();
        }
    });
    }

}