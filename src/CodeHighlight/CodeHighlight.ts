import { customElement, property } from "lit/decorators";
import { JuelComponent } from "../_Base/JuelComponent";
import { PropertyValueMap } from "lit";
import hljs from "highlight.js";

@customElement("juel-code-highlight")
export class JuelCodeHighlight extends JuelComponent {

    static ScriptUrl = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js";
    static StyleUrl = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/";
    static StyleId = "highlight-styles";

    @property() theme: string;

    /**
     *
     */
    constructor() {
        super();
        this.theme = "lightfair";
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        this.loadScript().then(() => {
            hljs.highlightAll();
        })
    }

    async loadScript() {
        if (!document.head.querySelector(`#${JuelCodeHighlight.StyleId}`)) {
            let style = $(`<link id="${JuelCodeHighlight.StyleId}" rel="stylesheet" href="${JuelCodeHighlight.StyleUrl}${this.theme}.min.css">`)
            document.head.append(style[0]);
        }
        if(!('hljs' in window)) {
            //await import(JuelCodeHighlight.ScriptUrl);
        }
    }
}