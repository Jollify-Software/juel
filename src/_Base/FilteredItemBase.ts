import { property } from "lit/decorators";
import { ItemBase } from "./ItemBase";
import { DOMStringMapConverter } from "../_Converters/DOMStringMapConvertor";
import bind from "bind-decorator";

export class FilteredItemBase extends ItemBase {

    @property({ converter: DOMStringMapConverter })
    filter: object;
    @property()
    effect: string;

    performFilter(name: string, value: any) {
        let showHide: boolean;    
        if (name in this.filter &&
            (value == '*' || this.filter[name] == value)) {
                showHide = true;
        } else if ((name in this.filter) == false &&
            value == false) {
                showHide = true;
            } else {
                showHide = false;
        }

        let $this = $(this);
        switch (this.effect) {
            case 'fade':
                if (showHide) {
                    $this.fadeIn('slow');
                } else {
                    $this.fadeOut('slow');
                }
                break;
            default:
                if (showHide) {
                    $this.show('slow');
                } else {
                    $this.hide('slow');
                }
                break;
        }
    }

}