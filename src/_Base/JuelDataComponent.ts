import { TemplateResult } from "lit";
import { property } from "lit/decorators";
import { FillTemplate } from "../_Utils/FillTemplate";
import { JuelComponent } from "./JuelComponent";

export class JuelDataComponent extends JuelComponent {

    @property({ type: Array }) data: any[];
    @property() itemTemplate: (value: any) => Promise<string | TemplateResult>;
    @property({ attribute: "key-field" }) keyField: string;
    @property({ attribute: "text-field" }) textField: string;
    // TODO: Fields? Copy of juel-pro/Form/FormField?

    retrievedDataStrings: Array<string | TemplateResult>;

    constructor() {
        super();
        this.data = [];
    }

    firstLoad(): void {
        let template = this.querySelector("template");
        if (template && !this.itemTemplate) {
            this.itemTemplate = (value) => {
                return new Promise((resolve, reject) => {
                    resolve(FillTemplate(template.innerHTML, value));
                });
            };
        }
    }

    // TODO: Move to list base?
    search(term: string) {
        if (this.textField && this.data && this.data.length > 0) {
            let suggestions = this.data.filter(x => {
                // TODO: Concat textField with fields and search all properties
                let txt = x[this.textField] as string;
                if (txt.includes(term)) {
                    return true;
                } else {
                    return false;
                }
            });
            // TODO: Map into search result object containing name of property
            return suggestions;
        }
        return null;
    }

    retrieveDataStrings() {
        if (this.itemTemplate && this.data && this.data.length > 0) {
            if (!this.retrievedDataStrings) {
                this.retrievedDataStrings = [];
            }
            for (let x of this.data) {
                this.itemTemplate(x).then(str => {
                    this.retrievedDataStrings.push(str);
                });
            }
        }
    }

}