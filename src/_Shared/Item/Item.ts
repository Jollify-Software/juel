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
import { debounceTime, fromEvent, Subscription } from "rxjs";
import { flip, offset } from "@floating-ui/dom";
import { bind } from "../../_Utils/Bind";
import { FloatingInstance } from "../../_Utils/dom/floatingInstance";
import { on } from "hammerjs";

@customElement("juel-item")
export class JuelItem extends FilteredItemBase {

    static styles = unsafeCSS(Styles);

    @property() title: string
    @property() href: string;

    itemsRef: Ref<HTMLInputElement> = createRef();
    itemsOpen: boolean = false;

    floatingInstance: FloatingInstance;
    mouseLeaveSubscription: Subscription | null = null;

    slotChangeTitle(e: Event) {
        this.title = "true";
    }

    ready(): void {
        let floatingDestroy: (() => void) | null = null;
    
        const handleResize = () => {
            const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
    
            // Destroy floating UI if it exists
            if (floatingDestroy) {
                floatingDestroy();
                floatingDestroy = null;
            }
            // Remove mouse event handlers
            this.removeEventListener('mouseenter', this.handleMouseEnter);
            this.removeEventListener('click', this.onClickSmallScreen);
            // Clear any existing mouseleave subscription
            if (this.mouseLeaveSubscription) {
                this.mouseLeaveSubscription.unsubscribe();
                this.mouseLeaveSubscription = null;
            }

            if (isSmallScreen) {
                               // Handle mouseenter
                               this.addEventListener('click', this.onClickSmallScreen);
            } else {
                // Recreate floating UI if not already created
                if (!floatingDestroy) {
                    this.floatingInstance = createFloating(this, this.itemsRef.value, {
                        placement: 'bottom-start',
                        strategy: 'fixed',
                        middleware: [offset({ crossAxis: 12 }), flip()],
                    });
    
                    floatingDestroy = this.floatingInstance.destroy;
    
                    // Add mouse event handlers
                    this.addEventListener('mouseenter', this.handleMouseEnter);
                }
    
                // Ensure items are hidden initially
                if (!this.itemsOpen) {
                    this.itemsRef.value.style.display = 'none';
                }
            }
        };
    
        // Initial check on load
        handleResize();
    
        // Listen for resize events
        window.addEventListener('resize', handleResize);
    
        // Cleanup on unload
        window.addEventListener('unload', () => {
            if (floatingDestroy) {
                floatingDestroy();
            }
            if (this.mouseLeaveSubscription) {
                this.mouseLeaveSubscription.unsubscribe();
            }
            window.removeEventListener('resize', handleResize);
        });
    }

    @bind
    handleMouseEnter() {
        if (!this.itemsOpen) {
            this.toggleOpen();
        }
        this.floatingInstance.update();

        // Clear any existing mouseleave subscription
        if (this.mouseLeaveSubscription) {
            this.mouseLeaveSubscription.unsubscribe();
            this.mouseLeaveSubscription = null;
        }
        this.handleMouseLeave();
    }

    @bind
    handleMouseLeave() {
        console.log("Mouse leave");
        const mouseLeave$ = fromEvent(this, 'mouseleave').pipe(debounceTime(800));
        this.mouseLeaveSubscription = mouseLeave$.subscribe(() => {
            if (this.itemsOpen) {
                this.toggleOpen();
            }
        });
    }

    @bind
    onClickSmallScreen() {
        this.itemsRef.value.style.position = "relative";
        this.itemsRef.value.style.top = "initial";
        this.itemsRef.value.style.left = "initial";
        this.toggleOpen();
    }

    toggleOpen() {
        if (this.itemsOpen) { // If is open then close
            this.itemsOpen = false;
            this.itemsRef.value.style.display = "none";
        } else {
            this.itemsOpen = true;
            this.itemsRef.value.style.display = "flex";
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