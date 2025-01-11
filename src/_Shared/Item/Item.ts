import { customElement, property } from "lit/decorators";
import { FilteredItemBase } from "../../_Base/FilteredItemBase";
import { CSSResultGroup, html, unsafeCSS } from "lit";
import Styles from "bundle-text:./Item.less";
import { ListBase } from "../../_Base/ListBase";
import { classMap } from "lit/directives/class-map";
import { when } from "lit/directives/when";
import { createRef, ref, Ref } from "lit/directives/ref";
import { createFloating } from "../../_Utils/dom/createFloating";
import { WindowModule } from "../../_Modules/WindowModule";

@customElement("juel-item")
export class JuelItem extends FilteredItemBase {

    static styles = unsafeCSS(Styles);

    @property() title: string
    @property() href: string;

    itemsRef: Ref<HTMLInputElement> = createRef();
    itemsOpen: boolean = false;

    slotChangeTitle(e: Event) {
        this.title = "true";
    }

    ready(): void {
        if (this.items.length > 0) {
            console.log(this.items);
            const { update, destroy } = createFloating(this, this.itemsRef.value, {
                placement: 'bottom', // Default placement
                middleware: [], // Add middleware if needed, e.g., offset or flip
              });
              
              // Optional: Manually trigger updates
              this.addEventListener('mouseenter', () => {
                this.toggleOpen();
                update();
              });

              WindowModule.appendDocumentClick(this.id, (e) => {
                if ((!this.contains(e.target as HTMLElement)) && this.itemsOpen) {
                    this.toggleOpen();
                }
            });
              
              // Optional: Clean up on destroy
              window.addEventListener('unload', destroy);
        }
    }

    toggleOpen() {
        if (this.itemsOpen) { // If is open then close
            //this.itemsOpen = false;
            //this.itemsRef.value.style.display = "none";
        } else {
            this.itemsOpen = true;
            this.itemsRef.value.style.display = "block";
        }
    }

    titleSlotChange(e) {

    }

    protected render(): unknown {
        return html`<div id="item" part="item"><span part="title" class="title">
            <slot @slotchange="${this.titleSlotChange}" name="title">${this.title}</slot></span>
            <div part="content" class="content">${when(this.href,
                () => html`<a href="${this.href}"><slot></slot></a>`,
                () => html`<slot></slot>`)}
            </div>
            <div ${ref(this.itemsRef)} id="items" part="items">
                <slot name="items"></slot>
            </div>
        <div>`;
    }
}