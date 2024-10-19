import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { CSSResultGroup, html, unsafeCSS } from "lit";
import Styles from "bundle-text:./Countdown.less";
import { MillisecondConverter } from "../_Converters/MillisecondConverter";
import { subMilliseconds } from "date-fns";

@customElement("juel-countdown")
export class JuelCountdown extends JuelComponent {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property({ converter: MillisecondConverter(1000) }) value: number;
    @property({ converter: MillisecondConverter(1000)}) interval: number;
    @property({ type: Number }) from: number;
    @property({ type: Date }) to: number;

    intervalPtr: number;
    current: number | Date;
    isDate: boolean;

    /**
     *
     */
    constructor() {
        super();
        this.interval = 1000;
        this.isDate = false;
    }

    firstLoad(): void {
        if (this.from) {
            this.current = this.from;
            this.display();
        }
        console.log((!this.to) && (this.textContent.trim()))
        if ((!this.to) && (this.textContent.trim())) {
            this.shadowRoot.querySelector("span").innerHTML = this.textContent;
            this.to = Date.parse(this.textContent);
            this.current = new Date();
            this.isDate = true;
        }
        if (this.from || this.to) {
            this.intervalPtr = setInterval(() => {
                this.onTick()
            }, this.interval);
        }
    }

    onTick() {
        console.log(typeof this.current)
        if (!(typeof this.current == "number")) {
            this.current = subMilliseconds(this.current, this.interval);
        } else {
            this.current --;
        }
        this.display();
  // Get today's date and time
  /*
  var now = new Date().getTime();
  

  // Find the distance between now and the count down date
  var distance = this.to - now;

*/

    }

    display() {
        let span = this.shadowRoot.querySelector("span");
        if (this.current) {
            if (!(typeof this.current == "number")) {
                span.innerHTML = this.current.toString();    
            } else {
            span.innerHTML = this.current.toString();
            }
        } else {
            span.innerHTML = "EXPIRED";
            if (this.intervalPtr) {
            clearInterval(this.intervalPtr);
            }
        }
    }

    protected render(): unknown {
        return html`<slot></slot><span><span>`
    }

}