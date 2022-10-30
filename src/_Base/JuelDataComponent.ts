import { TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { SearchResult } from "../_Core/SearchResult";
import { FillTemplate } from "../_Utils/FillTemplate";
import { JuelComponent } from "./JuelComponent";

export class JuelDataComponent extends JuelComponent {

    @property({ type: Array }) data: any[];
    @property() itemTemplate: (value: any) => Promise<string | TemplateResult>;
    @property({ attribute: "key-field" }) keyField: string;
    @property({ attribute: "text-field" }) textField: string;
    // TODO: Fields? Copy of juel-pro/Form/FormField?

    retrievedDataStrings: Array<string | TemplateResult>; // Do we still need?
    template: string;
    @state()
    searchResult: SearchResult; // TODO: SearchResult[]


    constructor() {
        super();
        this.data = [];
        this.textField = "text";
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

    inputChange(e: Event) {
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
            let suggestions = this.data.filter(x => {
                if (this.textField in x) {
                    // TODO: Concat textField with fields and search all properties
                    let txt = x[this.textField] as string;
                    if (txt.toLowerCase().includes(term.toLowerCase())) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }).map(value => {
                let obj = { ...value };
                let regex = new RegExp(`(${term})`, "gi");
                let txt = obj[this.textField] as string;
                txt = txt.replace(regex, "<b>$1</b>")
                obj[this.textField] = txt;
                return obj;
            });

            this.searchResult = {
                data: suggestions,
                term: term
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