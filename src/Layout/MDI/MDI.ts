import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./MDI.less';
import interact from "@interactjs/interactjs";

@customElement("juel-mdi")
export class MDIContainer extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

  @property({ type: Array }) panels: Array<{ id: string; title: string; content: string }> = [];

  // Lifecycle: Initialize Interact.js after rendering
  firstUpdated() {
    this.initializeInteract();
  }

  // Add a new panel
  private addPanel() {
    const newPanel = {
      id: `panel-${Date.now()}`,
      title: `Panel ${this.panels.length + 1}`,
      content: `Content for Panel ${this.panels.length + 1}`,
    };
    this.panels = [...this.panels, newPanel];
    this.requestUpdate();
    setTimeout(() => this.initializeInteractForPanel(newPanel.id), 0); // Delay to ensure DOM update
  }

  // Remove a panel
  private removePanel(panelId: string) {
    this.panels = this.panels.filter((panel) => panel.id !== panelId);
  }

  // Initialize Interact.js for all panels
  private initializeInteract() {
    this.panels.forEach((panel) => this.initializeInteractForPanel(panel.id));
  }

  // Setup drag and resize for a specific panel
  private initializeInteractForPanel(panelId: string) {
    const panel = this.shadowRoot?.getElementById(panelId);
    if (!panel) return;

    interact(panel)
      .draggable({
        listeners: {
          move(event) {
            const target = event.target as HTMLElement;
            const x = (parseFloat(target.getAttribute("data-x")!) || 0) + event.dx;
            const y = (parseFloat(target.getAttribute("data-y")!) || 0) + event.dy;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute("data-x", x.toString());
            target.setAttribute("data-y", y.toString());
          },
        },
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: "parent", // Keep panels within container bounds
          }),
        ],
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
          move(event) {
            const target = event.target as HTMLElement;
            const { width, height } = event.rect;

            target.style.width = `${width}px`;
            target.style.height = `${height}px`;

            const x = (parseFloat(target.getAttribute("data-x")!) || 0) + event.deltaRect.left;
            const y = (parseFloat(target.getAttribute("data-y")!) || 0) + event.deltaRect.top;

            target.style.transform = `translate(${x}px, ${y}px)`;
            target.setAttribute("data-x", x.toString());
            target.setAttribute("data-y", y.toString());
          },
        },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 150, height: 100 },
            max: { width: 800, height: 600 },
          }),
        ],
      });
  }

  render() {
    return html`
      <div class="mdi-container">
        ${this.panels.map(
          (panel) => html`
            <div class="mdi-panel" id=${panel.id} style="width: 300px; height: 200px;">
              <div class="mdi-panel-header">
                ${panel.title}
                <span class="close-button" @click=${() => this.removePanel(panel.id)}>✖</span>
              </div>
              <div class="mdi-panel-content">${panel.content}</div>
            </div>
          `
        )}
        <button class="mdi-add-panel" @click=${this.addPanel}>Add Panel</button>
      </div>
    `;
  }
}