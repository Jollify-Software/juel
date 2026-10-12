import { property } from "lit/decorators";
import { PropertyValues } from "lit";
import { JuelComponent } from "./JuelComponent";
import { IsMobile } from "../_Utils/IsMobile";
import { createFloating } from "../_Utils/dom/createFloating";
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * A trigger that shows and hides a collapsible element, either floating
 * next to the trigger or pushing content down. `opened` (reflected) is the
 * state; `show()`/`hide()`/`toggle()` change it and fire `collapse-opened`/
 * `collapse-closed`. With `trigger="click"`, a click outside or Escape
 * closes it again.
 */
export class CollapsibleBase extends JuelComponent {
  @property({ type: String, attribute: 'collapse-mode' })
  collapseMode: 'floating' | 'push' = 'floating';

  @property({ type: String })
  trigger: 'mouseenter' | 'click' = 'mouseenter';

  @property()
  placement: string = 'bottom';

  @property({ type: Boolean, reflect: true })
  opened: boolean = false;

  private floatingInstance: ReturnType<typeof createFloating> | null = null;
  private eventSubscriptions: Subscription[] = [];
  private isMouseOverCollapse: boolean = false;

  constructor() {
    super();

    if (IsMobile()) {
      this.collapseMode = 'push';
      this.trigger = 'click';
    }
  }

  getTriggerElement(): HTMLElement {
    return this;
  }

  getCollapseElement(): HTMLElement {
    return null;
  }

  /** Options for createFloating (floating-ui computePosition). */
  protected floatingOptions(): any {
    return { placement: this.placement };
  }

  firstUpdated(changed?: PropertyValues) {
    super.firstUpdated(changed);
    this.setupEventListeners();
    this.applyState();
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (changed.has('opened') && this.hasUpdated) this.applyState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupEventListeners();
    this.stopFloating();
    this.stopDismissListeners();
  }

  show() {
    if (this.opened) return;
    this.opened = true;
    this.dispatchEvent(new CustomEvent('collapse-opened', { bubbles: true, composed: true }));
  }

  hide() {
    if (!this.opened) return;
    this.opened = false;
    this.dispatchEvent(new CustomEvent('collapse-closed', { bubbles: true, composed: true }));
  }

  toggle() {
    if (this.opened) this.hide();
    else this.show();
  }

  // Positioning runs only while open: floating-ui's autoUpdate watches
  // scroll/resize for as long as it's attached.
  private applyState() {
    const el = this.getCollapseElement();
    if (!el) return;

    if (this.collapseMode === 'floating') {
      el.style.visibility = this.opened ? 'visible' : 'hidden';
      if (this.opened && !this.floatingInstance) {
        this.floatingInstance = createFloating(this.getTriggerElement(), el, this.floatingOptions());
      } else if (!this.opened) {
        this.stopFloating();
      }
    } else {
      el.style.maxHeight = this.opened ? `${el.scrollHeight}px` : '0';
    }

    if (this.opened && this.trigger === 'click') this.startDismissListeners();
    else this.stopDismissListeners();
  }

  private stopFloating() {
    this.floatingInstance?.destroy();
    this.floatingInstance = null;
  }

  // A click anywhere outside this element (its trigger and its content
  // are both inside it, slotted or not) or Escape closes it.
  private onDocumentPointerDown = (e: Event) => {
    if (!e.composedPath().includes(this)) this.hide();
  };

  private onDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    this.hide();
    this.onDismissedByKey();
  };

  /** Called after Escape closes it — e.g. to return focus to the trigger. */
  protected onDismissedByKey() {
  }

  private startDismissListeners() {
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.addEventListener('keydown', this.onDocumentKeydown, true);
  }

  private stopDismissListeners() {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.removeEventListener('keydown', this.onDocumentKeydown, true);
  }

  private setupEventListeners() {
    const triggerEl = this.getTriggerElement();
    const collapseEl = this.getCollapseElement();

    if (this.trigger === 'mouseenter') {
      const enterTrigger$ = fromEvent(triggerEl, 'mouseenter').subscribe(() => {
        this.show();
      });

      const enterCollapse$ = fromEvent(collapseEl, 'mouseenter').subscribe(() => {
        this.isMouseOverCollapse = true;
        this.show();
      });

      const leaveTrigger$ = fromEvent(triggerEl, 'mouseleave')
        .pipe(debounceTime(200))
        .subscribe(() => {
          if (!this.isMouseOverCollapse) {
            this.hide();
          }
        });

      const leaveCollapse$ = fromEvent(collapseEl, 'mouseleave')
        .pipe(debounceTime(200))
        .subscribe(() => {
          this.isMouseOverCollapse = false;
          this.hide();
        });

      this.eventSubscriptions.push(enterTrigger$, enterCollapse$, leaveTrigger$, leaveCollapse$);
    } else if (this.trigger === 'click') {
      const click$ = fromEvent(triggerEl, 'click').subscribe(() => this.toggle());
      this.eventSubscriptions.push(click$);
    }
  }

  private cleanupEventListeners() {
    this.eventSubscriptions.forEach(sub => sub.unsubscribe());
    this.eventSubscriptions = [];
  }
}
