import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@customElement('juel-context-menu')
export class JuelContextMenu extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;

  private subscriptions: Subscription[] = [];

  static styles = css`
    :host {
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      min-width: 160px;
      z-index: 1000;
    }
    :host([open]) {
      display: block;
    }
    ::slotted(menu-item) {
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    const target = this.parentElement || document;
    target.addEventListener('contextmenu', this.handleContextMenu);

    const mouseLeave$ = fromEvent(this, 'mouseleave').pipe(debounceTime(400));
    const mouseLeaveSubscription = mouseLeave$.subscribe(() => this.closeMenu());
    this.subscriptions.push(mouseLeaveSubscription);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const target = this.parentElement || document;
    target.removeEventListener('contextmenu', this.handleContextMenu);

    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    this.x = e.clientX;
    this.y = e.clientY;
    this.open = true;
    this.style.left = `${this.x}px`;
    this.style.top = `${this.y}px`;
  };

  private closeMenu = () => {
    this.open = false;
  };

  render() {
    return html`<slot></slot>`;
  }
}