import { TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { Field } from "../_Core/Data/Field";
import { SearchResult } from "../_Core/SearchResult";
import { FillTemplate } from "../_Utils/FillTemplate";
import { JuelComponent } from "./JuelComponent";

export class JuelDataComponent extends JuelComponent {

    @property({ type: Array }) data: any[];
    @property() itemTemplate: (value: any) => Promise<string | TemplateResult>;
    @property({ attribute: "key-field" }) keyField: string;
    @property({ attribute: "text-field" }) textField: string;
    // TODO: Fields? Copy of juel-pro/Form/FormField?
    @property({ type: Array }) fields: Field[];

    retrievedDataStrings: Array<string | TemplateResult>; // Do we still need?
    template: string;
    @state()
    searchResult: SearchResult; // TODO: SearchResult[]


    constructor() {
        super();
        this.data = [];
        this.textField = "text";
        this.fields = [];
    }

    firstLoad(): void {
        let template = this.querySelector("template");
        if (template) {
            this.template = template.innerHTML;
        } else {
            this.template = `\${this.${this.textField}}`;
        }
        if (template && !this.itemTemplate) {
            this.itemTemplate = (value) => {
                return new Promise((resolve, reject) => {
                    resolve(FillTemplate(template.innerHTML, value));
                });
            };
        }
    }

    onInput(e: Event) {
        console.log("OnInput");
        let target: HTMLElement = null;
        if (e.composed) {
            target = e.composedPath()[0] as HTMLElement;
        } else {
            target = e.target as HTMLElement;
        };
        if (target && 'value' in target) {
            let el = e.target as HTMLInputElement;
            if (el.value) {
                console.log("search")
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
                    if (name in x) {
                        let txt = x[name].toString() as string;
                        console.log(txt)
                        if (txt.toLowerCase().includes(term.toLowerCase())) {
                            matchedFields.push(name);
                            match = true;
                        }
                    } else {
                        match = false;
                    }
                }
                return match;
            }).map(value => {
                let obj = { ...value };
                let regex = new RegExp(`(${term})`, "gi");
                for (let name of fieldNames) {
                let txt = obj[name].toString() as string;
                if (regex.test(txt)) {
                    txt = txt.replace(regex, "<b>$1</b>")
                    obj[name] = txt;
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
                console.log(el.innerHTML)
                obj[this.textField] = el.innerHTML.replace(regex, "<b>$1</b>");
                return obj;
            });

            this.searchResult = {
                data: suggestions,
                term: term
            }
        }
        console.log(this.searchResult)
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