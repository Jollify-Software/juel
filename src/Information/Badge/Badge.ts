import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../../_Base/JuelComponent";
import { AlertTypes } from "../../_Core/AlertTypes";
import { RenderStyles } from "../../_Core/RenderStyles";
import Styles from 'bundle-text:./Badge.less';
import { html, unsafeCSS } from "lit";

@customElement("juel-badge")
export class JuelBadge extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property() label: string;
    @property() type: AlertTypes;
    @property({ attribute: "render-style" }) renderStyle: RenderStyles;
    
    constructor() {
        super();
        this.type = AlertTypes.Primary;
        this.renderStyle = RenderStyles.Default;
    }

    render() {
        let klass: string = this.type;
        if (this.renderStyle != RenderStyles.Default) {
            klass += ` ${this.renderStyle}`;
        }
        return html`<span id="root" class="${klass}"><slot>${this.label}<slot></span>`
    }
}