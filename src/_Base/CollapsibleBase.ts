import { property } from "lit/decorators";
import { JuelComponent } from "./JuelComponent";
import { IsMobile } from "../_Utils/IsMobile";
import { createFloating } from "../_Utils/dom/createFloating";
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

export class CollapsibleBase extends JuelComponent {
  @property({ type: String, attribute: 'collapse-mode' })
  collapseMode: 'floating' | 'push' = 'floating';

  @property({ type: String })
  trigger: 'mouseenter' | 'click' = 'mouseenter';

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

  firstUpdated() {
    this.setupEventListeners();

    if (this.collapseMode === 'floating') {
      this.floatingInstance = createFloating(this.getTriggerElement(), this.getCollapseElement(), {
        placement: 'bottom',
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupEventListeners();

    if (this.floatingInstance) {
      this.floatingInstance.destroy();
    }
  }

  private setupEventListeners() {
    const triggerEl = this.getTriggerElement();
    const collapseEl = this.getCollapseElement();

    if (this.trigger === 'mouseenter') {
      const enterTrigger$ = fromEvent(triggerEl, 'mouseenter').subscribe(() => {
        this.showItems();
      });

      const enterCollapse$ = fromEvent(collapseEl, 'mouseenter').subscribe(() => {
        this.isMouseOverCollapse = true;
        this.showItems();
      });

      const leaveTrigger$ = fromEvent(triggerEl, 'mouseleave')
        .pipe(debounceTime(200))
        .subscribe(() => {
          if (!this.isMouseOverCollapse) {
            this.hideItems();
          }
        });

      const leaveCollapse$ = fromEvent(collapseEl, 'mouseleave')
        .pipe(debounceTime(200))
        .subscribe(() => {
          this.isMouseOverCollapse = false;
          this.hideItems();
        });

      this.eventSubscriptions.push(enterTrigger$, enterCollapse$, leaveTrigger$, leaveCollapse$);
    } else if (this.trigger === 'click') {
      const click$ = fromEvent(triggerEl, 'click').subscribe(() => this.toggleItems());
      this.eventSubscriptions.push(click$);
    }
  }

  private cleanupEventListeners() {
    this.eventSubscriptions.forEach(sub => sub.unsubscribe());
    this.eventSubscriptions = [];
  }

  private showItems = () => {
    const el = this.getCollapseElement();
    if (!el) return;

    if (this.collapseMode === 'floating') {
      el.style.visibility = 'visible';
    } else if (this.collapseMode === 'push') {
      el.style.maxHeight = `${el.scrollHeight}px`;
    }
  };

  private hideItems = () => {
    const el = this.getCollapseElement();
    if (!el) return;

    if (this.collapseMode === 'floating') {
      el.style.visibility = 'hidden';
    } else if (this.collapseMode === 'push') {
      el.style.maxHeight = '0';
    }
  };

  private toggleItems = () => {
    const el = this.getCollapseElement();
    if (!el) return;

    if (el.style.maxHeight === '0px' || !el.style.maxHeight) {
      this.showItems();
    } else {
      this.hideItems();
    }
  };
}
