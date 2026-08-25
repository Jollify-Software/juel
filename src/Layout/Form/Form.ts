import { html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators";
import { map } from "lit/directives/map";
import { JuelComponent } from "../../_Base/JuelComponent";
import { FormField } from "./FormField";
import { FieldTemplate } from "./FieldTemplate";
import Styles from "bundle-text:./Form.less"

@customElement("juel-form")
export class Form extends JuelComponent {

    static styles = unsafeCSS(Styles);

    @property() formId: string;
    @property({ type: Array }) fields: FormField[];

    firstLoad() {
        this.addEventListener("keyup", (event) => {
            if (event.key == "Enter") {
                console.log(this.fields)
            }
        })
    }

    render() {
        return html`${map(this.fields, FieldTemplate)}`
    }
}