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
        let evtName;
        switch (this.trigger) {
            case "click":
                evtName = "click";
                break;
            case "hover":
                evtName = "mouseenter";
                break;
        }
        $(this.shadowRoot.getElementById('container')).off()
            .on(evtName, () => {
                let el = this.shadowRoot.getElementById('inner');
                if (this.vertical) {
                        el.classList.add("vertical");
                }
                el.classList.toggle("flip")
            })
    }

    ready() {
        this.init();
    }

    render() {

      return html` <div id="container">
        <div id="inner">
          <div class="front" part="front">
            <slot name="front"></front>>
          </div>
          <div class="back" part="back">
            <slot name="back"></slot>
          </div>
        </div>
      </div> `
    }
}