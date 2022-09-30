import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { when } from "lit/directives/when";
import { JuelComponent } from "../_Base/JuelComponent";
import { ChildrenMap } from "../_Utils/ChildrenMap";
import Styles from 'bundle-text:./Carousel.less';

@customElement("juel-carousel")
export class JuelCarousel extends JuelComponent {
    static styles = unsafeCSS(Styles);

    @property() position: number;
    @property() controls: string; // TODO: CControl: 5s, 500ms
    // TODO: Indicators, transition: zoom(in|out)|fade, previous/next slots

    itemsCount: number;

    constructor() {
        super();
        this.position = 0;
        this.controls = "true";
    }

    navigateTo(index: number) {
          /* Find the current card */
  const currCard = this.shadowRoot.querySelector(`[data-index="${index}"]`);
  if (currCard) {
  /* Set the prevCard based on its availability */
  const prevCard = currCard.previousElementSibling
      ? currCard.previousElementSibling
      : this.shadowRoot.querySelector(".container").lastElementChild;
    currCard.classList.remove("active");
    prevCard.classList.add("active");
  }
    }

    prevClick() {
        if (this.position == 0) {
            this.position = this.itemsCount -1;
        } else {
            this.position --;
        }
        this.navigateTo(this.position);
    }

    nextClick() {
        if (this.position == this.itemsCount - 1) {
            this.position = 0;
        } else {
            this.position ++;
        }
        this.navigateTo(this.position);
    }

    itemClick(e: Event) {
        if (e) {
            e.stopPropagation();
        }
        // TODO Despatch custom event
    }

    render() {
        let hasCtrls: boolean = this.controls == "true";
        this.itemsCount = 0;
        return html`${when(hasCtrls, () => html`<juel-button label="&lt;" @button-clicked="${this.prevClick}"></juel-button>`)}
        <div class="container">
        ${ChildrenMap(this, (el, index) => {
            this.itemsCount ++;
            let id = el.id ? el.id : `item-${index}`;
            el.setAttribute('slot', id);
            el.setAttribute('draggable', 'false');
            el.setAttribute('ondragstart', "event.preventDefault();")
            return html`
                        <div class="item${index == this.position ? " active" : ""}" data-index="${index}" draggable="false" @click="${this.itemClick}">
                        <slot name="${id}"></slot>
                        </div>`;
        })}
        </div>
        ${when(hasCtrls, () => html`<juel-button label="&gt;" @button-clicked="${this.nextClick}"></juel-button>`)}`;
    }
}