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

  // Render the timeline items
  render() {
    return html`
      <ul class="timeline">
        ${this.items.map(
          (item) => html`
            <li class="timeline-item">
              <div class="date">${item.date}</div>
              <div class="title">${item.title}</div>
              <div class="description">${item.description}</div>
            </li>
          `
        )}
      </ul>
    `;
  }

}