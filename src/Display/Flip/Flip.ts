import { html, LitElement, unsafeCSS } from "lit";
import { property, customElement } from "lit/decorators";
import style from "bundle-text:./Flip.less";
import { JuelComponent } from "../../_Base/JuelComponent";

@customElement("juel-flip")
export class JuelFlip extends JuelComponent {

    static styles = unsafeCSS(style);

    @property({ type: Boolean })
    vertical;
    /**
     * 
     */
    @property() trigger;

    constructor() {
      super();
      this.vertical = false;
      this.trigger = "click";
    }

    init() {
        const container = $(this.shadowRoot.getElementById('container')).off();
        const el = this.shadowRoot.getElementById('inner');
        if (this.vertical) {
            el.classList.add("vertical");
        }

        if (this.trigger === "hover") {
            container
                .on("mouseenter", () => el.classList.add("flip"))
                .on("mouseleave", () => el.classList.remove("flip"));
        } else {
            container.on("click", () => el.classList.toggle("flip"));
        }
    }

    ready() {
        this.init();
    }

    render() {

      return html` <div id="container">
        <div id="inner">
          <div class="front" part="front">
            <slot name="front"></slot>
          </div>
          <div class="back" part="back">
            <slot name="back"></slot>
          </div>
        </div>
      </div> `
    }
}