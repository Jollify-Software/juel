import { CSSResultGroup, html, LitElement, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from 'bundle-text:./Timeline.less';
import { TimelineItem } from "./TimelineItem";

@customElement('juel-timeline')
export class TimelineComponent extends LitElement {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    // Define a property for timeline items
  @property({ type: Array })
  items: TimelineItem[] = [];
  @property({ type: String })
  direction: 'vertical' | 'horizontal' = 'vertical';

  // Render the timeline items
  render() {
    return html`
    <div class="timeline ${this.direction}">
      ${this.items.map(
        (item, index) => html`
          <div class="timeline-item ${this.direction}">
            ${index > 0
              ? html`<div class="connector ${this.direction}"></div>`
              : null}
            <div class="content">
              <h4>${item.title}</h4>
              <p>${item.content}</p>
            </div>
          </div>
        `
      )}
    </div>
  `;
  }

}