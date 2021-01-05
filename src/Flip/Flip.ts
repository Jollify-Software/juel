import { customElement, html, LitElement, property, unsafeCSS } from "lit-element";
import style from "bundle-text:./Flip.less";

@customElement("juel-flip")
export class JuelFlip extends LitElement {

    static styles = unsafeCSS(style);

    @property({ type: Boolean })
    vertical = false;
    /**
     * 
     */
    @property() trigger = "click"

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

    firstUpdated() {
        this.init();
    }

    render() {
        return html` <div id="container">
        <div id="inner">
          <div class="front">
            <slot name="front"></front>>
          </div>
          <div class="back">
            <slot name="back"></slot>
          </div>
        </div>
      </div> `
    }
}