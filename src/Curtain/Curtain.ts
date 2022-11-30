import { CSSResultGroup, html, LitElement, PropertyValueMap, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import Styles from "bundle-text:./Curtain.less";
import { JuelComponent } from "../_Base/JuelComponent";
import bind from "bind-decorator";

// https://www.w3schools.com/howto/howto_js_curtain_menu.asp
@customElement("juel-curtain")
export class JuelCurtain extends JuelComponent {

    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property() position: string;
    @property() peek: string;
    @property() toggle: string;

    container: HTMLElement;

    constructor() {
        super();
        this.position = "right";
    }

    open(e?: Event) {
        console.log(e);
        let el = this.shadowRoot.querySelector(".content");
        if (el) {
            el.classList.add("open");
        }
    }

    close(e: Event) {
        let el = this.shadowRoot.querySelector(".content");
        if (el) {
            el.classList.remove("open");
        }
    }

    @bind
    toggleClick(e?: Event) {
        e.stopPropagation();
        let el = this.shadowRoot.querySelector(".content");
        if (el) {
            el.classList.toggle("open");
        }
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated();
        this.container = this.shadowRoot.querySelector(".content");
    }

    load(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
            super.load(_changedProperties);
            let el = document.querySelector(this.toggle);
            if (el) {
                $(el).on("click", this.toggleClick);
            }
    }

    childrenLoaded(): void {
        let size: number;
        this.style.setProperty("--size", `initial`)
        switch (this.position) {
            case "top":
            case "bottom":
                size = $(this.container).outerHeight();
                break;
            case "left":
            case "right":
                console.log(this.position)
                size = $(this.container).outerWidth();
                break;
            default:
                break;
        }
        if (size) {
            if (this.peek) {
                let peek = this.getPeek(size);
                this.style.setProperty("--translate", `${size - peek}px`)
            }
            this.style.setProperty("--size", `${size}px`)
        }
    }

    getPeek(clientSize) {
        let size: number = this.peek.endsWith('%') ?
        (parseFloat(this.peek.replace('%', '')) / 100) * clientSize :
         parseFloat(this.peek.replace('px', ''));
        if ((!size) || size == NaN) {
        switch (this.position) {
            case "top":
            case "bottom":
                size = $(this.peek).outerHeight();
                break;
            case "left":
            case "right":
                size = $(this.peek).outerWidth();
                break;
            default:
                break;
        }
    }
    return size;
    }

    render() {
        let klass = `content ${this.position}`
        return html`
        <div class="${klass}" @click="${this.open}"><span @click=${this.toggleClick} class="closebtn"></span><slot></slot></div>
        `;
    }
}