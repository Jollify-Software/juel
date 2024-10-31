import { PropertyValueMap, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { Field } from "../_Core/Data/Field";
import { SearchResult } from "../_Core/SearchResult";
import { FillTemplate } from "../_Utils/FillTemplate";
import { upperFirst } from "lodash"
import { JuelComponent } from "./JuelComponent";
import { JuelContainerComponent } from "./JuelContainerComponent";

export class JuelDataComponent extends JuelContainerComponent {

    @property({ type: Array }) data: any[];
    @property() itemTemplate: (value: any) => Promise<string | TemplateResult>;
    @property({ attribute: "key-field" }) keyField: string;
    @property({ attribute: "text-field" }) textField: string;
    // TODO: Fields? Copy of juel-pro/Form/FormField?
    @property({ type: Array }) fields: Field[];

    retrievedDataStrings: Array<string | TemplateResult>; // Do we still need?
    template: string;
    templatePromise: Promise<any>;
    @state()
    searchResult: SearchResult; // TODO: SearchResult[]


    constructor() {
        super();
        this.data = [];
        this.textField = "text";
    }

    protected firstUpdated(_changedProperties?: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
        super.firstUpdated(_changedProperties)
        this.templatePromise = new Promise(resolve => {
            setTimeout(() => {
                let template = this.querySelector("template");
                if ((!this.template) && template) {
                    this.template = template.innerHTML;
                } else if (!this.template) {
                    this.template = `\${this.${this.textField}}`;
                }
                var children = [...this.children].filter(el => el.nodeName != 'TEMPLATE');
                if (children.length == 0) {
                    let slot = this.shadowRoot.querySelector("slot");
                }
                if (template && !this.itemTemplate) {
                    this.itemTemplate = (value) => {
                        return new Promise((resolve, reject) => {
                            resolve(FillTemplate(template.innerHTML, value));
                        });
                    };
                }
                if (this.data && (!this.fields) || this.fields.length <= 0) {
                    this.fieldsFromData();
                }
                resolve(this.template);
            });
        });
    }

    fieldsFromData() {
        if (this.data && this.data[0]) {
            this.fields = Object.keys(this.data[0]).map(x => {
                return {
                    name: x,
                    text: upperFirst(x), // TODO: Displayify
                    visible: true
                };
            });
        }
    }

    onInput(e: Event) {
        let target: HTMLElement = null;
        if (e.composed) {
            target = e.composedPath()[0] as HTMLElement;
        } else {
            target = e.target as HTMLElement;
        };
        if (target && 'value' in target) {
            let el = e.target as HTMLInputElement;
            if (el.value) {
                this.search(el.value);
            } else {
                this.searchResult = null;
            }
        }
    }

    // TODO: Move to list base?
    search(term: string) {
        if (this.textField && this.data && this.data.length > 0) {
            let matchedFields: string[] = [];
            let fieldNames: string[] = [];
            if (this.fields && this.fields.length > 0) {
                fieldNames = this.fields.filter(x => x.visible).map(x => x.name);
            } else {
                fieldNames.unshift(this.textField);
            }
            let suggestions = this.data.filter(x => {
                let match = false;
                for (let name of fieldNames) {
                    if (name in x && x[name]) {
                        let txt = x[name].toString() as string;
                        if (txt.toLowerCase().includes(term.toLowerCase())) {
                            matchedFields.push(name);
                            match = true;
                        }
                    }
                }
                return match;
            }).map(value => {
                // Highlight matches with <b>
                let obj = { ...value };
                let regex = new RegExp(`(?<!https?.+)(${term})`, "gi"); // !Important: Don't highlight img URLs
                for (let name of fieldNames) {
                    let n = name.toLowerCase();
                    if (obj[name] &&
                        ((!n.includes("image"))) && (!n.includes("route")) && (!n.includes("link"))) {
                        let txt = obj[name].toString() as string;
                        if (regex.test(txt)) {
                            txt = txt.replace(regex, "<b>$1</b>")
                            obj[name] = txt;
                        }
                    }
                }
                return obj;
            });
            this.searchResult = {
                data: suggestions,
                term: term,
                fields: matchedFields
            }
        } else {
            let children: HTMLElement[] = [...this.children]
                .filter(x => x.classList.contains("juel-item")) as HTMLElement[];
            let suggestions = children.filter(x => {
                if (x.textContent.toLowerCase().includes(term.toLowerCase())) {
                    return true;
                } else {
                    return false;
                }
            }).map(el => {
                let obj = {};
                let regex = new RegExp(`(?<!<[\\w="\\s]*)(${term})(?![\\w\\s]*>)`, "gi");
                obj[this.textField] = el.innerHTML.replace(regex, "<b>$1</b>");
                return obj;
            });

            this.searchResult = {
                data: suggestions,
                term: term
            }
        }
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